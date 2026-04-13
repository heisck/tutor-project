import { randomUUID } from 'node:crypto';

import {
  AuthProvider,
  DocumentProcessingStatus,
  createPrismaClient,
} from '@ai-tutor-pwa/db';
import type { NormalizedDocumentStructure } from '@ai-tutor-pwa/shared';
import { UnrecoverableError } from 'bullmq';
import { afterAll, afterEach, describe, expect, it } from 'vitest';

import type { DocumentParserAdapter } from '../src/documents/parsers.js';
import { transitionDocumentProcessingStatus } from '../src/documents/service.js';
import { createDocumentProcessingJobProcessor } from '../src/documents/worker.js';
import type { DocumentSourceStorageClient } from '../src/upload/storage/r2.js';
import { createApiTestEnv } from './test-env.js';

const env = createApiTestEnv();
const prismaClient = createPrismaClient({
  DATABASE_URL: env.DATABASE_URL,
});
const testPrefix = `document-worker-${randomUUID()}`;

describe('document processing worker', () => {
  afterAll(async () => {
    await prismaClient.$disconnect();
  });

  afterEach(async () => {
    await prismaClient.user.deleteMany({
      where: {
        email: {
          startsWith: testPrefix,
        },
      },
    });
  });

  it('dispatches a validated job to the matching parser using canonical document storage data', async () => {
    const sourceStorage = new InMemoryDocumentSourceStorageClient();
    const parser = new RecordingParserAdapter(['application/pdf']);
    const processor = createDocumentProcessingJobProcessor({
      parserAdapters: [parser],
      prisma: prismaClient,
      storageClient: sourceStorage,
    });
    const { document, user } = await createQueuedDocument('application/pdf', 'lesson.pdf');

    sourceStorage.store(`users/${user.id}/uploads/upload-1/lesson.pdf`, pdfBuffer());

    const result = await processor({
      attemptsMade: 0,
      data: {
        documentId: document.id,
      },
      opts: {
        attempts: 3,
      },
    });

    const refreshedDocument = await prismaClient.document.findUniqueOrThrow({
      where: {
        id: document.id,
      },
    });

    expect(result.parserName).toBe('recording-parser');
    expect(result.storageKey).toBe(`users/${user.id}/uploads/upload-1/lesson.pdf`);
    expect(parser.calls).toHaveLength(1);
    expect(parser.calls[0]?.documentId).toBe(document.id);
    expect(parser.calls[0]?.storageKey).toBe(
      `users/${user.id}/uploads/upload-1/lesson.pdf`,
    );
    expect(refreshedDocument.processingStatus).toBe(
      DocumentProcessingStatus.COMPLETE,
    );

    const sections = await prismaClient.documentSection.findMany({
      orderBy: { ordinal: 'asc' },
      where: { documentId: document.id },
    });
    expect(sections).toHaveLength(1);
    expect(sections[0]?.content).toBe('Parsed section');
    expect(sections[0]?.kind).toBe('TEXT');
    expect(sections[0]?.ordinal).toBe(0);
    expect(sections[0]?.userId).toBe(user.id);
  });

  it('persists sections safely on retry without duplicates', async () => {
    const sourceStorage = new InMemoryDocumentSourceStorageClient();
    const parser = new RecordingParserAdapter(['application/pdf']);
    const processor = createDocumentProcessingJobProcessor({
      parserAdapters: [parser],
      prisma: prismaClient,
      storageClient: sourceStorage,
    });
    const { document, user } = await createQueuedDocument('application/pdf', 'retry-persist.pdf');

    sourceStorage.store(`users/${user.id}/uploads/upload-1/retry-persist.pdf`, pdfBuffer());

    // First run succeeds
    await processor({
      attemptsMade: 0,
      data: { documentId: document.id },
      opts: { attempts: 3 },
    });

    // Simulate re-processing by resetting status
    await prismaClient.document.update({
      data: { processingStatus: DocumentProcessingStatus.QUEUED },
      where: { id: document.id },
    });

    // Second run should replace, not duplicate, sections
    await processor({
      attemptsMade: 1,
      data: { documentId: document.id },
      opts: { attempts: 3 },
    });

    const sections = await prismaClient.documentSection.findMany({
      where: { documentId: document.id },
    });
    expect(sections).toHaveLength(1);
  });

  it('rejects malformed payloads before any storage or parser work begins', async () => {
    const sourceStorage = new InMemoryDocumentSourceStorageClient();
    const parser = new RecordingParserAdapter(['application/pdf']);
    const processor = createDocumentProcessingJobProcessor({
      parserAdapters: [parser],
      prisma: prismaClient,
      storageClient: sourceStorage,
    });

    await expect(
      processor({
        attemptsMade: 0,
        data: {
          documentId: '',
        },
        opts: {
          attempts: 3,
        },
      }),
    ).rejects.toBeInstanceOf(UnrecoverableError);

    expect(parser.calls).toHaveLength(0);
    expect(sourceStorage.requestedKeys).toEqual([]);
  });

  it('moves documents into retrying and then failed states for retry-safe parser failures', async () => {
    const sourceStorage = new InMemoryDocumentSourceStorageClient();
    const parser = new ThrowingParserAdapter(['application/pdf']);
    const processor = createDocumentProcessingJobProcessor({
      parserAdapters: [parser],
      prisma: prismaClient,
      storageClient: sourceStorage,
    });
    const { document, user } = await createQueuedDocument('application/pdf', 'retry.pdf');

    sourceStorage.store(`users/${user.id}/uploads/upload-1/retry.pdf`, pdfBuffer());

    await expect(
      processor({
        attemptsMade: 0,
        data: {
          documentId: document.id,
        },
        opts: {
          attempts: 3,
        },
      }),
    ).rejects.toThrow('parser exploded');

    let refreshedDocument = await prismaClient.document.findUniqueOrThrow({
      where: {
        id: document.id,
      },
    });

    expect(refreshedDocument.processingStatus).toBe(DocumentProcessingStatus.RETRYING);

    await expect(
      processor({
        attemptsMade: 2,
        data: {
          documentId: document.id,
        },
        opts: {
          attempts: 3,
        },
      }),
    ).rejects.toThrow('parser exploded');

    refreshedDocument = await prismaClient.document.findUniqueOrThrow({
      where: {
        id: document.id,
      },
    });

    expect(refreshedDocument.processingStatus).toBe(DocumentProcessingStatus.FAILED);
  });
});

async function createQueuedDocument(fileType: string, title: string) {
  const user = await prismaClient.user.create({
    data: {
      authProvider: AuthProvider.EMAIL,
      email: `${testPrefix}-${title}@example.com`,
      passwordHash: 'hashed-password',
    },
  });

  const document = await prismaClient.document.create({
    data: {
      fileSize: 2048,
      fileType,
      fileUrl: `r2://test-private-bucket/users/${user.id}/uploads/upload-1/${title}`,
      processingStatus: DocumentProcessingStatus.PENDING,
      title,
      userId: user.id,
    },
  });

  await transitionDocumentProcessingStatus(prismaClient, {
    documentId: document.id,
    nextStatus: DocumentProcessingStatus.QUEUED,
  });

  return {
    document,
    user,
  };
}

function pdfBuffer(): Buffer {
  return Buffer.from('%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF');
}

class InMemoryDocumentSourceStorageClient implements DocumentSourceStorageClient {
  private readonly storage = new Map<string, Buffer>();
  public readonly requestedKeys: string[] = [];

  public async getObject(input: {
    key: string;
  }): Promise<{
    body: Buffer;
    bucket: string;
    key: string;
    metadata: Record<string, string>;
  }> {
    this.requestedKeys.push(input.key);
    const body = this.storage.get(input.key);

    if (body === undefined) {
      throw new Error(`Missing object for key ${input.key}`);
    }

    return {
      body,
      bucket: 'test-private-bucket',
      key: input.key,
      metadata: {},
    };
  }

  public store(key: string, body: Buffer): void {
    this.storage.set(key, body);
  }
}

class RecordingParserAdapter implements DocumentParserAdapter {
  public readonly calls: Array<{
    documentId: string;
    storageKey: string;
  }> = [];
  public readonly name = 'recording-parser';

  public constructor(public readonly supportedMimeTypes: readonly string[]) {}

  public async parse(input: {
    documentId: string;
    fileBuffer: Buffer;
    fileType: string;
    storageKey: string;
    userId: string;
  }): Promise<NormalizedDocumentStructure> {
    this.calls.push({
      documentId: input.documentId,
      storageKey: input.storageKey,
    });

    return {
      assets: [],
      sections: [
        {
          content: 'Parsed section',
          kind: 'text',
          ordinal: 0,
          sourceTrace: {
            format: 'pdf',
            headingPath: [],
            order: 0,
            pageNumber: 1,
          },
        },
      ],
      warnings: [],
    };
  }
}

class ThrowingParserAdapter implements DocumentParserAdapter {
  public readonly name = 'throwing-parser';

  public constructor(public readonly supportedMimeTypes: readonly string[]) {}

  public async parse(): Promise<NormalizedDocumentStructure> {
    throw new Error('parser exploded');
  }
}
