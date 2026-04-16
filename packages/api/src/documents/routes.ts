import type { DatabaseClient } from '@ai-tutor-pwa/db';
import type {
  DocumentListItemResponse,
  DocumentStatusResponse,
  DocumentStructureResponse,
  UploadStatusResponse,
} from '@ai-tutor-pwa/shared';
import type { FastifyInstance } from 'fastify';

import { createRequireAuthPreHandler } from '../auth/session.js';
import type { ApiEnv } from '../config/env.js';
import { createUserRateLimitPreHandler } from '../lib/rate-limit.js';
import { getUploadSession } from '../upload/session-store.js';
import { DocumentProcessingStatus } from '@ai-tutor-pwa/db';
import { getOwnedDocumentStatus, mapDocumentProcessingStatus } from './service.js';
import type { RedisClient } from '../lib/redis.js';

interface DocumentRouteDependencies {
  env: ApiEnv;
  prisma: DatabaseClient;
  redis: RedisClient;
}

export async function registerDocumentRoutes(
  app: FastifyInstance,
  dependencies: DocumentRouteDependencies,
): Promise<void> {
  const requireAuth = createRequireAuthPreHandler(
    dependencies.prisma,
    dependencies.env,
  );
  const documentReadRateLimit = createUserRateLimitPreHandler(
    dependencies.redis,
    {
      keyPrefix: 'rate-limit:documents:read',
      limit: 120,
      timeWindowSeconds: 60,
    },
  );
  const documentWriteRateLimit = createUserRateLimitPreHandler(
    dependencies.redis,
    {
      keyPrefix: 'rate-limit:documents:write',
      limit: 30,
      timeWindowSeconds: 60,
    },
  );

  app.get(
    '/api/v1/documents',
    {
      preHandler: [requireAuth, documentReadRateLimit],
    },
    async (request): Promise<DocumentListItemResponse[]> => {
      const documents = await dependencies.prisma.document.findMany({
        orderBy: {
          createdAt: 'desc',
        },
        where: {
          userId: request.auth!.userId,
        },
      });

      return documents.map((document) => ({
        courseId: document.courseId,
        createdAt: document.createdAt.toISOString(),
        documentId: document.id,
        fileName: document.title,
        fileSize: document.fileSize,
        fileType: document.fileType,
        processingStatus: mapDocumentProcessingStatus(document.processingStatus),
        updatedAt: document.updatedAt.toISOString(),
      }));
    },
  );

  app.get(
    '/api/v1/uploads/:uploadId/status',
    {
      preHandler: [requireAuth, documentReadRateLimit],
    },
    async (request, reply): Promise<UploadStatusResponse | void> => {
      const uploadId = (request.params as { uploadId: string }).uploadId;
      const uploadSession = await getUploadSession(dependencies.redis, uploadId);

      if (uploadSession === null || uploadSession.userId !== request.auth!.userId) {
        return reply.status(404).send({
          message: 'Upload not found',
        });
      }

      return {
        documentId: uploadSession.documentId,
        fileName: uploadSession.fileName,
        processingStatus: uploadSession.processingStatus,
        status: uploadSession.status,
        uploadId: uploadSession.uploadId,
      };
    },
  );

  app.get(
    '/api/v1/documents/:documentId/status',
    {
      preHandler: [requireAuth, documentReadRateLimit],
    },
    async (request, reply): Promise<DocumentStatusResponse | void> => {
      const documentId = (request.params as { documentId: string }).documentId;
      const documentStatus = await getOwnedDocumentStatus(dependencies.prisma, {
        documentId,
        userId: request.auth!.userId,
      });

      if (documentStatus === null) {
        return reply.status(404).send({
          message: 'Document not found',
        });
      }

      return documentStatus;
    },
  );

  app.get(
    '/api/v1/documents/:documentId/structure',
    {
      preHandler: [requireAuth, documentReadRateLimit],
    },
    async (request, reply): Promise<DocumentStructureResponse | void> => {
      const documentId = (request.params as { documentId: string }).documentId;
      const userId = request.auth!.userId;

      const document = await dependencies.prisma.document.findFirst({
        where: {
          id: documentId,
          userId,
        },
      });

      if (document === null) {
        return reply.status(404).send({
          message: 'Document not found',
        });
      }

      const [sections, assets] = await Promise.all([
        dependencies.prisma.documentSection.findMany({
          orderBy: { ordinal: 'asc' },
          where: { documentId },
        }),
        dependencies.prisma.documentAsset.findMany({
          orderBy: { ordinal: 'asc' },
          where: { documentId },
        }),
      ]);

      return {
        assets: assets.map((asset) => ({
          ...(asset.description !== null ? { description: asset.description } : {}),
          ...(asset.height !== null ? { height: asset.height } : {}),
          kind: asset.kind.toLowerCase(),
          mimeType: asset.mimeType,
          ordinal: asset.ordinal,
          sourceTrace: asset.sourceTrace as Record<string, unknown>,
          storageKey: asset.storageKey,
          ...(asset.title !== null ? { title: asset.title } : {}),
          ...(asset.width !== null ? { width: asset.width } : {}),
        })),
        documentId,
        sections: sections.map((section) => ({
          content: section.content,
          kind: section.kind.toLowerCase(),
          ordinal: section.ordinal,
          sourceTrace: section.sourceTrace as Record<string, unknown>,
          ...(section.title !== null ? { title: section.title } : {}),
        })),
      };
    },
  );

  app.delete(
    '/api/v1/documents/:documentId',
    {
      preHandler: [requireAuth, documentWriteRateLimit],
    },
    async (request, reply): Promise<void> => {
      const documentId = (request.params as { documentId: string }).documentId;
      const userId = request.auth!.userId;

      const document = await dependencies.prisma.document.findFirst({
        select: { id: true, processingStatus: true },
        where: { id: documentId, userId },
      });

      if (document === null) {
        return reply.status(404).send({ message: 'Document not found' });
      }

      const deletableStatuses = new Set([
        DocumentProcessingStatus.FAILED,
        DocumentProcessingStatus.INDEXING,
        DocumentProcessingStatus.QUEUED,
        DocumentProcessingStatus.PROCESSING,
        DocumentProcessingStatus.EXTRACTING,
        DocumentProcessingStatus.RETRYING,
        DocumentProcessingStatus.PENDING,
      ]);

      if (!deletableStatuses.has(document.processingStatus)) {
        return reply.status(409).send({ message: 'Only non-complete documents can be deleted' });
      }

      await dependencies.prisma.document.delete({ where: { id: documentId } });

      return reply.status(204).send();
    },
  );
}
