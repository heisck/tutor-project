import { PrismaClient } from '@prisma/client';

import { loadDatabaseEnv, type DatabaseEnv } from './env.js';

interface GlobalWithPrisma {
  prisma?: PrismaClient;
}

const globalForPrisma = globalThis as GlobalWithPrisma;

export type DatabaseClient = PrismaClient;

export function createPrismaClient(env?: DatabaseEnv): PrismaClient {
  const databaseEnv = loadDatabaseEnv(env ?? process.env);
  process.env.DATABASE_URL = databaseEnv.DATABASE_URL;

  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });
}

export function getPrismaClient(env?: DatabaseEnv): PrismaClient {
  if (globalForPrisma.prisma !== undefined) {
    return globalForPrisma.prisma;
  }

  const client = createPrismaClient(env);

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = client;
  }

  return client;
}

export async function checkDatabaseConnection(
  client: PrismaClient,
): Promise<{ status: 'ok' }> {
  await client.$connect();
  await client.$queryRaw`SELECT 1`;

  return { status: 'ok' };
}

export async function disconnectDatabase(client: PrismaClient): Promise<void> {
  await client.$disconnect();
}
