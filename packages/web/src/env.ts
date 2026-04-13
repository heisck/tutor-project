import { z } from 'zod';

const webEnvSchema = z.object({
  NEXT_PUBLIC_API_BASE_URL: z.url({
    error: 'NEXT_PUBLIC_API_BASE_URL must be a valid URL',
  }),
});

export type WebEnv = z.infer<typeof webEnvSchema>;

export function loadWebEnv(
  env: Record<string, string | undefined> = process.env,
): WebEnv {
  const parsed = webEnvSchema.safeParse(env);

  if (!parsed.success) {
    const message = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');

    throw new Error(`Invalid web environment: ${message}`);
  }

  return parsed.data;
}
