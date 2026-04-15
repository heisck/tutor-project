import { randomBytes, timingSafeEqual } from 'node:crypto';

import {
  AUTH_HEADER_NAMES,
  type CsrfTokenResponse,
} from '@ai-tutor-pwa/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';

import {
  clearCsrfCookie,
  getCsrfTokenFromRequest,
  setCsrfCookie,
} from './cookies.js';
import type { ApiEnv } from '../config/env.js';

function createCsrfToken(): string {
  return randomBytes(32).toString('base64url');
}

function hasMatchingCsrfTokens(
  expectedToken: string,
  providedToken: string,
): boolean {
  const expectedBuffer = Buffer.from(expectedToken);
  const providedBuffer = Buffer.from(providedToken);

  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, providedBuffer);
}

export function ensureCsrfToken(
  request: FastifyRequest,
  reply: FastifyReply,
  env: ApiEnv,
): string {
  const existingToken = getCsrfTokenFromRequest(request);

  if (existingToken !== null) {
    return existingToken;
  }

  const csrfToken = createCsrfToken();
  setCsrfCookie(reply, env, csrfToken);

  return csrfToken;
}

export function createCsrfTokenResponse(csrfToken: string): CsrfTokenResponse {
  return {
    csrfToken,
  };
}

export function createRequireCsrfPreHandler(env: ApiEnv) {
  return async function requireCsrf(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    const expectedToken = getCsrfTokenFromRequest(request);
    const headerValue = request.headers[AUTH_HEADER_NAMES.csrf];
    const providedToken = Array.isArray(headerValue) ? headerValue[0] : headerValue;

    if (
      expectedToken === null ||
      typeof providedToken !== 'string' ||
      providedToken.length === 0 ||
      !hasMatchingCsrfTokens(expectedToken, providedToken)
    ) {
      if (expectedToken === null) {
        clearCsrfCookie(reply, env);
      }

      reply.status(403).send({
        message: 'Invalid CSRF token',
      });
    }
  };
}
