import { randomUUID } from 'node:crypto';

import { createPrismaClient } from '@ai-tutor-pwa/db';
import { AUTH_HEADER_NAMES, AUTH_PATHS, PROFILE_PATHS } from '@ai-tutor-pwa/shared';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';

import { buildApp } from '../src/app.js';
import { closeRedisClient, createRedisClient } from '../src/lib/redis.js';
import { createApiTestEnv } from './test-env.js';
import { createNoopDocumentProcessingQueue } from './test-doubles.js';
import { fetchAgentCsrfToken } from './auth-test-helpers.js';

const baseEnv = createApiTestEnv();
const prismaClient = createPrismaClient({
  DATABASE_URL: baseEnv.DATABASE_URL,
});
const redisClient = createRedisClient(baseEnv);
const testPrefix = `profile-course-test-${randomUUID()}`;

let app: Awaited<ReturnType<typeof buildApp>>;
let agent: ReturnType<typeof request.agent>;

beforeAll(async () => {
  await redisClient.ping();
});

afterAll(async () => {
  await closeRedisClient(redisClient);
  await prismaClient.$disconnect();
});

beforeEach(async () => {
  app = await buildApp({
    documentProcessingQueue: createNoopDocumentProcessingQueue(),
    env: createApiTestEnv(),
    prismaClient,
    rateLimitKeyPrefix: `rate-limit:profile-test:${randomUUID()}`,
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
        startsWith: testPrefix,
      },
    },
  });
  await prismaClient.institution.deleteMany({
    where: {
      name: {
        startsWith: testPrefix,
      },
    },
  });
});

describe('profile and course routes', () => {
  it('fetches the authenticated user profile', async () => {
    const { email } = await signUp(agent, 'get-profile');

    const response = await agent.get(PROFILE_PATHS.profile);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      authProvider: 'email',
      department: null,
      email,
      institution: null,
      level: null,
      username: null,
    });
  });

  it('updates the authenticated user profile', async () => {
    const { csrfToken: csrfUpdate } = await signUp(agent, 'update-profile');

    const response = await agent
      .put(PROFILE_PATHS.profile)
      .set('Origin', 'http://localhost:3000')
      .set(AUTH_HEADER_NAMES.csrf, csrfUpdate)
      .send({
        department: 'Computer Science',
        institution: {
          country: 'Ghana',
          name: `${testPrefix}-University`,
          type: 'university',
        },
        level: 'undergraduate',
        username: 'kelvin',
      });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      department: 'Computer Science',
      institution: {
        country: 'Ghana',
        name: `${testPrefix}-University`,
        type: 'university',
      },
      level: 'undergraduate',
      username: 'kelvin',
    });
  });

  it('creates a course for the authenticated user', async () => {
    const { csrfToken: csrfCreate } = await signUp(agent, 'create-course');

    const response = await agent
      .post(PROFILE_PATHS.courses)
      .set('Origin', 'http://localhost:3000')
      .set(AUTH_HEADER_NAMES.csrf, csrfCreate)
      .send({
        code: 'CSC101',
        level: '100',
        name: 'Introduction to Computing',
      });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      code: 'CSC101',
      level: '100',
      name: 'Introduction to Computing',
    });
  });

  it('lists only the authenticated user courses', async () => {
    const { csrfToken: csrfList } = await signUp(agent, 'list-courses');
    await agent
      .post(PROFILE_PATHS.courses)
      .set('Origin', 'http://localhost:3000')
      .set(AUTH_HEADER_NAMES.csrf, csrfList)
      .send({
        code: 'MTH101',
        level: '100',
        name: 'Calculus I',
      });
    await agent
      .post(PROFILE_PATHS.courses)
      .set('Origin', 'http://localhost:3000')
      .set(AUTH_HEADER_NAMES.csrf, csrfList)
      .send({
        code: 'PHY101',
        level: '100',
        name: 'Physics I',
      });

    const response = await agent.get(PROFILE_PATHS.courses);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
    expect(response.body.map((course: { name: string }) => course.name)).toEqual(
      expect.arrayContaining(['Calculus I', 'Physics I']),
    );
  });

  it('rejects invalid profile and course payloads cleanly', async () => {
    const { csrfToken: csrfInvalid } = await signUp(agent, 'invalid-payloads');

    const invalidProfileResponse = await agent
      .put(PROFILE_PATHS.profile)
      .set('Origin', 'http://localhost:3000')
      .set(AUTH_HEADER_NAMES.csrf, csrfInvalid)
      .send({
        level: 'middle school',
      });
    const invalidCourseResponse = await agent
      .post(PROFILE_PATHS.courses)
      .set('Origin', 'http://localhost:3000')
      .set(AUTH_HEADER_NAMES.csrf, csrfInvalid)
      .send({
        code: 'CSC101',
      });

    expect(invalidProfileResponse.status).toBe(400);
    expect(invalidCourseResponse.status).toBe(400);
  });

  it('rejects unauthenticated access', async () => {
    const profileResponse = await agent.get(PROFILE_PATHS.profile);
    const courseResponse = await agent.post(PROFILE_PATHS.courses).send({
      code: 'CSC101',
      name: 'Introduction to Computing',
    });

    expect(profileResponse.status).toBe(401);
    expect(courseResponse.status).toBe(401);
  });

  it('prevents cross-user course access', async () => {
    const firstUserAgent = agent;
    const { csrfToken: csrfCrossA } = await signUp(firstUserAgent, 'cross-user-a');
    await firstUserAgent
      .post(PROFILE_PATHS.courses)
      .set('Origin', 'http://localhost:3000')
      .set(AUTH_HEADER_NAMES.csrf, csrfCrossA)
      .send({
        code: 'BIO101',
        name: 'Biology I',
      });

    const secondUserAgent = request.agent(app.server);
    const { csrfToken: csrfCrossB } = await signUp(secondUserAgent, 'cross-user-b');
    await secondUserAgent
      .post(PROFILE_PATHS.courses)
      .set('Origin', 'http://localhost:3000')
      .set(AUTH_HEADER_NAMES.csrf, csrfCrossB)
      .send({
        code: 'CHE101',
        name: 'Chemistry I',
      });

    const firstUserCoursesResponse = await firstUserAgent.get(PROFILE_PATHS.courses);

    expect(firstUserCoursesResponse.status).toBe(200);
    expect(
      firstUserCoursesResponse.body.map((course: { name: string }) => course.name),
    ).toEqual(['Biology I']);
  });
});

async function signUp(
  testAgent: ReturnType<typeof request.agent>,
  label: string,
): Promise<{ email: string; csrfToken: string }> {
  const email = `${testPrefix}-${label}@example.com`;
  const csrfToken = await fetchAgentCsrfToken(testAgent);
  const response = await testAgent
    .post(AUTH_PATHS.signup)
    .set('Origin', 'http://localhost:3000')
    .set(AUTH_HEADER_NAMES.csrf, csrfToken)
    .send({ email, password: 'password123' });

  expect(response.status).toBe(201);
  return { email, csrfToken };
}
