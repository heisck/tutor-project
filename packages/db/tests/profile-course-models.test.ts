import { randomUUID } from 'node:crypto';

import { afterAll, describe, expect, it } from 'vitest';

import { AuthProvider, createPrismaClient, disconnectDatabase } from '../src/index.js';

const client = createPrismaClient({
  DATABASE_URL:
    process.env.DATABASE_URL ??
    'postgresql://postgres:postgres@localhost:5433/ai_tutor_pwa?schema=public',
});
const testPrefix = `db-profile-course-${randomUUID()}`;

describe('profile and course models', () => {
  afterAll(async () => {
    await client.user.deleteMany({
      where: {
        email: {
          startsWith: testPrefix,
        },
      },
    });
    await client.institution.deleteMany({
      where: {
        name: {
          startsWith: testPrefix,
        },
      },
    });
    await disconnectDatabase(client);
  });

  it('stores institutions and courses with user ownership', async () => {
    const institution = await client.institution.create({
      data: {
        name: `${testPrefix}-Institution`,
        type: 'university',
      },
    });

    const user = await client.user.create({
      data: {
        authProvider: AuthProvider.EMAIL,
        email: `${testPrefix}@example.com`,
        institutionId: institution.id,
        passwordHash: 'hashed-password',
      },
    });

    const course = await client.course.create({
      data: {
        code: 'CSC101',
        name: 'Introduction to Computing',
        userId: user.id,
      },
      include: {
        user: true,
      },
    });

    expect(course.user.email).toBe(user.email);
    expect(course.code).toBe('CSC101');
  });
});
