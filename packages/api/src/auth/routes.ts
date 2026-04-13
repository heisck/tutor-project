import {
  AuthProvider,
  type DatabaseClient,
  type User,
} from '@ai-tutor-pwa/db';
import {
  AUTH_PATHS,
  type AuthSessionResponse,
  type OauthAuthorizationUrlResponse,
} from '@ai-tutor-pwa/shared';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import {
  clearOauthCookies,
  clearSessionCookie,
  getOauthCodeVerifierFromRequest,
  getOauthStateFromRequest,
  getSessionTokenFromRequest,
  setOauthCookies,
  setSessionCookie,
} from './cookies.js';
import { hashPassword, verifyPassword } from './password.js';
import {
  buildSessionMetadata,
  createAuthSession,
  createRequireAuthPreHandler,
  deleteSessionByToken,
  toSessionResponse,
} from './session.js';
import {
  createCodeVerifier,
  createGoogleOauthClient,
  createOauthState,
  type GoogleOauthClient,
} from './oauth/google.js';
import type { ApiEnv } from '../config/env.js';
import { createAllowedOriginPreHandler } from '../lib/request-origin.js';
import { createIpRateLimitPreHandler } from '../lib/rate-limit.js';
import type { RedisClient } from '../lib/redis.js';

const signupSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
});

const signinSchema = signupSchema;

const oauthCallbackQuerySchema = z.object({
  code: z.string().min(1, 'code is required'),
  state: z.string().min(1, 'state is required'),
});

interface AuthRouteDependencies {
  env: ApiEnv;
  oauthClient?: GoogleOauthClient | undefined;
  prisma: DatabaseClient;
  rateLimitKeyPrefix?: string | undefined;
  redis: RedisClient;
}

export async function registerAuthRoutes(
  app: FastifyInstance,
  dependencies: AuthRouteDependencies,
): Promise<void> {
  const oauthClient =
    dependencies.oauthClient ?? createGoogleOauthClient(dependencies.env);
  const authRateLimit = createIpRateLimitPreHandler(dependencies.redis, {
    keyPrefix: dependencies.rateLimitKeyPrefix ?? 'rate-limit:auth',
    limit: 10,
    timeWindowSeconds: 60,
  });
  const requireAllowedOrigin = createAllowedOriginPreHandler(dependencies.env);
  const requireAuth = createRequireAuthPreHandler(
    dependencies.prisma,
    dependencies.env,
  );

  app.post(
    AUTH_PATHS.signup,
    {
      preHandler: [requireAllowedOrigin, authRateLimit],
    },
    async (request, reply): Promise<AuthSessionResponse | void> => {
      const parsedBody = signupSchema.safeParse(request.body);

      if (!parsedBody.success) {
        return reply.status(400).send({
          message: parsedBody.error.issues[0]?.message ?? 'Invalid request body',
        });
      }

      const email = normalizeEmail(parsedBody.data.email);
      const existingUser = await dependencies.prisma.user.findUnique({
        where: {
          email,
        },
      });

      if (existingUser !== null) {
        return reply.status(409).send({
          message: 'An account with this email already exists',
        });
      }

      const passwordHash = await hashPassword(parsedBody.data.password);
      const createdSession = await dependencies.prisma.$transaction(
        async (transaction) => {
          const createdUser = await transaction.user.create({
            data: {
              authProvider: AuthProvider.EMAIL,
              email,
              emailVerified: false,
              passwordHash,
            },
          });

          const session = await createAuthSession(
            transaction,
            createdUser.id,
            buildSessionMetadata(request),
            dependencies.env.SESSION_TTL_HOURS,
          );

          return {
            expiresAt: session.expiresAt,
            token: session.token,
            user: createdUser,
          };
        },
      );

      setSessionCookie(
        reply,
        dependencies.env,
        createdSession.token,
        createdSession.expiresAt,
      );

      return reply.status(201).send(
        toSessionResponse({
          expiresAt: createdSession.expiresAt,
          user: createdSession.user,
        }),
      );
    },
  );

  app.post(
    AUTH_PATHS.signin,
    {
      preHandler: [requireAllowedOrigin, authRateLimit],
    },
    async (request, reply): Promise<AuthSessionResponse | void> => {
      const parsedBody = signinSchema.safeParse(request.body);

      if (!parsedBody.success) {
        return reply.status(400).send({
          message: parsedBody.error.issues[0]?.message ?? 'Invalid request body',
        });
      }

      const email = normalizeEmail(parsedBody.data.email);
      const user = await dependencies.prisma.user.findUnique({
        where: {
          email,
        },
      });

      if (
        user === null ||
        user.passwordHash === null ||
        !(await verifyPassword(parsedBody.data.password, user.passwordHash))
      ) {
        return reply.status(401).send({
          message: 'Invalid email or password',
        });
      }

      const session = await createSessionWithExistingUser(
        dependencies.prisma,
        user,
        buildSessionMetadata(request),
        dependencies.env.SESSION_TTL_HOURS,
      );

      setSessionCookie(reply, dependencies.env, session.token, session.expiresAt);

      return toSessionResponse({
        expiresAt: session.expiresAt,
        user,
      });
    },
  );

  app.get(
    AUTH_PATHS.googleOauthStart,
    {
      preHandler: [authRateLimit],
    },
    async (_request, reply): Promise<OauthAuthorizationUrlResponse> => {
      const state = createOauthState();
      const codeVerifier = createCodeVerifier();
      const authorization = await oauthClient.createAuthorizationUrl({
        codeVerifier,
        state,
      });

      setOauthCookies(reply, dependencies.env, state, codeVerifier);

      return {
        authorizationUrl: authorization.authorizationUrl,
      };
    },
  );

  app.get(
    AUTH_PATHS.googleOauthCallback,
    {
      preHandler: [authRateLimit],
    },
    async (request, reply): Promise<AuthSessionResponse | void> => {
      const parsedQuery = oauthCallbackQuerySchema.safeParse(request.query);

      if (!parsedQuery.success) {
        return reply.status(400).send({
          message: parsedQuery.error.issues[0]?.message ?? 'Invalid query',
        });
      }

      const expectedState = getOauthStateFromRequest(request);
      const codeVerifier = getOauthCodeVerifierFromRequest(request);

      if (expectedState === null || codeVerifier === null) {
        clearOauthCookies(reply, dependencies.env);
        return reply.status(400).send({
          message: 'OAuth session is missing or expired',
        });
      }

      if (parsedQuery.data.state !== expectedState) {
        clearOauthCookies(reply, dependencies.env);
        return reply.status(400).send({
          message: 'Invalid OAuth state',
        });
      }

      const profile = await oauthClient.exchangeCode({
        code: parsedQuery.data.code,
        codeVerifier,
        state: parsedQuery.data.state,
      });

      if (!profile.emailVerified) {
        clearOauthCookies(reply, dependencies.env);
        return reply.status(400).send({
          message: 'Google account email must be verified',
        });
      }

      const googleUserResult = await upsertGoogleUser(dependencies.prisma, profile);

      if (googleUserResult.kind === 'conflict') {
        clearOauthCookies(reply, dependencies.env);
        return reply.status(409).send({
          message: googleUserResult.message,
        });
      }

      const session = await createSessionWithExistingUser(
        dependencies.prisma,
        googleUserResult.user,
        buildSessionMetadata(request),
        dependencies.env.SESSION_TTL_HOURS,
      );

      clearOauthCookies(reply, dependencies.env);
      setSessionCookie(reply, dependencies.env, session.token, session.expiresAt);

      return toSessionResponse({
        expiresAt: session.expiresAt,
        user: googleUserResult.user,
      });
    },
  );

  app.post(
    AUTH_PATHS.signout,
    {
      preHandler: [requireAllowedOrigin, authRateLimit],
    },
    async (request, reply): Promise<void> => {
      const sessionToken = getSessionTokenFromRequest(request);

      if (sessionToken !== null) {
        await deleteSessionByToken(dependencies.prisma, sessionToken);
      }

      clearSessionCookie(reply, dependencies.env);
      clearOauthCookies(reply, dependencies.env);
      reply.status(204).send();
    },
  );

  app.get(
    AUTH_PATHS.session,
    {
      preHandler: [requireAuth],
    },
    async (request): Promise<AuthSessionResponse> => ({
      expiresAt: request.auth!.expiresAt.toISOString(),
      user: request.auth!.user,
    }),
  );
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function createSessionWithExistingUser(
  prisma: DatabaseClient,
  user: User,
  metadata: ReturnType<typeof buildSessionMetadata>,
  sessionTtlHours: number,
): Promise<{ expiresAt: Date; token: string }> {
  return createAuthSession(prisma, user.id, metadata, sessionTtlHours);
}

async function upsertGoogleUser(
  prisma: DatabaseClient,
  profile: {
    email: string;
    emailVerified: boolean;
    googleSubject: string;
  },
): Promise<
  | {
      kind: 'conflict';
      message: string;
    }
  | {
      kind: 'success';
      user: User;
    }
> {
  const normalizedEmail = normalizeEmail(profile.email);
  const existingUserBySubject = await prisma.user.findUnique({
    where: {
      googleSubject: profile.googleSubject,
    },
  });

  if (existingUserBySubject !== null) {
    if (existingUserBySubject.email !== normalizedEmail) {
      const updatedUser = await prisma.user.update({
        data: {
          email: normalizedEmail,
          emailVerified: profile.emailVerified,
        },
        where: {
          id: existingUserBySubject.id,
        },
      });

      return {
        kind: 'success',
        user: updatedUser,
      };
    }

    return {
      kind: 'success',
      user: existingUserBySubject,
    };
  }

  const existingUserByEmail = await prisma.user.findUnique({
    where: {
      email: normalizedEmail,
    },
  });

  if (existingUserByEmail !== null) {
    if (existingUserByEmail.authProvider !== AuthProvider.GOOGLE) {
      return {
        kind: 'conflict',
        message: 'This email is already registered with email and password sign-in',
      };
    }

    const updatedUser = await prisma.user.update({
      data: {
        emailVerified: profile.emailVerified,
        googleSubject: profile.googleSubject,
      },
      where: {
        id: existingUserByEmail.id,
      },
    });

    return {
      kind: 'success',
      user: updatedUser,
    };
  }

  const createdUser = await prisma.user.create({
    data: {
      authProvider: AuthProvider.GOOGLE,
      email: normalizedEmail,
      emailVerified: profile.emailVerified,
      googleSubject: profile.googleSubject,
    },
  });

  return {
    kind: 'success',
    user: createdUser,
  };
}
