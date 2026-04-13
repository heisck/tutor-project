import { randomUUID } from 'node:crypto';

import {
  AtuCategory,
  AtuDifficulty,
  AuthProvider,
  DocumentProcessingStatus,
  DocumentSectionKind,
  type Prisma,
  createPrismaClient,
} from '@ai-tutor-pwa/db';
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';

import {
  generateConceptGraph,
  type ConceptAnalyzerClient,
  type RawConceptGraph,
} from '../src/knowledge/concept-analyzer.js';
import { generateSourceUnits } from '../src/knowledge/source-units.js';
import { createApiTestEnv } from './test-env.js';

const env = createApiTestEnv();
const prisma = createPrismaClient({ DATABASE_URL: env.DATABASE_URL });
const testPrefix = `concept-${randomUUID()}`;

describe('concept analysis pipeline', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  afterEach(async () => {
    await prisma.user.deleteMany({
      where: { email: { startsWith: testPrefix } },
    });
  });

  it('groups ATUs into concepts with misconceptions and prerequisites', async () => {
    const { document, user, atuIds } = await createDocumentWithAtus();

    const mockGraph: RawConceptGraph = {
      concepts: [
        {
          atuIds: [atuIds[0]!],
          description: 'Understanding what cells are',
          misconceptions: [
            {
              description: 'Students think all cells look the same.',
              severity: 'medium',
              title: 'Uniform cell shape',
            },
          ],
          title: 'Cell Basics',
        },
        {
          atuIds: [atuIds[1]!],
          description: 'Understanding cell division',
          misconceptions: [],
          title: 'Cell Division',
        },
      ],
      prerequisites: [
        { dependentTitle: 'Cell Division', prerequisiteTitle: 'Cell Basics' },
      ],
    };

    const analyzer = createMockAnalyzer(mockGraph);

    const result = await generateConceptGraph(prisma, analyzer, {
      documentId: document.id,
      userId: user.id,
    });

    expect(result.conceptCount).toBe(2);
    expect(result.misconceptionCount).toBe(1);
    expect(result.prerequisiteCount).toBe(1);

    // Verify concepts
    const concepts = await prisma.concept.findMany({
      orderBy: { ordinal: 'asc' },
      where: { documentId: document.id },
    });
    expect(concepts).toHaveLength(2);
    expect(concepts[0]!.title).toBe('Cell Basics');
    expect(concepts[1]!.title).toBe('Cell Division');

    // Verify ATU-concept links
    const linkedAtus = await prisma.atomicTeachableUnit.findMany({
      where: { documentId: document.id, conceptId: { not: null } },
    });
    expect(linkedAtus).toHaveLength(2);

    // Verify misconception
    const misconceptions = await prisma.misconception.findMany({
      where: { documentId: document.id },
    });
    expect(misconceptions).toHaveLength(1);
    expect(misconceptions[0]!.title).toBe('Uniform cell shape');
    expect(misconceptions[0]!.severity).toBe('medium');

    // Verify prerequisite
    const prereqs = await prisma.conceptPrerequisite.findMany({
      where: { documentId: document.id },
    });
    expect(prereqs).toHaveLength(1);
    expect(prereqs[0]!.prerequisiteId).toBe(concepts[0]!.id);
    expect(prereqs[0]!.dependentId).toBe(concepts[1]!.id);
  });

  it('rejects concepts referencing non-existent ATU IDs', async () => {
    const { document, user } = await createDocumentWithAtus();

    const badGraph: RawConceptGraph = {
      concepts: [
        {
          atuIds: ['fake-atu-id-that-does-not-exist'],
          description: 'Invalid concept',
          misconceptions: [],
          title: 'Bad Concept',
        },
      ],
      prerequisites: [],
    };

    const analyzer = createMockAnalyzer(badGraph);

    const result = await generateConceptGraph(prisma, analyzer, {
      documentId: document.id,
      userId: user.id,
    });

    expect(result.conceptCount).toBe(0);
  });

  it('rejects self-referencing prerequisites', async () => {
    const { document, user, atuIds } = await createDocumentWithAtus();

    const selfRefGraph: RawConceptGraph = {
      concepts: [
        {
          atuIds: [...atuIds],
          description: 'All about cells',
          misconceptions: [],
          title: 'Cells',
        },
      ],
      prerequisites: [
        { dependentTitle: 'Cells', prerequisiteTitle: 'Cells' },
      ],
    };

    const analyzer = createMockAnalyzer(selfRefGraph);

    const result = await generateConceptGraph(prisma, analyzer, {
      documentId: document.id,
      userId: user.id,
    });

    expect(result.conceptCount).toBe(1);
    expect(result.prerequisiteCount).toBe(0);
  });

  it('returns zero for documents with no ATUs', async () => {
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

    const analyzer = createMockAnalyzer({ concepts: [], prerequisites: [] });

    const result = await generateConceptGraph(prisma, analyzer, {
      documentId: document.id,
      userId: user.id,
    });

    expect(result.conceptCount).toBe(0);
    expect(result.misconceptionCount).toBe(0);
    expect(result.prerequisiteCount).toBe(0);
  });

  it('is idempotent on re-run', async () => {
    const { document, user, atuIds } = await createDocumentWithAtus();

    const graph: RawConceptGraph = {
      concepts: [
        {
          atuIds: [...atuIds],
          description: 'Cell biology basics',
          misconceptions: [{ description: 'Common mistake', severity: 'low', title: 'Mistake' }],
          title: 'Cell Biology',
        },
      ],
      prerequisites: [],
    };

    const analyzer = createMockAnalyzer(graph);

    await generateConceptGraph(prisma, analyzer, { documentId: document.id, userId: user.id });
    await generateConceptGraph(prisma, analyzer, { documentId: document.id, userId: user.id });

    const concepts = await prisma.concept.findMany({ where: { documentId: document.id } });
    expect(concepts).toHaveLength(1);

    const misconceptions = await prisma.misconception.findMany({ where: { documentId: document.id } });
    expect(misconceptions).toHaveLength(1);
  });

  it('rejects prerequisites pointing to non-existent concepts', async () => {
    const { document, user, atuIds } = await createDocumentWithAtus();

    const graph: RawConceptGraph = {
      concepts: [
        {
          atuIds: [...atuIds],
          description: 'Cell biology',
          misconceptions: [],
          title: 'Cell Biology',
        },
      ],
      prerequisites: [
        { dependentTitle: 'Cell Biology', prerequisiteTitle: 'Nonexistent Concept' },
      ],
    };

    const analyzer = createMockAnalyzer(graph);

    const result = await generateConceptGraph(prisma, analyzer, {
      documentId: document.id,
      userId: user.id,
    });

    expect(result.conceptCount).toBe(1);
    expect(result.prerequisiteCount).toBe(0);
  });

  function createMockAnalyzer(graph: RawConceptGraph): ConceptAnalyzerClient {
    return {
      analyzeConceptGraph: vi.fn().mockResolvedValue(graph),
    };
  }

  async function createDocumentWithAtus() {
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

    // Create sections → source units → ATUs
    await prisma.documentSection.createMany({
      data: [
        {
          content: 'Cells are the basic unit of life.',
          documentId: document.id,
          kind: DocumentSectionKind.TEXT,
          ordinal: 0,
          sourceTrace: { format: 'pdf', headingPath: [], order: 0, pageNumber: 1 } as unknown as Prisma.InputJsonValue,
          userId: user.id,
        },
        {
          content: 'Mitosis is cell division.',
          documentId: document.id,
          kind: DocumentSectionKind.TEXT,
          ordinal: 1,
          sourceTrace: { format: 'pdf', headingPath: [], order: 1, pageNumber: 2 } as unknown as Prisma.InputJsonValue,
          userId: user.id,
        },
      ],
    });

    await generateSourceUnits(prisma, { documentId: document.id, userId: user.id });

    const sourceUnits = await prisma.sourceUnit.findMany({
      orderBy: { ordinal: 'asc' },
      where: { documentId: document.id },
    });

    // Create ATUs directly (bypassing LLM)
    await prisma.atomicTeachableUnit.createMany({
      data: [
        {
          category: AtuCategory.DEFINITION,
          content: 'A cell is the basic unit of life.',
          difficulty: AtuDifficulty.INTRODUCTORY,
          documentId: document.id,
          ordinal: 0,
          sourceTrace: sourceUnits[0]!.sourceTrace as unknown as Prisma.InputJsonValue,
          sourceUnitId: sourceUnits[0]!.id,
          title: 'Cell Definition',
          userId: user.id,
        },
        {
          category: AtuCategory.CONCEPT,
          content: 'Mitosis is a type of cell division.',
          difficulty: AtuDifficulty.INTERMEDIATE,
          documentId: document.id,
          ordinal: 1,
          sourceTrace: sourceUnits[1]!.sourceTrace as unknown as Prisma.InputJsonValue,
          sourceUnitId: sourceUnits[1]!.id,
          title: 'Mitosis Concept',
          userId: user.id,
        },
      ],
    });

    const atus = await prisma.atomicTeachableUnit.findMany({
      orderBy: { ordinal: 'asc' },
      where: { documentId: document.id },
    });

    return { atuIds: atus.map((a) => a.id), document, user };
  }
});
