import { randomUUID } from 'node:crypto';

import {
  AtuCategory,
  AtuDifficulty,
  AuthProvider,
  CoverageStatus,
  DocumentProcessingStatus,
  DocumentSectionKind,
  type Prisma,
  createPrismaClient,
} from '@ai-tutor-pwa/db';
import { afterAll, afterEach, describe, expect, it } from 'vitest';

import {
  initializeCoverageLedger,
  KnowledgeGraphIntegrityError,
  validateKnowledgeGraphIntegrity,
} from '../src/knowledge/coverage-ledger.js';
import { generateSourceUnits } from '../src/knowledge/source-units.js';
import { createApiTestEnv } from './test-env.js';

const env = createApiTestEnv();
const prisma = createPrismaClient({ DATABASE_URL: env.DATABASE_URL });
const testPrefix = `coverage-${randomUUID()}`;

describe('coverage ledger', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  afterEach(async () => {
    await prisma.user.deleteMany({
      where: { email: { startsWith: testPrefix } },
    });
  });

  it('initializes a NOT_TAUGHT entry for every ATU', async () => {
    const { document, user } = await createCompleteKnowledgeGraph();

    const result = await initializeCoverageLedger(prisma, {
      documentId: document.id,
      userId: user.id,
    });

    expect(result.atuCount).toBe(2);
    expect(result.ledgerEntries).toBe(2);

    const ledger = await prisma.coverageLedger.findMany({
      orderBy: { createdAt: 'asc' },
      where: { documentId: document.id },
    });

    expect(ledger).toHaveLength(2);
    for (const entry of ledger) {
      expect(entry.status).toBe(CoverageStatus.NOT_TAUGHT);
      expect(entry.userId).toBe(user.id);
      expect(entry.documentId).toBe(document.id);
      expect(entry.atuId).toBeTruthy();
    }
  });

  it('is idempotent on re-run', async () => {
    const { document, user } = await createCompleteKnowledgeGraph();

    await initializeCoverageLedger(prisma, { documentId: document.id, userId: user.id });
    await initializeCoverageLedger(prisma, { documentId: document.id, userId: user.id });

    const ledger = await prisma.coverageLedger.findMany({
      where: { documentId: document.id },
    });
    expect(ledger).toHaveLength(2);
  });

  it('fails integrity check when ATUs are not assigned to concepts', async () => {
    const { document, user } = await createGraphWithOrphanedAtus();

    await expect(
      validateKnowledgeGraphIntegrity(prisma, {
        documentId: document.id,
        userId: user.id,
      }),
    ).rejects.toThrow(KnowledgeGraphIntegrityError);
  });

  it('fails integrity check when source units have no ATUs', async () => {
    const { document, user } = await createGraphWithUncoveredSourceUnits();

    await expect(
      validateKnowledgeGraphIntegrity(prisma, {
        documentId: document.id,
        userId: user.id,
      }),
    ).rejects.toThrow(KnowledgeGraphIntegrityError);
  });

  it('initializeCoverageLedger blocks on integrity failure', async () => {
    const { document, user } = await createGraphWithOrphanedAtus();

    await expect(
      initializeCoverageLedger(prisma, {
        documentId: document.id,
        userId: user.id,
      }),
    ).rejects.toThrow(KnowledgeGraphIntegrityError);

    // No ledger entries should exist
    const ledger = await prisma.coverageLedger.findMany({
      where: { documentId: document.id },
    });
    expect(ledger).toHaveLength(0);
  });

  it('returns zero for documents with no ATUs and passes integrity (vacuously)', async () => {
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

    // Integrity check should pass (no ATUs, no source units, no violations)
    await validateKnowledgeGraphIntegrity(prisma, {
      documentId: document.id,
      userId: user.id,
    });

    const result = await initializeCoverageLedger(prisma, {
      documentId: document.id,
      userId: user.id,
    });

    expect(result.atuCount).toBe(0);
    expect(result.ledgerEntries).toBe(0);
  });

  async function createCompleteKnowledgeGraph() {
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
        processingStatus: DocumentProcessingStatus.COMPLETE,
        title: 'Test Doc',
        userId: user.id,
      },
    });

    // Sections → Source Units
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
          content: 'Mitosis divides cells.',
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

    // Concept
    const concept = await prisma.concept.create({
      data: {
        description: 'Cell biology basics',
        documentId: document.id,
        ordinal: 0,
        title: 'Cell Biology',
        userId: user.id,
      },
    });

    // ATUs linked to concept and source units
    await prisma.atomicTeachableUnit.createMany({
      data: [
        {
          category: AtuCategory.DEFINITION,
          conceptId: concept.id,
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
          conceptId: concept.id,
          content: 'Mitosis divides cells.',
          difficulty: AtuDifficulty.INTERMEDIATE,
          documentId: document.id,
          ordinal: 1,
          sourceTrace: sourceUnits[1]!.sourceTrace as unknown as Prisma.InputJsonValue,
          sourceUnitId: sourceUnits[1]!.id,
          title: 'Mitosis',
          userId: user.id,
        },
      ],
    });

    return { document, user };
  }

  async function createGraphWithOrphanedAtus() {
    const user = await prisma.user.create({
      data: {
        authProvider: AuthProvider.EMAIL,
        email: `${testPrefix}-orphan-${randomUUID()}@example.com`,
        passwordHash: 'hashed',
      },
    });

    const document = await prisma.document.create({
      data: {
        fileSize: 1024,
        fileType: 'application/pdf',
        fileUrl: 'r2://test/orphan.pdf',
        processingStatus: DocumentProcessingStatus.COMPLETE,
        title: 'Orphan Doc',
        userId: user.id,
      },
    });

    await prisma.documentSection.create({
      data: {
        content: 'Some content.',
        documentId: document.id,
        kind: DocumentSectionKind.TEXT,
        ordinal: 0,
        sourceTrace: { format: 'pdf', headingPath: [], order: 0, pageNumber: 1 } as unknown as Prisma.InputJsonValue,
        userId: user.id,
      },
    });

    await generateSourceUnits(prisma, { documentId: document.id, userId: user.id });
    const su = await prisma.sourceUnit.findFirst({ where: { documentId: document.id } });

    // ATU without concept assignment (conceptId = null)
    await prisma.atomicTeachableUnit.create({
      data: {
        category: AtuCategory.FACT,
        content: 'Orphaned fact.',
        difficulty: AtuDifficulty.INTRODUCTORY,
        documentId: document.id,
        ordinal: 0,
        sourceTrace: su!.sourceTrace as unknown as Prisma.InputJsonValue,
        sourceUnitId: su!.id,
        title: 'Orphaned ATU',
        userId: user.id,
      },
    });

    return { document, user };
  }

  async function createGraphWithUncoveredSourceUnits() {
    const user = await prisma.user.create({
      data: {
        authProvider: AuthProvider.EMAIL,
        email: `${testPrefix}-uncov-${randomUUID()}@example.com`,
        passwordHash: 'hashed',
      },
    });

    const document = await prisma.document.create({
      data: {
        fileSize: 1024,
        fileType: 'application/pdf',
        fileUrl: 'r2://test/uncovered.pdf',
        processingStatus: DocumentProcessingStatus.COMPLETE,
        title: 'Uncovered Doc',
        userId: user.id,
      },
    });

    // Create two sections → two source units
    await prisma.documentSection.createMany({
      data: [
        {
          content: 'First topic.',
          documentId: document.id,
          kind: DocumentSectionKind.TEXT,
          ordinal: 0,
          sourceTrace: { format: 'pdf', headingPath: [], order: 0, pageNumber: 1 } as unknown as Prisma.InputJsonValue,
          userId: user.id,
        },
        {
          content: 'Second topic with no ATUs.',
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

    // Concept + ATU only for the first source unit
    const concept = await prisma.concept.create({
      data: {
        description: 'First topic concept',
        documentId: document.id,
        ordinal: 0,
        title: 'First Topic',
        userId: user.id,
      },
    });

    await prisma.atomicTeachableUnit.create({
      data: {
        category: AtuCategory.FACT,
        conceptId: concept.id,
        content: 'First topic fact.',
        difficulty: AtuDifficulty.INTRODUCTORY,
        documentId: document.id,
        ordinal: 0,
        sourceTrace: sourceUnits[0]!.sourceTrace as unknown as Prisma.InputJsonValue,
        sourceUnitId: sourceUnits[0]!.id,
        title: 'First Topic Fact',
        userId: user.id,
      },
    });

    // Second source unit has NO ATUs → integrity violation

    return { document, user };
  }
});
