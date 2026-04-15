import { PrismaClient } from '@prisma/client';
import { loadDatabaseEnv } from './env.js';
const globalForPrisma = globalThis;
export function createPrismaClient(env) {
    const databaseEnv = loadDatabaseEnv(env ?? process.env);
    process.env.DATABASE_URL = databaseEnv.DATABASE_URL;
    return new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
}
export function getPrismaClient(env) {
    if (globalForPrisma.prisma !== undefined) {
        return globalForPrisma.prisma;
    }
    const client = createPrismaClient(env);
    if (process.env.NODE_ENV !== 'production') {
        globalForPrisma.prisma = client;
    }
    return client;
}
export async function checkDatabaseConnection(client) {
    await client.$connect();
    await client.$queryRaw `SELECT 1`;
    return { status: 'ok' };
}
export async function disconnectDatabase(client) {
    await client.$disconnect();
}
//# sourceMappingURL=client.js.map