import { randomUUID } from 'node:crypto';

import {
  AuthProvider,
  DocumentProcessingStatus,
  DocumentSectionKind,
  type Prisma,
  createPrismaClient,
} from '@ai-tutor-pwa/db';
import { afterAll, afterEach, describe, expect, it } from 'vitest';

import { generateDocumentChunks } from '../src/knowledge/chunk-pipeline.js';
import { retrieveChunksByText } from '../src/knowledge/retrieval.js';
import { generateSourceUnits } from '../src/knowledge/source-units.js';
import { createApiTestEnv } from './test-env.js';

const env = createApiTestEnv();
const prisma = createPrismaClient({ DATABASE_URL: env.DATABASE_URL });
const testPrefix = `retrieval-${randomUUID()}`;

describe('retrieval service', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  afterEach(async () => {
    await prisma.user.deleteMany({
      where: { email: { startsWith: testPrefix } },
    });
  });

  it('returns chunks scoped to the correct user and document', async () => {
    const { document, user } = await createDocumentWithChunks([
      'First chunk of content about biology.',
      'Second chunk about cell division.',
      'Third chunk about mitosis phases.',
    ]);

    const result = await retrieveChunksByText(prisma, {
      documentId: document.id,
      userId: user.id,
    });

    expect(result.chunks).toHaveLength(3);
    expect(result.chunks[0]!.ordinal).toBe(0);
    expect(result.chunks[1]!.ordinal).toBe(1);
    expect(result.chunks[2]!.ordinal).toBe(2);
    for (const chunk of result.chunks) {
      expect(chunk.documentId).toBe(document.id);
    }
  });

  it('enforces user isolation — different user sees no chunks', async () => {
    const { document } = await createDocumentWithChunks([
      'Private content for user A.',
    ]);

    const otherUser = await prisma.user.create({
      data: {
        authProvider: AuthProvider.EMAIL,
        email: `${testPrefix}-other-${randomUUID()}@example.com`,
        passwordHash: 'hashed',
      },
    });

    const result = await retrieveChunksByText(prisma, {
      documentId: document.id,
      userId: otherUser.id,
    });

    expect(result.chunks).toHaveLength(0);
  });

  it('enforces document isolation — wrong document returns no chunks', async () => {
    const { user } = await createDocumentWithChunks([
      'Content in document A.',
    ]);

    const result = await retrieveChunksByText(prisma, {
      documentId: 'nonexistent-doc-id',
      userId: user.id,
    });

    expect(result.chunks).toHaveLength(0);
  });

  it('respects topK limit', async () => {
    const { document, user } = await createDocumentWithChunks([
      'Chunk one.',
      'Chunk two.',
      'Chunk three.',
      'Chunk four.',
      'Chunk five.',
    ]);

    const result = await retrieveChunksByText(prisma, {
      documentId: document.id,
      topK: 2,
      userId: user.id,
    });

    expect(result.chunks).toHaveLength(2);
  });

  it('returns empty result for documents with no chunks', async () => {
    const user = await prisma.user.create({
      data: {
        authProvider: AuthProvider.EMAIL,
        email: `${testPrefix}-empty-${randomUUID()}@example.com`,
        passwordHash: 'hashed',
      },
    });

    const document = await prisma.document.create({
      data: {
        fileSize: 1024,
        fileType: 'application/pdf',
        fileUrl: 'r2://test/empty.pdf',
        processingStatus: DocumentProcessingStatus.COMPLETE,
        title: 'Empty Doc',
        userId: user.id,
      },
    });

    const result = await retrieveChunksByText(prisma, {
      documentId: document.id,
      userId: user.id,
    });

    expect(result.chunks).toHaveLength(0);
  });

  it('includes metadata in retrieved chunks', async () => {
    const { document, user } = await createDocumentWithChunks([
      'Content with metadata.',
    ]);

    const result = await retrieveChunksByText(prisma, {
      documentId: document.id,
      userId: user.id,
    });

    const chunk = result.chunks[0]!;
    expect(chunk.id).toBeTruthy();
    expect(chunk.content).toBe('Content with metadata.');
    expect(chunk.tokenCount).toBeGreaterThan(0);
    expect(chunk.sourceUnitId).toBeTruthy();
    expect(chunk.sourceTrace).toBeTruthy();
    expect(chunk.score).toBe(1.0);
  });

  async function createDocumentWithChunks(contents: string[]) {
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

    for (let i = 0; i < contents.length; i++) {
      await prisma.documentSection.create({
        data: {
          content: contents[i]!,
          documentId: document.id,
          kind: DocumentSectionKind.TEXT,
          ordinal: i,
          sourceTrace: { format: 'pdf', headingPath: [], order: i, pageNumber: 1 } as unknown as Prisma.InputJsonValue,
          title: null,
          userId: user.id,
        },
      });
    }

    await generateSourceUnits(prisma, { documentId: document.id, userId: user.id });
    await generateDocumentChunks(prisma, null, { documentId: document.id, userId: user.id });

    return { document, user };
  }
});
