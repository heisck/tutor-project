import { describe, expect, it } from 'vitest';

import {
  validateTraceability,
  checkAtuResolution,
} from '../src/knowledge/traceability.js';

type ValidateTraceabilityClient = Parameters<typeof validateTraceability>[0];
type CheckAtuResolutionClient = Parameters<typeof checkAtuResolution>[0];

function createMockPrisma(data: {
  atus?: Array<{ conceptId: string | null; id: string; sourceUnitId: string; title: string }>;
  segments?: Array<{ chunkIds: string[]; conceptId: string }>;
  unresolvedCount?: number;
}): ValidateTraceabilityClient & CheckAtuResolutionClient {
  const mockClient = {
    atomicTeachableUnit: {
      findMany: async () => data.atus ?? [],
    },
    concept: {
      findMany: async () => [],
    },
    coverageLedger: {
      count: async () => data.unresolvedCount ?? 0,
    },
    lessonSegment: {
      findMany: async () => data.segments ?? [],
    },
  };

  return mockClient as unknown as ValidateTraceabilityClient & CheckAtuResolutionClient;
}

describe('validateTraceability', () => {
  it('returns NOT_LESSON_READY when no ATUs exist', async () => {
    const prisma = createMockPrisma({ atus: [] });

    const result = await validateTraceability(prisma, {
      documentId: 'doc-1',
      userId: 'user-1',
    });

    expect(result.lessonReadiness).toBe('NOT_LESSON_READY');
    expect(result.totalAtus).toBe(0);
    expect(result.userMessage).toContain('missing structured teaching coverage');
  });

  it('returns LESSON_READY when all chains are complete', async () => {
    const prisma = createMockPrisma({
      atus: [
        { conceptId: 'c-1', id: 'atu-1', sourceUnitId: 'su-1', title: 'ATU 1' },
        { conceptId: 'c-2', id: 'atu-2', sourceUnitId: 'su-2', title: 'ATU 2' },
      ],
      segments: [
        { chunkIds: ['chunk-1'], conceptId: 'c-1' },
        { chunkIds: ['chunk-2'], conceptId: 'c-2' },
      ],
    });

    const result = await validateTraceability(prisma, {
      documentId: 'doc-1',
      userId: 'user-1',
    });

    expect(result.lessonReadiness).toBe('LESSON_READY');
    expect(result.brokenChains).toHaveLength(0);
    expect(result.traceableAtus).toBe(2);
    expect(result.userMessage).toBeNull();
  });

  it('detects ATU with no concept mapping', async () => {
    const prisma = createMockPrisma({
      atus: [
        { conceptId: null, id: 'atu-1', sourceUnitId: 'su-1', title: 'Orphan ATU' },
      ],
      segments: [],
    });

    const result = await validateTraceability(prisma, {
      documentId: 'doc-1',
      userId: 'user-1',
    });

    expect(result.lessonReadiness).toBe('NOT_LESSON_READY');
    expect(result.brokenChains).toHaveLength(1);
    expect(result.brokenChains[0]!.reasons).toContain('ATU is not mapped to any concept');
  });

  it('detects concept with no lesson segment', async () => {
    const prisma = createMockPrisma({
      atus: [
        { conceptId: 'c-1', id: 'atu-1', sourceUnitId: 'su-1', title: 'Concept without segment' },
      ],
      segments: [],
    });

    const result = await validateTraceability(prisma, {
      documentId: 'doc-1',
      userId: 'user-1',
    });

    expect(result.lessonReadiness).toBe('NOT_LESSON_READY');
    expect(result.brokenChains[0]!.reasons).toContain('Concept has no lesson segment');
  });

  it('detects lesson segment with no chunks', async () => {
    const prisma = createMockPrisma({
      atus: [
        { conceptId: 'c-1', id: 'atu-1', sourceUnitId: 'su-1', title: 'No chunks ATU' },
      ],
      segments: [{ chunkIds: [], conceptId: 'c-1' }],
    });

    const result = await validateTraceability(prisma, {
      documentId: 'doc-1',
      userId: 'user-1',
    });

    expect(result.lessonReadiness).toBe('NOT_LESSON_READY');
    expect(result.brokenChains[0]!.reasons).toContain('Lesson segment has no retrieval chunks');
  });

  it('reports mixed valid and broken chains correctly', async () => {
    const prisma = createMockPrisma({
      atus: [
        { conceptId: 'c-1', id: 'atu-1', sourceUnitId: 'su-1', title: 'Valid ATU' },
        { conceptId: null, id: 'atu-2', sourceUnitId: 'su-2', title: 'Broken ATU' },
      ],
      segments: [{ chunkIds: ['chunk-1'], conceptId: 'c-1' }],
    });

    const result = await validateTraceability(prisma, {
      documentId: 'doc-1',
      userId: 'user-1',
    });

    expect(result.lessonReadiness).toBe('NOT_LESSON_READY');
    expect(result.totalAtus).toBe(2);
    expect(result.traceableAtus).toBe(1);
    expect(result.brokenChains).toHaveLength(1);
  });
});

describe('checkAtuResolution', () => {
  it('returns allResolved true when no ATU IDs provided', async () => {
    const prisma = createMockPrisma({});

    const result = await checkAtuResolution(prisma, {
      atuIds: [],
      documentId: 'doc-1',
      userId: 'user-1',
    });

    expect(result.allResolved).toBe(true);
    expect(result.unresolvedCount).toBe(0);
  });

  it('returns allResolved true when all are resolved', async () => {
    const prisma = createMockPrisma({ unresolvedCount: 0 });

    const result = await checkAtuResolution(prisma, {
      atuIds: ['atu-1', 'atu-2'],
      documentId: 'doc-1',
      userId: 'user-1',
    });

    expect(result.allResolved).toBe(true);
  });

  it('returns allResolved false when some are unresolved', async () => {
    const prisma = createMockPrisma({ unresolvedCount: 2 });

    const result = await checkAtuResolution(prisma, {
      atuIds: ['atu-1', 'atu-2'],
      documentId: 'doc-1',
      userId: 'user-1',
    });

    expect(result.allResolved).toBe(false);
    expect(result.unresolvedCount).toBe(2);
  });
});
