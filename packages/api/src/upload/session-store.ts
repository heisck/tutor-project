import type { DocumentProcessingStatus } from '@ai-tutor-pwa/shared';
import type { RedisClient } from '../lib/redis.js';

const ACTIVE_UPLOADS_TTL_SECONDS = 60 * 60;
const COMPLETED_UPLOAD_TTL_SECONDS = 60 * 60 * 24;
const UPLOAD_SESSION_KEY_PREFIX = 'upload:session';
const USER_ACTIVE_UPLOADS_KEY_PREFIX = 'upload:active:user';

export interface UploadSessionRecord {
  createdAt: string;
  documentId: string | null;
  extension: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  processingStatus: DocumentProcessingStatus | null;
  sanitizedFileName: string;
  status: 'completed' | 'created';
  storageKey: string;
  uploadId: string;
  uploadedAt: string | null;
  userId: string;
}

export async function reserveUploadSession(
  redis: RedisClient,
  session: UploadSessionRecord,
): Promise<void> {
  const activeUploadsKey = getUserActiveUploadsKey(session.userId);
  await cleanupExpiredActiveUploads(redis, session.userId, Date.now());

  const activeUploadsCount = await redis.zcard(activeUploadsKey);

  if (activeUploadsCount >= 3) {
    throw new UploadConcurrencyLimitError();
  }

  await redis
    .multi()
    .set(
      getUploadSessionKey(session.uploadId),
      JSON.stringify(session),
      'EX',
      ACTIVE_UPLOADS_TTL_SECONDS,
    )
    .zadd(activeUploadsKey, Date.now(), session.uploadId)
    .expire(activeUploadsKey, ACTIVE_UPLOADS_TTL_SECONDS)
    .exec();
}

export async function getUploadSession(
  redis: RedisClient,
  uploadId: string,
): Promise<UploadSessionRecord | null> {
  const sessionValue = await redis.get(getUploadSessionKey(uploadId));

  if (sessionValue === null) {
    return null;
  }

  return JSON.parse(sessionValue) as UploadSessionRecord;
}

export async function completeUploadSession(
  redis: RedisClient,
  uploadId: string,
  input: {
    documentId: string;
    processingStatus: DocumentProcessingStatus;
    uploadedAt: string;
  },
): Promise<UploadSessionRecord | null> {
  const session = await getUploadSession(redis, uploadId);

  if (session === null) {
    return null;
  }

  const completedSession: UploadSessionRecord = {
    ...session,
    documentId: input.documentId,
    processingStatus: input.processingStatus,
    status: 'completed',
    uploadedAt: input.uploadedAt,
  };

  await redis
    .multi()
    .set(
      getUploadSessionKey(uploadId),
      JSON.stringify(completedSession),
      'EX',
      COMPLETED_UPLOAD_TTL_SECONDS,
    )
    .zrem(getUserActiveUploadsKey(session.userId), uploadId)
    .exec();

  return completedSession;
}

export async function discardUploadSession(
  redis: RedisClient,
  uploadId: string,
): Promise<void> {
  const session = await getUploadSession(redis, uploadId);

  if (session === null) {
    return;
  }

  await redis
    .multi()
    .del(getUploadSessionKey(uploadId))
    .zrem(getUserActiveUploadsKey(session.userId), uploadId)
    .exec();
}

async function cleanupExpiredActiveUploads(
  redis: RedisClient,
  userId: string,
  now: number,
): Promise<void> {
  await redis.zremrangebyscore(
    getUserActiveUploadsKey(userId),
    '-inf',
    now - ACTIVE_UPLOADS_TTL_SECONDS * 1000,
  );
}

function getUploadSessionKey(uploadId: string): string {
  return `${UPLOAD_SESSION_KEY_PREFIX}:${uploadId}`;
}

function getUserActiveUploadsKey(userId: string): string {
  return `${USER_ACTIVE_UPLOADS_KEY_PREFIX}:${userId}`;
}

export class UploadConcurrencyLimitError extends Error {
  public constructor() {
    super('You already have 3 uploads in progress');
    this.name = 'UploadConcurrencyLimitError';
  }
}
