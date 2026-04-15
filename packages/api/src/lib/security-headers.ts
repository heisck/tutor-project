import type { FastifyInstance } from 'fastify';

import type { ApiEnv } from '../config/env.js';

const CONTENT_SECURITY_POLICY =
  "default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'";

export function registerSecurityHeaders(
  app: FastifyInstance,
  env: Pick<ApiEnv, 'NODE_ENV'>,
): void {
  app.addHook('onSend', async (_request, reply, payload) => {
    if (!reply.hasHeader('Content-Security-Policy')) {
      reply.header('Content-Security-Policy', CONTENT_SECURITY_POLICY);
    }

    if (!reply.hasHeader('Referrer-Policy')) {
      reply.header('Referrer-Policy', 'no-referrer');
    }

    if (!reply.hasHeader('X-Content-Type-Options')) {
      reply.header('X-Content-Type-Options', 'nosniff');
    }

    if (!reply.hasHeader('X-Frame-Options')) {
      reply.header('X-Frame-Options', 'DENY');
    }

    if (
      env.NODE_ENV === 'production' &&
      !reply.hasHeader('Strict-Transport-Security')
    ) {
      reply.header(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains',
      );
    }

    return payload;
  });
}
