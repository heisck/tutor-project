import { z } from 'zod';

const apiEnvSchema = z.object({
  APP_VERSION: z.string().default('0.1.0'),
  CORS_ORIGINS: z
    .string()
    .min(1, 'CORS_ORIGINS is required')
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0),
    ),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  REDIS_URL: z.url({ error: 'REDIS_URL must be a valid URL' }),
});

export type ApiEnv = z.output<typeof apiEnvSchema>;

export function loadApiEnv(
  env: Record<string, string | undefined> = process.env,
): ApiEnv {
  const parsed = apiEnvSchema.safeParse(env);

  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');

    throw new Error(`Invalid API environment: ${message}`);
  }

  return parsed.data;
}
