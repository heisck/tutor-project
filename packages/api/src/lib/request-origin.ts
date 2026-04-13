import type { FastifyReply, FastifyRequest } from 'fastify';

import type { ApiEnv } from '../config/env.js';

export function createAllowedOriginPreHandler(
  env: Pick<ApiEnv, 'CORS_ORIGINS'>,
) {
  return async function ensureAllowedOrigin(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const origin = request.headers.origin;

    if (origin === undefined || env.CORS_ORIGINS.includes(origin)) {
      return;
    }

    reply.status(403).send({
      message: 'Origin not allowed',
    });
  };
}
