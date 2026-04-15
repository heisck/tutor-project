import {
  AUTH_HEADER_NAMES,
  AUTH_PATHS,
  type AuthSessionResponse,
  type CsrfTokenResponse,
} from '@ai-tutor-pwa/shared';
import type { FastifyInstance } from 'fastify';
import request from 'supertest';

import {
  CSRF_COOKIE_NAME,
  SESSION_COOKIE_NAME,
} from '../src/auth/cookies.js';

export const DEFAULT_TEST_ORIGIN = 'http://localhost:3000';

export interface AgentAuthContext {
  csrfToken: string;
  userId: string;
}

export interface InjectAuthContext {
  cookie: string;
  csrfToken: string;
  userId: string;
}

export function buildInjectHeaders(
  auth: Pick<InjectAuthContext, 'cookie' | 'csrfToken'>,
  options: {
    includeCsrf?: boolean;
    includeOrigin?: boolean;
  } = {},
): Record<string, string> {
  const headers: Record<string, string> = {
    cookie: auth.cookie,
  };

  if (options.includeOrigin !== false) {
    headers.origin = DEFAULT_TEST_ORIGIN;
  }

  if (options.includeCsrf !== false) {
    headers[AUTH_HEADER_NAMES.csrf] = auth.csrfToken;
  }

  return headers;
}

export async function createAgentAuthSession(
  testAgent: ReturnType<typeof request.agent>,
  credentials: {
    email: string;
    password: string;
  },
): Promise<AgentAuthContext> {
  const csrfToken = await fetchAgentCsrfToken(testAgent);
  const signupResponse = await testAgent
    .post(AUTH_PATHS.signup)
    .set('Origin', DEFAULT_TEST_ORIGIN)
    .set(AUTH_HEADER_NAMES.csrf, csrfToken)
    .send(credentials);

  if (signupResponse.status !== 201) {
    throw new Error(`Expected signup to succeed, received ${signupResponse.status}`);
  }

  const body = signupResponse.body as AuthSessionResponse;

  return {
    csrfToken: body.csrfToken,
    userId: body.user.id,
  };
}

export async function createInjectAuthSession(
  app: FastifyInstance,
  credentials: {
    email: string;
    password: string;
  },
): Promise<InjectAuthContext> {
  const csrfBootstrap = await bootstrapInjectCsrf(app);
  const signupResponse = await app.inject({
    headers: buildInjectHeaders(csrfBootstrap),
    method: 'POST',
    payload: credentials,
    url: AUTH_PATHS.signup,
  });

  if (signupResponse.statusCode !== 201) {
    throw new Error(
      `Expected signup to succeed, received ${signupResponse.statusCode}`,
    );
  }

  const sessionCookie = extractCookie(
    signupResponse.headers['set-cookie'],
    SESSION_COOKIE_NAME,
  );

  if (sessionCookie === null) {
    throw new Error('Expected signup response to set a session cookie');
  }

  const body = parseJson<AuthSessionResponse>(signupResponse.body);

  return {
    cookie: mergeCookieHeaders(
      csrfBootstrap.cookie,
      extractCookie(signupResponse.headers['set-cookie'], CSRF_COOKIE_NAME),
      sessionCookie,
    ),
    csrfToken: body.csrfToken,
    userId: body.user.id,
  };
}

export async function fetchAgentCsrfToken(
  testAgent: ReturnType<typeof request.agent>,
): Promise<string> {
  const response = await testAgent
    .get(AUTH_PATHS.csrf)
    .set('Origin', DEFAULT_TEST_ORIGIN);

  if (response.status !== 200 || typeof response.body.csrfToken !== 'string') {
    throw new Error('Expected CSRF bootstrap to succeed for agent tests');
  }

  return response.body.csrfToken;
}

export function extractCookie(
  setCookieHeader: string | readonly string[] | undefined,
  cookieName: string,
): string | null {
  const rawCookie = Array.isArray(setCookieHeader)
    ? setCookieHeader.find((value) => value.startsWith(`${cookieName}=`))
    : setCookieHeader?.startsWith(`${cookieName}=`)
      ? setCookieHeader
      : undefined;

  if (rawCookie === undefined) {
    return null;
  }

  const [cookie] = rawCookie.split(';');

  return cookie ?? null;
}

function parseJson<T>(body: string): T {
  return JSON.parse(body) as T;
}

async function bootstrapInjectCsrf(
  app: FastifyInstance,
  existingCookie?: string,
): Promise<Pick<InjectAuthContext, 'cookie' | 'csrfToken'>> {
  const response = await app.inject({
    headers:
      existingCookie === undefined
        ? {
            origin: DEFAULT_TEST_ORIGIN,
          }
        : {
            cookie: existingCookie,
            origin: DEFAULT_TEST_ORIGIN,
          },
    method: 'GET',
    url: AUTH_PATHS.csrf,
  });

  if (response.statusCode !== 200) {
    throw new Error(
      `Expected CSRF bootstrap to succeed, received ${response.statusCode}`,
    );
  }

  const body = parseJson<CsrfTokenResponse>(response.body);
  const refreshedCookie = extractCookie(
    response.headers['set-cookie'],
    CSRF_COOKIE_NAME,
  );

  if (refreshedCookie === null && existingCookie === undefined) {
    throw new Error('Expected CSRF bootstrap response to set a CSRF cookie');
  }

  return {
    cookie:
      refreshedCookie === null
        ? existingCookie!
        : mergeCookieHeaders(existingCookie, refreshedCookie),
    csrfToken: body.csrfToken,
  };
}

function mergeCookieHeaders(
  ...cookies: Array<string | null | undefined>
): string {
  const cookiesByName = new Map<string, string>();

  for (const cookie of cookies) {
    if (cookie === null || cookie === undefined) {
      continue;
    }

    const separatorIndex = cookie.indexOf('=');

    if (separatorIndex <= 0) {
      continue;
    }

    cookiesByName.set(cookie.slice(0, separatorIndex), cookie);
  }

  const mergedCookies = [...cookiesByName.values()];

  if (mergedCookies.length === 0) {
    throw new Error('Expected at least one cookie to merge');
  }

  return mergedCookies.join('; ');
}
