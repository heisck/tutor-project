import { randomUUID } from 'node:crypto';

import { afterAll, describe, expect, it } from 'vitest';

import { createPrismaClient, disconnectDatabase } from '../src/client.js';

const client = createPrismaClient({
  DATABASE_URL:
    process.env.DATABASE_URL ??
    'postgresql://postgres:postgres@localhost:5433/ai_tutor_pwa?schema=public',
});
const testEmailPrefix = `db-auth-${randomUUID()}`;

describe('auth models', () => {
  afterAll(async () => {
    await client.user.deleteMany({
      where: {
        email: {
          startsWith: testEmailPrefix,
        },
      },
    });
    await disconnectDatabase(client);
  });

  it('stores users with database-backed sessions', async () => {
    const user = await client.user.create({
      data: {
        authProvider: 'EMAIL',
        email: `${testEmailPrefix}@example.com`,
        passwordHash: 'hashed-password',
      },
    });

    const expiresAt = new Date(Date.now() + 60_000);
    const session = await client.authSession.create({
      data: {
        expiresAt,
        tokenHash: `token-${randomUUID()}`,
        userId: user.id,
      },
      include: {
        user: true,
      },
    });

    expect(session.user.email).toBe(user.email);
    expect(session.expiresAt.toISOString()).toBe(expiresAt.toISOString());
  });
});
