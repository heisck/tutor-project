import { PrismaClient } from '@prisma/client';
import { type DatabaseEnv } from './env.js';
export type DatabaseClient = PrismaClient;
export declare function createPrismaClient(env?: DatabaseEnv): PrismaClient;
export declare function getPrismaClient(env?: DatabaseEnv): PrismaClient;
export declare function checkDatabaseConnection(client: PrismaClient): Promise<{
    status: 'ok';
}>;
export declare function disconnectDatabase(client: PrismaClient): Promise<void>;
//# sourceMappingURL=client.d.ts.map