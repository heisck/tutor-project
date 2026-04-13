import { randomUUID } from 'node:crypto';

import { AuthProvider, createPrismaClient } from '@ai-tutor-pwa/db';
import { AUTH_PATHS } from '@ai-tutor-pwa/shared';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';

import { buildApp, type BuildAppOptions } from '../src/app.js';
import { hashPassword } from '../src/auth/password.js';
import type { GoogleOauthClient } from '../src/auth/oauth/google.js';
import { closeRedisClient, createRedisClient } from '../src/lib/redis.js';
import { createApiTestEnv } from './test-env.js';

const testEmailPrefix = `auth-test-${randomUUID()}`;
const baseEnv = createApiTestEnv();
const prismaClient = createPrismaClient({
  DATABASE_URL: baseEnv.DATABASE_URL,
});
const redisClient = createRedisClient(baseEnv);

let app: Awaited<ReturnType<typeof buildApp>>;
let agent: ReturnType<typeof request.agent>;
let mockOauthClient: GoogleOauthClient;

beforeAll(async () => {
  await redisClient.ping();
});

afterAll(async () => {
  await closeRedisClient(redisClient);
  await prismaClient.$disconnect();
});

beforeEach(async () => {
  mockOauthClient = createMockGoogleOauthClient();
  app = await buildApp({
    env: createApiTestEnv(),
    oauthClient: mockOauthClient,
    prismaClient,
    rateLimitKeyPrefix: `rate-limit:auth-test:${randomUUID()}`,
    redisClient,
  });
  await app.ready();
  agent = request.agent(app.server);
});

afterEach(async () => {
  await app.close();
  await prismaClient.user.deleteMany({
    where: {
      email: {
        startsWith: testEmailPrefix,
      },
    },
  });
});

describe('auth routes', () => {
  it('signs up successfully and sets an httpOnly session cookie', async () => {
    const response = await agent
      .post(AUTH_PATHS.signup)
      .set('Origin', 'http://localhost:3000')
      .send({
        email: createTestEmail('signup'),
        password: 'password123',
      });

    expect(response.status).toBe(201);
    expect(response.body.user).toMatchObject({
      authProvider: 'email',
      email: response.body.user.email,
      emailVerified: false,
      role: 'student',
    });
    expect(response.headers['set-cookie']).toEqual(
      expect.arrayContaining([expect.stringContaining('HttpOnly')]),
    );
  });

  it('signs in successfully with email and password', async () => {
    const email = createTestEmail('signin');
    await prismaClient.user.create({
      data: {
        authProvider: AuthProvider.EMAIL,
        email,
        passwordHash: await hashPassword('password123'),
      },
    });

    const response = await agent
      .post(AUTH_PATHS.signin)
      .set('Origin', 'http://localhost:3000')
      .send({
        email,
        password: 'password123',
      });

    expect(response.status).toBe(200);
    expect(response.body.user).toMatchObject({
      authProvider: 'email',
      email,
    });
    expect(response.headers['set-cookie']).toEqual(
      expect.arrayContaining([expect.stringContaining('ai_tutor_pwa_session=')]),
    );
  });

  it('rejects invalid signin attempts', async () => {
    const email = createTestEmail('invalid-signin');
    await prismaClient.user.create({
      data: {
        authProvider: AuthProvider.EMAIL,
        email,
        passwordHash: await hashPassword('password123'),
      },
    });

    const response = await agent
      .post(AUTH_PATHS.signin)
      .set('Origin', 'http://localhost:3000')
      .send({
        email,
        password: 'wrong-password',
      });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      message: 'Invalid email or password',
    });
  });

  it('signs out successfully and invalidates the current session', async () => {
    const signupResponse = await agent
      .post(AUTH_PATHS.signup)
      .set('Origin', 'http://localhost:3000')
      .send({
        email: createTestEmail('signout'),
        password: 'password123',
      });

    expect(signupResponse.status).toBe(201);

    const signoutResponse = await agent
      .post(AUTH_PATHS.signout)
      .set('Origin', 'http://localhost:3000');

    expect(signoutResponse.status).toBe(204);

    const sessionResponse = await agent.get(AUTH_PATHS.session);
    expect(sessionResponse.status).toBe(401);
  });

  it('returns the authenticated user on session lookup', async () => {
    const email = createTestEmail('session');
    await agent
      .post(AUTH_PATHS.signup)
      .set('Origin', 'http://localhost:3000')
      .send({
        email,
        password: 'password123',
      });

    const response = await agent.get(AUTH_PATHS.session);

    expect(response.status).toBe(200);
    expect(response.body.user).toMatchObject({
      authProvider: 'email',
      email,
    });
  });

  it('rejects unauthenticated session lookups', async () => {
    const response = await agent.get(AUTH_PATHS.session);

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      message: 'Authentication required',
    });
  });

  it('enforces session expiry', async () => {
    const email = createTestEmail('expired-session');
    await agent
      .post(AUTH_PATHS.signup)
      .set('Origin', 'http://localhost:3000')
      .send({
        email,
        password: 'password123',
      });

    const user = await prismaClient.user.findUniqueOrThrow({
      where: {
        email,
      },
    });

    await prismaClient.authSession.updateMany({
      data: {
        expiresAt: new Date(Date.now() - 60_000),
      },
      where: {
        userId: user.id,
      },
    });

    const response = await agent.get(AUTH_PATHS.session);

    expect(response.status).toBe(401);
  });

  it('rate limits auth endpoints after 10 requests per minute per IP', async () => {
    const email = createTestEmail('rate-limit');

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const response = await agent
        .post(AUTH_PATHS.signin)
        .set('Origin', 'http://localhost:3000')
        .send({
          email,
          password: 'password123',
        });

      expect(response.status).toBe(401);
    }

    const limitedResponse = await agent
      .post(AUTH_PATHS.signin)
      .set('Origin', 'http://localhost:3000')
      .send({
        email,
        password: 'password123',
      });

    expect(limitedResponse.status).toBe(429);
    expect(limitedResponse.body).toEqual({
      message: 'Too many requests',
    });
    expect(limitedResponse.headers['retry-after']).toBeDefined();
  });

  it('wires the Google OAuth flow and creates an authenticated session', async () => {
    const startResponse = await agent.get(AUTH_PATHS.googleOauthStart);

    expect(startResponse.status).toBe(200);
    expect(startResponse.body.authorizationUrl).toContain(
      'https://accounts.google.com/o/oauth2/v2/auth',
    );

    const authorizationUrl = new URL(startResponse.body.authorizationUrl);
    const state = authorizationUrl.searchParams.get('state');

    expect(state).not.toBeNull();

    const callbackResponse = await agent
      .get(AUTH_PATHS.googleOauthCallback)
      .query({
        code: 'google-auth-code',
        state,
      });

    expect(callbackResponse.status).toBe(200);
    expect(callbackResponse.body.user).toMatchObject({
      authProvider: 'google',
      email: createTestEmail('google'),
      emailVerified: true,
    });

    const sessionResponse = await agent.get(AUTH_PATHS.session);
    expect(sessionResponse.status).toBe(200);
    expect(sessionResponse.body.user.authProvider).toBe('google');
  });

  it('marks the session cookie as secure in production', async () => {
    const secureApp = await buildApp({
      env: createApiTestEnv({
        NODE_ENV: 'production',
      }),
      oauthClient: createMockGoogleOauthClient(),
      prismaClient,
      rateLimitKeyPrefix: `rate-limit:auth-test:${randomUUID()}`,
      redisClient,
    } satisfies BuildAppOptions);
    await secureApp.ready();
    const secureAgent = request.agent(secureApp.server);

    const response = await secureAgent
      .post(AUTH_PATHS.signup)
      .set('Origin', 'http://localhost:3000')
      .send({
        email: createTestEmail('secure-cookie'),
        password: 'password123',
      });

    expect(response.status).toBe(201);
    expect(response.headers['set-cookie']).toEqual(
      expect.arrayContaining([expect.stringContaining('Secure')]),
    );

    await secureApp.close();
  });
});

function createTestEmail(label: string): string {
  return `${testEmailPrefix}-${label}@example.com`;
}

function createMockGoogleOauthClient(): GoogleOauthClient {
  let lastStart:
    | {
        codeVerifier: string;
        state: string;
      }
    | undefined;

  return {
    async createAuthorizationUrl(input) {
      lastStart = input;

      return {
        authorizationUrl: `https://accounts.google.com/o/oauth2/v2/auth?state=${encodeURIComponent(
          input.state,
        )}`,
      };
    },
    async exchangeCode(input) {
      expect(lastStart).toBeDefined();
      expect(input.code).toBe('google-auth-code');
      expect(input.codeVerifier).toBe(lastStart?.codeVerifier);
      expect(input.state).toBe(lastStart?.state);

      return {
        email: createTestEmail('google'),
        emailVerified: true,
        googleSubject: 'google-subject-123',
      };
    },
  };
}
