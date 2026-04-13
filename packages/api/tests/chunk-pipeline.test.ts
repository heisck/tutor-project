import { randomUUID } from 'node:crypto';

import {
  AuthProvider,
  DocumentProcessingStatus,
  DocumentSectionKind,
  type Prisma,
  createPrismaClient,
} from '@ai-tutor-pwa/db';
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';

import { generateDocumentChunks } from '../src/knowledge/chunk-pipeline.js';
import type { EmbeddingClient } from '../src/knowledge/embedding-client.js';
import { generateSourceUnits } from '../src/knowledge/source-units.js';
import { createApiTestEnv } from './test-env.js';

const env = createApiTestEnv();
const prisma = createPrismaClient({ DATABASE_URL: env.DATABASE_URL });
const testPrefix = `chunk-pipe-${randomUUID()}`;

describe('chunk pipeline', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  afterEach(async () => {
    await prisma.user.deleteMany({
      where: { email: { startsWith: testPrefix } },
    });
  });

  it('generates chunks from source units and persists them', async () => {
    const { document, user } = await createDocumentWithSourceUnits([
      { content: 'Cells are the basic unit of life. They carry genetic material.', kind: DocumentSectionKind.TEXT },
      { content: 'Mitosis is the process of cell division.', kind: DocumentSectionKind.TEXT },
    ]);

    const result = await generateDocumentChunks(prisma, null, {
      documentId: document.id,
      userId: user.id,
    });

    expect(result.chunkCount).toBe(2);
    expect(result.embeddedCount).toBe(0);

    const chunks = await prisma.documentChunk.findMany({
      orderBy: { ordinal: 'asc' },
      where: { documentId: document.id },
    });

    expect(chunks).toHaveLength(2);
    expect(chunks[0]!.ordinal).toBe(0);
    expect(chunks[1]!.ordinal).toBe(1);
    expect(chunks[0]!.tokenCount).toBeGreaterThan(0);
    expect(chunks[0]!.sourceUnitId).toBeTruthy();
  });

  it('returns zero for documents with no source units', async () => {
    const { document, user } = await createDocumentWithSourceUnits([]);

    const result = await generateDocumentChunks(prisma, null, {
      documentId: document.id,
      userId: user.id,
    });

    expect(result.chunkCount).toBe(0);
    expect(result.embeddedCount).toBe(0);
  });

  it('is idempotent on re-run', async () => {
    const { document, user } = await createDocumentWithSourceUnits([
      { content: 'Some content here.', kind: DocumentSectionKind.TEXT },
    ]);

    await generateDocumentChunks(prisma, null, { documentId: document.id, userId: user.id });
    await generateDocumentChunks(prisma, null, { documentId: document.id, userId: user.id });

    const chunks = await prisma.documentChunk.findMany({
      where: { documentId: document.id },
    });
    expect(chunks).toHaveLength(1);
  });

  it('persists chunks without embeddings when embedding client fails', async () => {
    const { document, user } = await createDocumentWithSourceUnits([
      { content: 'Content for embedding test.', kind: DocumentSectionKind.TEXT },
    ]);

    const failingClient: EmbeddingClient = {
      generateEmbeddings: vi.fn().mockRejectedValue(new Error('API timeout')),
    };

    const result = await generateDocumentChunks(prisma, failingClient, {
      documentId: document.id,
      userId: user.id,
    });

    expect(result.chunkCount).toBe(1);
    expect(result.embeddedCount).toBe(0);

    const chunks = await prisma.documentChunk.findMany({
      where: { documentId: document.id },
    });
    expect(chunks).toHaveLength(1);
    // Unsupported vector fields are excluded from Prisma results
    // Absence of embedding is verified by the embeddedCount being 0
  });

  it('preserves sourceTrace from source units', async () => {
    const trace = { format: 'pdf', headingPath: ['Chapter 1'], order: 0, pageNumber: 5 };
    const { document, user } = await createDocumentWithSourceUnits([
      { content: 'Traced chunk content.', kind: DocumentSectionKind.TEXT, sourceTrace: trace },
    ]);

    await generateDocumentChunks(prisma, null, {
      documentId: document.id,
      userId: user.id,
    });

    const chunks = await prisma.documentChunk.findMany({
      where: { documentId: document.id },
    });

    const chunkTrace = chunks[0]!.sourceTrace as Record<string, unknown>;
    expect(chunkTrace.format).toBe('pdf');
    expect(chunkTrace.pageNumber).toBe(5);
    expect(chunkTrace.headingPath).toEqual(['Chapter 1']);
  });

  async function createDocumentWithSourceUnits(
    sectionDefs: Array<{
      content: string;
      kind: DocumentSectionKind;
      sourceTrace?: Record<string, unknown>;
    }>,
  ) {
    const user = await prisma.user.create({
      data: {
        authProvider: AuthProvider.EMAIL,
        email: `${testPrefix}-${randomUUID()}@example.com`,
        passwordHash: 'hashed',
      },
    });

    const document = await prisma.document.create({
      data: {
        fileSize: 1024,
        fileType: 'application/pdf',
        fileUrl: 'r2://test/file.pdf',
        processingStatus: DocumentProcessingStatus.INDEXING,
        title: 'Test Doc',
        userId: user.id,
      },
    });

    for (let i = 0; i < sectionDefs.length; i++) {
      const def = sectionDefs[i]!;
      await prisma.documentSection.create({
        data: {
          content: def.content,
          documentId: document.id,
          kind: def.kind,
          ordinal: i,
          sourceTrace: (def.sourceTrace ?? { format: 'pdf', headingPath: [], order: i, pageNumber: 1 }) as unknown as Prisma.InputJsonValue,
          title: null,
          userId: user.id,
        },
      });
    }

    // Generate source units from sections
    await generateSourceUnits(prisma, { documentId: document.id, userId: user.id });

    return { document, user };
  }
});
