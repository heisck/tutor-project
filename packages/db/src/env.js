import { z } from 'zod';
const databaseEnvSchema = z.object({
    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
});
export function loadDatabaseEnv(env = process.env) {
    const parsed = databaseEnvSchema.safeParse(env);
    if (!parsed.success) {
        const message = parsed.error.issues
            .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
            .join('; ');
        throw new Error(`Invalid database environment: ${message}`);
    }
    return parsed.data;
}
//# sourceMappingURL=env.js.map