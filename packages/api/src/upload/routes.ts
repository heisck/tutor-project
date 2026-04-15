import type { Multipart } from '@fastify/multipart';
import { randomUUID } from 'node:crypto';

import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';

import { createRequireAuthPreHandler } from '../auth/session.js';
import type { ApiEnv } from '../config/env.js';
import type { DocumentProcessingQueue } from '../documents/queue.js';
import {
  createDocumentRecord,
  mapDocumentProcessingStatus,
  transitionDocumentProcessingStatus,
} from '../documents/service.js';
import { createAllowedOriginPreHandler } from '../lib/request-origin.js';
import { createUserRateLimitPreHandler } from '../lib/rate-limit.js';
import type { RedisClient } from '../lib/redis.js';
import {
  UPLOAD_PATHS,
  type UploadCreateResponse,
  type UploadFinishResponse,
  type UploadValidationResponse,
} from '@ai-tutor-pwa/shared';
import {
  DocumentProcessingStatus,
  type DatabaseClient,
} from '@ai-tutor-pwa/db';
import {
  completeUploadSession,
  discardUploadSession,
  getUploadSession,
  reserveUploadSession,
  type UploadSessionRecord,
  UploadConcurrencyLimitError,
} from './session-store.js';
import {
  buildUploadStorageKey,
  parseAndValidateUploadDescriptor,
  UploadValidationError,
  validateUploadedFileContent,
  MAX_UPLOAD_SIZE_BYTES,
} from './validation.js';
import {
  createR2UploadStorageClient,
  type UploadStorageClient,
} from './storage/r2.js';

const uploadDescriptorSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  fileSizeBytes: z.number().int().positive(),
  mimeType: z.string().trim().min(1).max(255),
});

interface UploadRouteDependencies {
  documentQueue: DocumentProcessingQueue;
  env: ApiEnv;
  prisma: DatabaseClient;
  redis: RedisClient;
  storageClient?: UploadStorageClient | undefined;
}

export async function registerUploadRoutes(
  app: FastifyInstance,
  dependencies: UploadRouteDependencies,
): Promise<void> {
  const requireAuth = createRequireAuthPreHandler(
    dependencies.prisma,
    dependencies.env,
  );
  const requireAllowedOrigin = createAllowedOriginPreHandler(dependencies.env);
  const uploadCreateRateLimit = createUserRateLimitPreHandler(dependencies.redis, {
    keyPrefix: 'rate-limit:upload:create',
    limit: 5,
    timeWindowSeconds: 60 * 60,
  });
  const uploadValidateRateLimit = createUserRateLimitPreHandler(
    dependencies.redis,
    {
      keyPrefix: 'rate-limit:upload:validate',
      limit: 30,
      timeWindowSeconds: 60,
    },
  );
  const uploadFinishRateLimit = createUserRateLimitPreHandler(dependencies.redis, {
    keyPrefix: 'rate-limit:upload:finish',
    limit: 30,
    timeWindowSeconds: 60,
  });
  const storageClient =
    dependencies.storageClient ?? createR2UploadStorageClient(dependencies.env);

  app.post(
    UPLOAD_PATHS.validate,
    {
      preHandler: [requireAuth, requireAllowedOrigin, uploadValidateRateLimit],
    },
    async (request, reply): Promise<UploadValidationResponse | void> => {
      try {
        const parsedBody = uploadDescriptorSchema.parse(request.body);
        const descriptor = parseAndValidateUploadDescriptor(parsedBody);

        return {
          extension: descriptor.extension,
          fileName: descriptor.fileName,
          fileSizeBytes: descriptor.fileSizeBytes,
          mimeType: descriptor.mimeType,
          valid: true,
        };
      } catch (error) {
        return sendUploadError(reply, error);
      }
    },
  );

  app.post(
    UPLOAD_PATHS.create,
    {
      preHandler: [requireAuth, requireAllowedOrigin, uploadCreateRateLimit],
    },
    async (request, reply): Promise<UploadCreateResponse | void> => {
      try {
        const parsedBody = uploadDescriptorSchema.parse(request.body);
        const descriptor = parseAndValidateUploadDescriptor(parsedBody);
        const uploadId = randomUUID();
        const storageKey = buildUploadStorageKey({
          sanitizedFileName: descriptor.sanitizedFileName,
          uploadId,
          userId: request.auth!.userId,
        });
        const session: UploadSessionRecord = {
          createdAt: new Date().toISOString(),
          documentId: null,
          extension: descriptor.extension,
          fileName: descriptor.fileName,
          fileSizeBytes: descriptor.fileSizeBytes,
          mimeType: descriptor.mimeType,
          processingStatus: null,
          sanitizedFileName: descriptor.sanitizedFileName,
          status: 'created',
          storageKey,
          uploadId,
          uploadedAt: null,
          userId: request.auth!.userId,
        };

        await reserveUploadSession(dependencies.redis, session);

        return reply.status(201).send({
          expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          fileName: session.fileName,
          fileSizeBytes: session.fileSizeBytes,
          mimeType: session.mimeType,
          status: 'created',
          storage: {
            bucket: dependencies.env.R2_BUCKET_NAME,
            key: session.storageKey,
            provider: 'r2',
          },
          uploadId: session.uploadId,
        });
      } catch (error) {
        return sendUploadError(reply, error);
      }
    },
  );

  app.post(
    UPLOAD_PATHS.finish,
    {
      preHandler: [requireAuth, requireAllowedOrigin, uploadFinishRateLimit],
    },
    async (request, reply): Promise<UploadFinishResponse | void> => {
      let reservedUploadId: string | null = null;

      try {
        const multipartFile = await request.file({
          limits: {
            fields: 10,
            fileSize: MAX_UPLOAD_SIZE_BYTES,
            files: 1,
          },
        });

        if (multipartFile === undefined) {
          return reply.status(400).send({
            message: 'Upload file is required',
          });
        }

        const fileBuffer = await multipartFile.toBuffer();
        const uploadId = extractMultipartFieldValue(multipartFile.fields.uploadId);

        if (uploadId === null) {
          return reply.status(400).send({
            message: 'uploadId is required',
          });
        }

        reservedUploadId = uploadId;

        const uploadSession = await getUploadSession(dependencies.redis, uploadId);

        if (
          uploadSession === null ||
          uploadSession.userId !== request.auth!.userId ||
          uploadSession.status !== 'created'
        ) {
          return reply.status(404).send({
            message: 'Upload session not found',
          });
        }

        if (
          multipartFile.filename !== uploadSession.fileName ||
          multipartFile.mimetype !== uploadSession.mimeType
        ) {
          await discardUploadSession(dependencies.redis, uploadId);
          return reply.status(400).send({
            message: 'Uploaded file metadata does not match the reserved upload',
          });
        }

        validateUploadedFileContent({
          buffer: fileBuffer,
          extension: uploadSession.extension,
          fileName: multipartFile.filename,
          fileSizeBytes: fileBuffer.byteLength,
          mimeType: multipartFile.mimetype,
        });

        const storedObject = await storageClient.putObject({
          body: fileBuffer,
          contentLength: fileBuffer.byteLength,
          contentType: multipartFile.mimetype,
          key: uploadSession.storageKey,
          metadata: {
            fileName: uploadSession.sanitizedFileName,
            uploadId: uploadSession.uploadId,
            userId: uploadSession.userId,
          },
        });
        const documentRecord = await createDocumentRecord(dependencies.prisma, {
          fileSize: fileBuffer.byteLength,
          fileType: multipartFile.mimetype,
          fileUrl: `r2://${storedObject.bucket}/${storedObject.key}`,
          title: uploadSession.fileName,
          userId: uploadSession.userId,
        });

        await dependencies.documentQueue.enqueue({
          documentId: documentRecord.id,
        });

        const queuedDocument = await transitionDocumentProcessingStatus(
          dependencies.prisma,
          {
            documentId: documentRecord.id,
            nextStatus: DocumentProcessingStatus.QUEUED,
          },
        );

        const completedSession = await completeUploadSession(
          dependencies.redis,
          uploadId,
          {
            documentId: documentRecord.id,
            processingStatus: mapDocumentProcessingStatus(
              queuedDocument.processingStatus,
            ),
            uploadedAt: new Date().toISOString(),
          },
        );

        if (completedSession === null) {
          return reply.status(404).send({
            message: 'Upload session not found',
          });
        }

        request.log.info(
          {
            auditEvent: 'upload.finish',
            documentId: documentRecord.id,
            uploadId,
            userId: request.auth!.userId,
          },
          'Audit event',
        );

        return {
          document: {
            id: completedSession.documentId ?? documentRecord.id,
            processingStatus:
              completedSession.processingStatus ?? 'queued',
          },
          fileName: completedSession.fileName,
          fileSizeBytes: fileBuffer.byteLength,
          mimeType: completedSession.mimeType,
          status: 'uploaded',
          storage: {
            bucket: storedObject.bucket,
            key: storedObject.key,
            provider: 'r2',
          },
          uploadedAt: completedSession.uploadedAt ?? new Date().toISOString(),
          uploadId: completedSession.uploadId,
        };
      } catch (error) {
        if (reservedUploadId !== null) {
          await discardUploadSession(dependencies.redis, reservedUploadId);
        }

        return sendUploadError(reply, error);
      }
    },
  );
}

function sendUploadError(
  reply: FastifyReply,
  error: unknown,
) {
  if (error instanceof UploadConcurrencyLimitError) {
    return reply.status(429).send({
      message: error.message,
    });
  }

  if (error instanceof UploadValidationError) {
    return reply.status(error.statusCode).send({
      message: error.message,
    });
  }

  if (error instanceof z.ZodError) {
    return reply.status(400).send({
      message: error.issues[0]?.message ?? 'Invalid request body',
    });
  }

  if (error instanceof Error && error.name === 'RequestFileTooLargeError') {
    return reply.status(413).send({
      message: 'File size exceeds the 100MB upload limit',
    });
  }

  throw error;
}

function extractMultipartFieldValue(
  field: Multipart | Multipart[] | undefined,
): string | null {
  const normalizedField = Array.isArray(field) ? field[0] : field;

  if (
    normalizedField === undefined ||
    normalizedField.type !== 'field' ||
    typeof normalizedField.value !== 'string'
  ) {
    return null;
  }

  return normalizedField.value;
}
