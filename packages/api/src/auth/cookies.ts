import type { FastifyReply, FastifyRequest } from 'fastify';

import type { ApiEnv } from '../config/env.js';

export const SESSION_COOKIE_NAME = 'ai_tutor_pwa_session';
const OAUTH_STATE_COOKIE_NAME = 'ai_tutor_pwa_oauth_state';
const OAUTH_CODE_VERIFIER_COOKIE_NAME = 'ai_tutor_pwa_oauth_code_verifier';

function isSecureCookieEnvironment(env: Pick<ApiEnv, 'NODE_ENV'>): boolean {
  return env.NODE_ENV === 'production';
}

function buildCookieOptions(env: ApiEnv) {
  return {
    httpOnly: true,
    path: '/',
    sameSite: 'lax' as const,
    secure: isSecureCookieEnvironment(env),
    signed: true,
  };
}

export function setSessionCookie(
  reply: FastifyReply,
  env: ApiEnv,
  sessionToken: string,
  expiresAt: Date,
): void {
  reply.setCookie(SESSION_COOKIE_NAME, sessionToken, {
    ...buildCookieOptions(env),
    expires: expiresAt,
  });
}

export function clearSessionCookie(reply: FastifyReply, env: ApiEnv): void {
  reply.clearCookie(SESSION_COOKIE_NAME, buildCookieOptions(env));
}

export function setOauthCookies(
  reply: FastifyReply,
  env: ApiEnv,
  state: string,
  codeVerifier: string,
): void {
  const cookieOptions = {
    ...buildCookieOptions(env),
    maxAge: 60 * 10,
  };

  reply.setCookie(OAUTH_STATE_COOKIE_NAME, state, cookieOptions);
  reply.setCookie(
    OAUTH_CODE_VERIFIER_COOKIE_NAME,
    codeVerifier,
    cookieOptions,
  );
}

export function clearOauthCookies(reply: FastifyReply, env: ApiEnv): void {
  const cookieOptions = buildCookieOptions(env);

  reply.clearCookie(OAUTH_STATE_COOKIE_NAME, cookieOptions);
  reply.clearCookie(OAUTH_CODE_VERIFIER_COOKIE_NAME, cookieOptions);
}

export function getSignedCookie(
  request: FastifyRequest,
  cookieName: string,
): string | null {
  const cookieValue = request.cookies[cookieName];

  if (cookieValue === undefined) {
    return null;
  }

  const unsignedCookie = request.unsignCookie(cookieValue);

  return unsignedCookie.valid ? unsignedCookie.value : null;
}

export function getSessionTokenFromRequest(
  request: FastifyRequest,
): string | null {
  return getSignedCookie(request, SESSION_COOKIE_NAME);
}

export function getOauthStateFromRequest(
  request: FastifyRequest,
): string | null {
  return getSignedCookie(request, OAUTH_STATE_COOKIE_NAME);
}

export function getOauthCodeVerifierFromRequest(
  request: FastifyRequest,
): string | null {
  return getSignedCookie(request, OAUTH_CODE_VERIFIER_COOKIE_NAME);
}
