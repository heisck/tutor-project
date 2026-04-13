import { afterAll, describe, expect, it } from 'vitest';

import {
  checkDatabaseConnection,
  createPrismaClient,
  disconnectDatabase,
  loadDatabaseEnv,
} from '../src/index.js';

const databaseEnv = loadDatabaseEnv({
  DATABASE_URL:
    process.env.DATABASE_URL ??
    'postgresql://postgres:postgres@localhost:5433/ai_tutor_pwa?schema=public',
});

const client = createPrismaClient(databaseEnv);

describe('database connectivity', () => {
  afterAll(async () => {
    await disconnectDatabase(client);
  });

  it('connects to postgres successfully', async () => {
    await expect(checkDatabaseConnection(client)).resolves.toEqual({ status: 'ok' });
  });
});
