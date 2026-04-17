import { type DatabaseClient, DocumentProcessingStatus } from '@ai-tutor-pwa/db';
import { Worker, UnrecoverableError, type JobsOptions } from 'bullmq';
import type { ApiEnv } from '../config/env.js';
import type { DocumentSourceStorageClient, UploadStorageClient } from '../upload/storage/r2.js';
import { processExtractionResult, type AssetPipelineContext } from './asset-pipeline.js';
import {
  buildRedisConnectionOptions,
  DOCUMENT_PROCESSING_QUEUE_NAME,
  documentProcessingJobPayloadSchema,
  type DocumentProcessingJobPayload,
} from './queue.js';
import {
  findDocumentParserAdapter,
  type DocumentParserAdapter,
  UnrecoverableDocumentParserError,
} from './parsers.js';
import { generateAtus, type AtuMapperClient } from '../knowledge/atu-mapper.js';
import {
  backfillDocumentChunkEmbeddings,
  generateDocumentChunks,
} from '../knowledge/chunk-pipeline.js';
import { generateConceptGraph, type ConceptAnalyzerClient } from '../knowledge/concept-analyzer.js';
import { initializeCoverageLedger } from '../knowledge/coverage-ledger.js';
import type { EmbeddingClient } from '../knowledge/embedding-client.js';
import { generateSourceUnits } from '../knowledge/source-units.js';
import { writeStructuredLog } from '../lib/structured-log.js';
import { persistNormalizedDocumentStructure } from './persistence.js';
import { transitionDocumentProcessingStatus } from './service.js';
import type { VisionDescriptionClient } from './vision-client.js';

interface JobLike {
  attemptsMade: number;
  data: unknown;
  opts: JobsOptions;
}

export interface DocumentProcessingWorkerDependencies {
  assetStorageClient?: UploadStorageClient;
  atuMapperClient?: AtuMapperClient | null;
  conceptAnalyzerClient?: ConceptAnalyzerClient | null;
  embeddingClient?: EmbeddingClient | null;
  env: Pick<ApiEnv, 'REDIS_URL'>;
  parserAdapters: readonly DocumentParserAdapter[];
  prisma: DatabaseClient;
  storageClient: DocumentSourceStorageClient;
  visionClient?: VisionDescriptionClient | null;
}

export interface DocumentProcessingWorkerHandle {
  close(): Promise<void>;
}

export interface DocumentProcessingResult {
  parserName: string;
  storageKey: string;
}

class BullMqDocumentProcessingWorker implements DocumentProcessingWorkerHandle {
  private readonly worker: Worker<DocumentProcessingJobPayload, DocumentProcessingResult>;

  public constructor(dependencies: DocumentProcessingWorkerDependencies) {
    const processor = createDocumentProcessingJobProcessor(dependencies);

    this.worker = new Worker<DocumentProcessingJobPayload, DocumentProcessingResult>(
      DOCUMENT_PROCESSING_QUEUE_NAME,
      async (job) => processor(job),
      {
        connection: buildRedisConnectionOptions(dependencies.env.REDIS_URL),
      },
    );
  }

  public async close(): Promise<void> {
    await this.worker.close();
  }
}

export function createDocumentProcessingWorker(
  dependencies: DocumentProcessingWorkerDependencies,
): DocumentProcessingWorkerHandle {
  return new BullMqDocumentProcessingWorker(dependencies);
}

export function createDocumentProcessingJobProcessor(
  dependencies: Omit<DocumentProcessingWorkerDependencies, 'env'>,
): (job: JobLike) => Promise<DocumentProcessingResult> {
  return async (job) => {
    const payload = documentProcessingJobPayloadSchema.safeParse(job.data);

    if (!payload.success) {
      throw new UnrecoverableError('Invalid document processing job payload');
    }

    const document = await dependencies.prisma.document.findUnique({
      where: {
        id: payload.data.documentId,
      },
    });

    if (document === null) {
      throw new UnrecoverableError('Document not found for processing');
    }

    try {
      await moveDocumentIntoProcessing(dependencies.prisma, document.id, document.processingStatus);

      const storageLocation = parseR2StorageLocation(document.fileUrl);
      const sourceFile = await dependencies.storageClient.getObject({
        key: storageLocation.key,
      });
      const parser = findDocumentParserAdapter(
        dependencies.parserAdapters,
        document.fileType,
      );

      if (parser === null) {
        throw new UnsupportedDocumentParserError(document.fileType);
      }

      await transitionDocumentProcessingStatus(dependencies.prisma, {
        documentId: document.id,
        nextStatus: DocumentProcessingStatus.EXTRACTING,
      });

      const parserContext = {
        documentId: document.id,
        fileBuffer: sourceFile.body,
        fileType: document.fileType,
        storageKey: storageLocation.key,
        userId: document.userId,
      };

      let structure;

      if (parser.extract !== undefined && dependencies.assetStorageClient !== undefined) {
        const extraction = await parser.extract(parserContext);
        const assetContext: AssetPipelineContext = {
          documentId: document.id,
          storageClient: dependencies.assetStorageClient,
          userId: document.userId,
          visionClient: dependencies.visionClient ?? null,
        };
        structure = await processExtractionResult(extraction, assetContext);
      } else {
        structure = await parser.parse(parserContext);
      }

      await transitionDocumentProcessingStatus(dependencies.prisma, {
        documentId: document.id,
        nextStatus: DocumentProcessingStatus.INDEXING,
      });

      await persistNormalizedDocumentStructure(dependencies.prisma, {
        documentId: document.id,
        structure,
        userId: document.userId,
      });

      await generateSourceUnits(dependencies.prisma, {
        documentId: document.id,
        userId: document.userId,
      });

      await generateDocumentChunks(
        dependencies.prisma,
        null,
        {
          documentId: document.id,
          userId: document.userId,
        },
      );

      if (dependencies.atuMapperClient != null) {
        await generateAtus(
          dependencies.prisma,
          dependencies.atuMapperClient,
          { documentId: document.id, userId: document.userId },
        );

        if (dependencies.conceptAnalyzerClient != null) {
          await generateConceptGraph(
            dependencies.prisma,
            dependencies.conceptAnalyzerClient,
            { documentId: document.id, userId: document.userId },
          );

          await initializeCoverageLedger(dependencies.prisma, {
            documentId: document.id,
            userId: document.userId,
          });
        }
      }

      await transitionDocumentProcessingStatus(dependencies.prisma, {
        documentId: document.id,
        nextStatus: DocumentProcessingStatus.COMPLETE,
      });

      if (dependencies.embeddingClient !== null && dependencies.embeddingClient !== undefined) {
        void backfillDocumentChunkEmbeddings(
          dependencies.prisma,
          dependencies.embeddingClient,
          {
            documentId: document.id,
            userId: document.userId,
          },
        )
          .then((result) => {
            if (result.embeddedCount > 0) {
              writeStructuredLog('info', 'document_embedding_backfill', {
                documentId: document.id,
                embeddedCount: result.embeddedCount,
                chunkCount: result.chunkCount,
              });
            }
          })
          .catch((error) => {
            writeStructuredLog('warn', 'document_embedding_backfill', {
              documentId: document.id,
              message: error instanceof Error ? error.message : String(error),
              outcome: 'failed',
            });
          });
      }

      return {
        parserName: parser.name,
        storageKey: storageLocation.key,
      };
    } catch (error) {
      const workerError = normalizeDocumentProcessingError(error);
      await markDocumentProcessingFailure(
        dependencies.prisma,
        document.id,
        workerError,
        job.attemptsMade,
        job.opts.attempts,
      );
      throw workerError;
    }
  };
}

export function createDocumentWorkerEntryPoint(
  dependencies: DocumentProcessingWorkerDependencies,
): DocumentProcessingWorkerHandle {
  return createDocumentProcessingWorker(dependencies);
}

async function moveDocumentIntoProcessing(
  prisma: DatabaseClient,
  documentId: string,
  currentStatus: DocumentProcessingStatus,
): Promise<void> {
  if (currentStatus === DocumentProcessingStatus.PENDING) {
    await transitionDocumentProcessingStatus(prisma, {
      documentId,
      nextStatus: DocumentProcessingStatus.QUEUED,
    });
  } else if (currentStatus === DocumentProcessingStatus.RETRYING) {
    await transitionDocumentProcessingStatus(prisma, {
      documentId,
      nextStatus: DocumentProcessingStatus.QUEUED,
    });
  }

  await transitionDocumentProcessingStatus(prisma, {
    documentId,
    nextStatus: DocumentProcessingStatus.PROCESSING,
  });
}

async function markDocumentProcessingFailure(
  prisma: DatabaseClient,
  documentId: string,
  error: unknown,
  attemptsMade: number,
  attemptsConfigured?: number,
): Promise<void> {
  await transitionDocumentProcessingStatus(prisma, {
    documentId,
    nextStatus: DocumentProcessingStatus.FAILED,
  });

  if (error instanceof UnrecoverableError) {
    return;
  }

  const maxAttempts = attemptsConfigured ?? 1;
  const nextAttemptNumber = attemptsMade + 1;

  if (nextAttemptNumber < maxAttempts) {
    await transitionDocumentProcessingStatus(prisma, {
      documentId,
      nextStatus: DocumentProcessingStatus.RETRYING,
    });
  }
}

function parseR2StorageLocation(fileUrl: string): {
  bucket: string;
  key: string;
} {
  const parsedUrl = new URL(fileUrl);

  if (parsedUrl.protocol !== 'r2:') {
    throw new UnrecoverableError('Document source must be stored in R2');
  }

  const key = parsedUrl.pathname.replace(/^\/+/, '');

  if (parsedUrl.hostname === '' || key === '') {
    throw new UnrecoverableError('Document source location is invalid');
  }

  return {
    bucket: parsedUrl.hostname,
    key,
  };
}

export class UnsupportedDocumentParserError extends UnrecoverableError {
  public constructor(fileType: string) {
    super(`Unsupported document file type for processing: ${fileType}`);
    this.name = 'UnsupportedDocumentParserError';
  }
}

function normalizeDocumentProcessingError(error: unknown): unknown {
  if (
    error instanceof UnrecoverableError ||
    !(error instanceof UnrecoverableDocumentParserError)
  ) {
    return error;
  }

  return new UnrecoverableError(error.message);
}
