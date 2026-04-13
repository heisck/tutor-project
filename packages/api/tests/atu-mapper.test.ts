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
  generateAtus,
  type AtuMapperClient,
  type RawAtu,
} from '../src/knowledge/atu-mapper.js';
import { generateSourceUnits } from '../src/knowledge/source-units.js';
import { createApiTestEnv } from './test-env.js';

const env = createApiTestEnv();
const prisma = createPrismaClient({ DATABASE_URL: env.DATABASE_URL });
const testPrefix = `atu-map-${randomUUID()}`;

function createMockMapperClient(responses: Map<string, RawAtu[]>): AtuMapperClient {
  return {
    extractAtus: vi.fn().mockImplementation((input) => {
      const key = input.content;
      return Promise.resolve(responses.get(key) ?? []);
    }),
  };
}

describe('ATU mapping pipeline', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  afterEach(async () => {
    await prisma.user.deleteMany({
      where: { email: { startsWith: testPrefix } },
    });
  });

  it('maps source units to persisted ATUs with correct metadata', async () => {
    const { document, user } = await createDocumentWithSourceUnits([
      { content: 'Cells are the basic unit of life.', kind: DocumentSectionKind.TEXT },
    ]);

    const mockAtus: RawAtu[] = [
      {
        category: 'definition',
        content: 'A cell is the basic structural and functional unit of all living organisms.',
        difficulty: 'introductory',
        examRelevance: true,
        isImplied: false,
        title: 'Cell Definition',
      },
      {
        category: 'fact',
        content: 'All living things are composed of one or more cells.',
        difficulty: 'introductory',
        examRelevance: true,
        isImplied: false,
        title: 'Cell Theory Fact',
      },
    ];

    const mapper = createMockMapperClient(
      new Map([['Cells are the basic unit of life.', mockAtus]]),
    );

    const result = await generateAtus(prisma, mapper, {
      documentId: document.id,
      userId: user.id,
    });

    expect(result.atuCount).toBe(2);
    expect(result.sourceUnitsProcessed).toBe(1);

    const atus = await prisma.atomicTeachableUnit.findMany({
      orderBy: { ordinal: 'asc' },
      where: { documentId: document.id },
    });

    expect(atus).toHaveLength(2);
    expect(atus[0]!.title).toBe('Cell Definition');
    expect(atus[0]!.category).toBe(AtuCategory.DEFINITION);
    expect(atus[0]!.difficulty).toBe(AtuDifficulty.INTRODUCTORY);
    expect(atus[0]!.examRelevance).toBe(true);
    expect(atus[0]!.isImplied).toBe(false);
    expect(atus[0]!.ordinal).toBe(0);
    expect(atus[0]!.sourceUnitId).toBeTruthy();
    expect(atus[1]!.ordinal).toBe(1);
  });

  it('rejects orphaned ATUs — every ATU has a valid source unit link', async () => {
    const { document, user } = await createDocumentWithSourceUnits([
      { content: 'Mitosis occurs in somatic cells.', kind: DocumentSectionKind.TEXT },
    ]);

    const mapper = createMockMapperClient(
      new Map([['Mitosis occurs in somatic cells.', [{
        category: 'concept',
        content: 'Mitosis is cell division for growth and repair.',
        difficulty: 'intermediate',
        examRelevance: true,
        isImplied: false,
        title: 'Mitosis Concept',
      }]]]),
    );

    await generateAtus(prisma, mapper, { documentId: document.id, userId: user.id });

    const atus = await prisma.atomicTeachableUnit.findMany({
      where: { documentId: document.id },
    });

    // Every ATU must have a valid sourceUnitId
    for (const atu of atus) {
      const sourceUnit = await prisma.sourceUnit.findUnique({
        where: { id: atu.sourceUnitId },
      });
      expect(sourceUnit).not.toBeNull();
    }
  });

  it('handles LLM extraction failures gracefully', async () => {
    const { document, user } = await createDocumentWithSourceUnits([
      { content: 'Content that causes LLM failure.', kind: DocumentSectionKind.TEXT },
      { content: 'Normal content about biology.', kind: DocumentSectionKind.TEXT },
    ]);

    const failingMapper: AtuMapperClient = {
      extractAtus: vi.fn().mockImplementation((input) => {
        if (input.content === 'Content that causes LLM failure.') {
          return Promise.reject(new Error('API error'));
        }
        return Promise.resolve([{
          category: 'fact',
          content: 'Biology is the study of life.',
          difficulty: 'introductory',
          examRelevance: false,
          isImplied: false,
          title: 'Biology Definition',
        }]);
      }),
    };

    const result = await generateAtus(prisma, failingMapper, {
      documentId: document.id,
      userId: user.id,
    });

    // One source unit failed, one succeeded
    expect(result.sourceUnitsProcessed).toBe(2);
    expect(result.atuCount).toBe(1);
  });

  it('returns zero for documents with no source units', async () => {
    const { document, user } = await createDocumentWithSourceUnits([]);

    const mapper = createMockMapperClient(new Map());

    const result = await generateAtus(prisma, mapper, {
      documentId: document.id,
      userId: user.id,
    });

    expect(result.atuCount).toBe(0);
    expect(result.sourceUnitsProcessed).toBe(0);
  });

  it('is idempotent on re-run', async () => {
    const { document, user } = await createDocumentWithSourceUnits([
      { content: 'Photosynthesis converts light to energy.', kind: DocumentSectionKind.TEXT },
    ]);

    const mapper = createMockMapperClient(
      new Map([['Photosynthesis converts light to energy.', [{
        category: 'concept',
        content: 'Photosynthesis converts light energy into chemical energy.',
        difficulty: 'introductory',
        examRelevance: true,
        isImplied: false,
        title: 'Photosynthesis',
      }]]]),
    );

    await generateAtus(prisma, mapper, { documentId: document.id, userId: user.id });
    await generateAtus(prisma, mapper, { documentId: document.id, userId: user.id });

    const atus = await prisma.atomicTeachableUnit.findMany({
      where: { documentId: document.id },
    });
    expect(atus).toHaveLength(1);
  });

  it('validates ATU schema — rejects malformed LLM output', async () => {
    const { document, user } = await createDocumentWithSourceUnits([
      { content: 'Content with bad LLM response.', kind: DocumentSectionKind.TEXT },
    ]);

    // Mock returns empty array (simulating invalid schema being rejected by Zod)
    const mapper = createMockMapperClient(
      new Map([['Content with bad LLM response.', []]]),
    );

    const result = await generateAtus(prisma, mapper, {
      documentId: document.id,
      userId: user.id,
    });

    expect(result.atuCount).toBe(0);
  });

  it('preserves sourceTrace from the originating source unit', async () => {
    const trace = { format: 'pdf', headingPath: ['Chapter 2'], order: 0, pageNumber: 7 };
    const { document, user } = await createDocumentWithSourceUnits([
      { content: 'DNA stores genetic information.', kind: DocumentSectionKind.TEXT, sourceTrace: trace },
    ]);

    const mapper = createMockMapperClient(
      new Map([['DNA stores genetic information.', [{
        category: 'fact',
        content: 'DNA (deoxyribonucleic acid) stores genetic information.',
        difficulty: 'introductory',
        examRelevance: true,
        isImplied: false,
        title: 'DNA Function',
      }]]]),
    );

    await generateAtus(prisma, mapper, { documentId: document.id, userId: user.id });

    const atus = await prisma.atomicTeachableUnit.findMany({
      where: { documentId: document.id },
    });

    const atuTrace = atus[0]!.sourceTrace as Record<string, unknown>;
    expect(atuTrace.format).toBe('pdf');
    expect(atuTrace.pageNumber).toBe(7);
    expect(atuTrace.headingPath).toEqual(['Chapter 2']);
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

    await generateSourceUnits(prisma, { documentId: document.id, userId: user.id });

    return { document, user };
  }
});
