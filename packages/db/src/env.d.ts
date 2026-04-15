import { z } from 'zod';
declare const databaseEnvSchema: z.ZodObject<{
    DATABASE_URL: z.ZodString;
}, z.core.$strip>;
export type DatabaseEnv = z.infer<typeof databaseEnvSchema>;
export declare function loadDatabaseEnv(env?: Record<string, string | undefined>): DatabaseEnv;
export {};
//# sourceMappingURL=env.d.ts.map