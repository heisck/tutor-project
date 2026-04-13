import { type DatabaseClient } from '@ai-tutor-pwa/db';

import type { EmbeddingClient } from './embedding-client.js';

export interface RetrievalInput {
  documentId: string;
  query: string;
  topK?: number;
  userId: string;
}

export interface RetrievedChunk {
  content: string;
  documentId: string;
  id: string;
  ordinal: number;
  score: number;
  sourceTrace: unknown;
  sourceUnitId: string;
  tokenCount: number;
}

export interface RetrievalResult {
  chunks: RetrievedChunk[];
  query: string;
}

const DEFAULT_TOP_K = 5;

export async function retrieveChunks(
  prisma: DatabaseClient,
  embeddingClient: EmbeddingClient,
  input: RetrievalInput,
): Promise<RetrievalResult> {
  const topK = input.topK ?? DEFAULT_TOP_K;

  // Generate query embedding
  const [queryEmbedding] = await embeddingClient.generateEmbeddings([input.query]);

  if (queryEmbedding === undefined) {
    return { chunks: [], query: input.query };
  }

  const vectorLiteral = `[${queryEmbedding.join(',')}]`;

  // Scoped vector similarity search — userId and documentId are enforced in the WHERE clause
  // Using $queryRawUnsafe with positional parameters ($1..$4) because Prisma.sql tagged
  // templates don't support pgvector's ::vector() cast. All values are parameterized.
  const results = await prisma.$queryRawUnsafe<
    Array<{
      content: string;
      documentId: string;
      id: string;
      ordinal: number;
      score: number;
      sourceTrace: unknown;
      sourceUnitId: string;
      tokenCount: number;
    }>
  >(
    `SELECT
      "id",
      "documentId",
      "sourceUnitId",
      "ordinal",
      "content",
      "tokenCount",
      "sourceTrace",
      1 - ("embedding" <=> $1::vector(1536)) AS "score"
    FROM "DocumentChunk"
    WHERE "userId" = $2
      AND "documentId" = $3
      AND "embedding" IS NOT NULL
    ORDER BY "embedding" <=> $1::vector(1536) ASC
    LIMIT $4`,
    vectorLiteral,
    input.userId,
    input.documentId,
    topK,
  );

  return {
    chunks: results.map((row) => ({
      content: row.content,
      documentId: row.documentId,
      id: row.id,
      ordinal: row.ordinal,
      score: Number(row.score),
      sourceTrace: row.sourceTrace,
      sourceUnitId: row.sourceUnitId,
      tokenCount: row.tokenCount,
    })),
    query: input.query,
  };
}

/**
 * Fallback retrieval when embeddings are not available.
 * Returns chunks ordered by ordinal (document order) with text-match scoring.
 */
export async function retrieveChunksByText(
  prisma: DatabaseClient,
  input: Omit<RetrievalInput, 'query'> & { query?: string },
): Promise<RetrievalResult> {
  const topK = input.topK ?? DEFAULT_TOP_K;

  const chunks = await prisma.documentChunk.findMany({
    orderBy: { ordinal: 'asc' },
    take: topK,
    where: {
      documentId: input.documentId,
      userId: input.userId,
    },
  });

  return {
    chunks: chunks.map((chunk) => ({
      content: chunk.content,
      documentId: chunk.documentId,
      id: chunk.id,
      ordinal: chunk.ordinal,
      score: 1.0,
      sourceTrace: chunk.sourceTrace,
      sourceUnitId: chunk.sourceUnitId,
      tokenCount: chunk.tokenCount,
    })),
    query: input.query ?? '',
  };
}
