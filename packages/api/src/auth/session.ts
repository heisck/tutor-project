import { createHash, randomBytes } from 'node:crypto';

import {
  AuthProvider as PrismaAuthProvider,
  type AuthSession,
  type Prisma,
  type User,
  UserRole as PrismaUserRole,
} from '@ai-tutor-pwa/db';
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { DatabaseClient } from '@ai-tutor-pwa/db';
import type { AuthSessionResponse, AuthenticatedUser } from '@ai-tutor-pwa/shared';

import { clearSessionCookie, getSessionTokenFromRequest } from './cookies.js';
import type { ApiEnv } from '../config/env.js';

export interface SessionMetadata {
  ipAddress: string | null;
  userAgent: string | null;
}

export interface AuthenticatedRequestContext {
  expiresAt: Date;
  sessionId: string;
  user: AuthenticatedUser;
  userId: string;
}

type SessionRecord = Prisma.AuthSessionGetPayload<{
  include: {
    user: true;
  };
}>;

declare module 'fastify' {
  interface FastifyRequest {
    auth: AuthenticatedRequestContext | null;
  }
}

export function createSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function calculateSessionExpiry(
  sessionTtlHours: number,
  now: Date = new Date(),
): Date {
  return new Date(now.getTime() + sessionTtlHours * 60 * 60 * 1000);
}

export async function createAuthSession(
  prisma: Pick<DatabaseClient, 'authSession'>,
  userId: string,
  metadata: SessionMetadata,
  sessionTtlHours: number,
  now: Date = new Date(),
): Promise<{ expiresAt: Date; token: string }> {
  const token = createSessionToken();
  const expiresAt = calculateSessionExpiry(sessionTtlHours, now);

  await prisma.authSession.create({
    data: {
      expiresAt,
      ipAddress: metadata.ipAddress,
      tokenHash: hashSessionToken(token),
      userAgent: metadata.userAgent,
      userId,
    },
  });

  return {
    expiresAt,
    token,
  };
}

export async function deleteSessionByToken(
  prisma: Pick<DatabaseClient, 'authSession'>,
  token: string,
): Promise<void> {
  await prisma.authSession.deleteMany({
    where: {
      tokenHash: hashSessionToken(token),
    },
  });
}

export async function resolveSessionFromToken(
  prisma: DatabaseClient,
  token: string,
  now: Date = new Date(),
): Promise<SessionRecord | null> {
  const session = await prisma.authSession.findUnique({
    where: {
      tokenHash: hashSessionToken(token),
    },
    include: {
      user: true,
    },
  });

  if (session === null) {
    return null;
  }

  if (session.expiresAt <= now) {
    await prisma.authSession.delete({
      where: {
        id: session.id,
      },
    });

    return null;
  }

  return session;
}

export async function authenticateRequest(
  request: FastifyRequest,
  reply: FastifyReply,
  prisma: DatabaseClient,
  env: ApiEnv,
): Promise<AuthenticatedRequestContext | null> {
  if (request.auth !== null) {
    return request.auth;
  }

  const sessionToken = getSessionTokenFromRequest(request);

  if (sessionToken === null) {
    clearSessionCookie(reply, env);
    reply.status(401).send({
      message: 'Authentication required',
    });

    return null;
  }

  const session = await resolveSessionFromToken(prisma, sessionToken);

  if (session === null) {
    clearSessionCookie(reply, env);
    reply.status(401).send({
      message: 'Authentication required',
    });

    return null;
  }

  const authContext = mapSessionRecordToAuthContext(session);
  request.auth = authContext;
  return authContext;
}

export function createRequireAuthPreHandler(
  prisma: DatabaseClient,
  env: ApiEnv,
) {
  return async function requireAuth(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    await authenticateRequest(request, reply, prisma, env);
  };
}

export function toSessionResponse(
  session: Pick<AuthSession, 'expiresAt'> & { user: User },
): AuthSessionResponse {
  return {
    expiresAt: session.expiresAt.toISOString(),
    user: mapUserToAuthenticatedUser(session.user),
  };
}

export function buildSessionMetadata(request: FastifyRequest): SessionMetadata {
  return {
    ipAddress: request.ip ?? null,
    userAgent:
      typeof request.headers['user-agent'] === 'string'
        ? request.headers['user-agent']
        : null,
  };
}

function mapSessionRecordToAuthContext(
  session: SessionRecord,
): AuthenticatedRequestContext {
  return {
    expiresAt: session.expiresAt,
    sessionId: session.id,
    user: mapUserToAuthenticatedUser(session.user),
    userId: session.userId,
  };
}

export function mapUserToAuthenticatedUser(user: User): AuthenticatedUser {
  return {
    authProvider:
      user.authProvider === PrismaAuthProvider.GOOGLE ? 'google' : 'email',
    email: user.email,
    emailVerified: user.emailVerified,
    id: user.id,
    role: user.role === PrismaUserRole.ADMIN ? 'admin' : 'student',
    username: user.username,
  };
}
