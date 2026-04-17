import { randomUUID } from 'node:crypto';

import { type DatabaseClient, type Prisma } from '@ai-tutor-pwa/db';

import { chunkSourceUnits, type Chunk, type ChunkInput } from './chunking.js';
import type { EmbeddingClient } from './embedding-client.js';

export interface ChunkPipelineInput {
  documentId: string;
  userId: string;
}

export interface ChunkPipelineResult {
  chunkCount: number;
  embeddedCount: number;
}

export async function generateDocumentChunks(
  prisma: DatabaseClient,
  embeddingClient: EmbeddingClient | null,
  input: ChunkPipelineInput,
): Promise<ChunkPipelineResult> {
  const sourceUnits = await prisma.sourceUnit.findMany({
    orderBy: { ordinal: 'asc' },
    where: { documentId: input.documentId },
  });

  if (sourceUnits.length === 0) {
    return { chunkCount: 0, embeddedCount: 0 };
  }

  const chunkInputs: ChunkInput[] = sourceUnits.map((unit) => ({
    content: unit.content,
    sourceTrace: unit.sourceTrace,
    sourceUnitId: unit.id,
  }));

  const chunks = chunkSourceUnits(chunkInputs);

  if (chunks.length === 0) {
    return { chunkCount: 0, embeddedCount: 0 };
  }

  await persistChunks(prisma, {
    chunks,
    documentId: input.documentId,
    embeddings: null,
    userId: input.userId,
  });

  return { chunkCount: chunks.length, embeddedCount: 0 };
}

export async function backfillDocumentChunkEmbeddings(
  prisma: DatabaseClient,
  embeddingClient: EmbeddingClient | null,
  input: ChunkPipelineInput,
): Promise<ChunkPipelineResult> {
  if (embeddingClient === null) {
    return { chunkCount: 0, embeddedCount: 0 };
  }

  const chunks = await prisma.documentChunk.findMany({
    orderBy: { ordinal: 'asc' },
    select: {
      content: true,
      id: true,
    },
    where: {
      documentId: input.documentId,
      embedding: null,
      userId: input.userId,
    },
  });

  if (chunks.length === 0) {
    return { chunkCount: 0, embeddedCount: 0 };
  }

  let embeddings: number[][] | null = null;

  try {
    embeddings = await embeddingClient.generateEmbeddings(
      chunks.map((chunk) => chunk.content),
    );
  } catch {
    return { chunkCount: chunks.length, embeddedCount: 0 };
  }

  if (embeddings.length !== chunks.length) {
    return { chunkCount: chunks.length, embeddedCount: 0 };
  }

  await persistChunkEmbeddings(prisma, {
    chunkIds: chunks.map((chunk) => chunk.id),
    embeddings,
  });

  return { chunkCount: chunks.length, embeddedCount: embeddings.length };
}

async function persistChunks(
  prisma: DatabaseClient,
  input: {
    chunks: readonly Chunk[];
    documentId: string;
    embeddings: number[][] | null;
    userId: string;
  },
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // Clean up existing chunks (retry safety)
    await tx.documentChunk.deleteMany({
      where: { documentId: input.documentId, userId: input.userId },
    });

    // createMany doesn't support Unsupported types, so we use raw SQL for embedding vectors
    if (input.embeddings !== null && input.embeddings.length === input.chunks.length) {
      for (let i = 0; i < input.chunks.length; i++) {
        const chunk = input.chunks[i]!;
        const embedding = input.embeddings[i]!;
        const vectorStr = `[${embedding.join(',')}]`;

        await tx.$executeRaw`
          INSERT INTO "DocumentChunk" ("id", "documentId", "userId", "sourceUnitId", "ordinal", "content", "tokenCount", "embedding", "sourceTrace", "createdAt", "updatedAt")
          VALUES (
            ${randomUUID()},
            ${input.documentId},
            ${input.userId},
            ${chunk.sourceUnitId},
            ${i},
            ${chunk.content},
            ${chunk.tokenCount},
            ${vectorStr}::vector(1536),
            ${JSON.stringify(chunk.sourceTrace)}::jsonb,
            NOW(),
            NOW()
          )
        `;
      }
    } else {
      // No embeddings — use createMany (faster)
      await tx.documentChunk.createMany({
        data: input.chunks.map((chunk, ordinal) => ({
          content: chunk.content,
          documentId: input.documentId,
          ordinal,
          sourceTrace: chunk.sourceTrace as Prisma.InputJsonValue,
          sourceUnitId: chunk.sourceUnitId,
          tokenCount: chunk.tokenCount,
          userId: input.userId,
        })),
      });
    }
  }, {
    maxWait: 10_000,
    timeout: 120_000,
  });
}

async function persistChunkEmbeddings(
  prisma: DatabaseClient,
  input: {
    chunkIds: readonly string[];
    embeddings: readonly number[][];
  },
): Promise<void> {
  for (let i = 0; i < input.chunkIds.length; i++) {
    const chunkId = input.chunkIds[i]!;
    const embedding = input.embeddings[i]!;
    const vectorStr = `[${embedding.join(',')}]`;

    await prisma.$executeRaw`
      UPDATE "DocumentChunk"
      SET "embedding" = ${vectorStr}::vector(1536),
          "updatedAt" = NOW()
      WHERE "id" = ${chunkId}
    `;
  }
}
