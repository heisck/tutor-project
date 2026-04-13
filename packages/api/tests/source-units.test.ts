import { randomUUID } from 'node:crypto';

import {
  AuthProvider,
  DocumentAssetKind,
  DocumentProcessingStatus,
  DocumentSectionKind,
  type Prisma,
  SourceUnitCategory,
  createPrismaClient,
} from '@ai-tutor-pwa/db';
import { afterAll, afterEach, describe, expect, it } from 'vitest';

import { generateSourceUnits } from '../src/knowledge/source-units.js';
import { createApiTestEnv } from './test-env.js';

const env = createApiTestEnv();
const prisma = createPrismaClient({ DATABASE_URL: env.DATABASE_URL });
const testPrefix = `source-unit-${randomUUID()}`;

describe('source unit generation', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  afterEach(async () => {
    await prisma.user.deleteMany({
      where: { email: { startsWith: testPrefix } },
    });
  });

  it('generates ordered source units from persisted sections', async () => {
    const { document, user } = await createDocumentWithSections([
      { content: 'Introduction', kind: DocumentSectionKind.HEADING, title: 'Introduction' },
      { content: 'Cells are the basic unit of life.', kind: DocumentSectionKind.TEXT },
      { content: 'Step 1\nStep 2', kind: DocumentSectionKind.LIST },
    ]);

    const result = await generateSourceUnits(prisma, {
      documentId: document.id,
      userId: user.id,
    });

    expect(result.count).toBe(3);

    const units = await prisma.sourceUnit.findMany({
      orderBy: { ordinal: 'asc' },
      where: { documentId: document.id },
    });

    expect(units).toHaveLength(3);
    expect(units[0]!.category).toBe(SourceUnitCategory.HEADING);
    expect(units[0]!.content).toBe('Introduction');
    expect(units[0]!.title).toBe('Introduction');
    expect(units[0]!.ordinal).toBe(0);
    expect(units[0]!.sectionId).not.toBeNull();
    expect(units[0]!.assetId).toBeNull();
    expect(units[1]!.category).toBe(SourceUnitCategory.TEXT);
    expect(units[1]!.ordinal).toBe(1);
    expect(units[2]!.category).toBe(SourceUnitCategory.LIST);
    expect(units[2]!.ordinal).toBe(2);
  });

  it('includes described assets as visual source units', async () => {
    const { document, user } = await createDocumentWithSections([
      { content: 'A heading', kind: DocumentSectionKind.HEADING, title: 'A heading' },
    ]);

    const section = await prisma.documentSection.findFirst({
      where: { documentId: document.id },
    });

    await prisma.documentAsset.create({
      data: {
        description: 'A diagram showing cell mitosis.',
        documentId: document.id,
        kind: DocumentAssetKind.IMAGE,
        mimeType: 'image/png',
        ordinal: 0,
        sectionId: section!.id,
        sourceTrace: { format: 'pptx', headingPath: [], order: 0 } as unknown as Prisma.InputJsonValue,
        storageKey: 'users/test/assets/0.png',
        userId: user.id,
      },
    });

    const result = await generateSourceUnits(prisma, {
      documentId: document.id,
      userId: user.id,
    });

    expect(result.count).toBe(2);

    const units = await prisma.sourceUnit.findMany({
      orderBy: { ordinal: 'asc' },
      where: { documentId: document.id },
    });

    expect(units[0]!.category).toBe(SourceUnitCategory.HEADING);
    expect(units[1]!.category).toBe(SourceUnitCategory.VISUAL);
    expect(units[1]!.content).toBe('A diagram showing cell mitosis.');
    expect(units[1]!.assetId).not.toBeNull();
    expect(units[1]!.sectionId).toBe(section!.id);
  });

  it('skips assets without descriptions', async () => {
    const { document, user } = await createDocumentWithSections([
      { content: 'Body text', kind: DocumentSectionKind.TEXT },
    ]);

    await prisma.documentAsset.create({
      data: {
        documentId: document.id,
        kind: DocumentAssetKind.IMAGE,
        mimeType: 'image/png',
        ordinal: 0,
        sourceTrace: { format: 'docx', headingPath: [], order: 0 } as unknown as Prisma.InputJsonValue,
        storageKey: 'users/test/assets/0.png',
        userId: user.id,
      },
    });

    const result = await generateSourceUnits(prisma, {
      documentId: document.id,
      userId: user.id,
    });

    expect(result.count).toBe(1);
  });

  it('returns zero for documents with no sections or describable assets', async () => {
    const { document, user } = await createDocumentWithSections([]);

    const result = await generateSourceUnits(prisma, {
      documentId: document.id,
      userId: user.id,
    });

    expect(result.count).toBe(0);

    const units = await prisma.sourceUnit.findMany({
      where: { documentId: document.id },
    });
    expect(units).toEqual([]);
  });

  it('is idempotent on re-run without duplicates', async () => {
    const { document, user } = await createDocumentWithSections([
      { content: 'First', kind: DocumentSectionKind.TEXT },
      { content: 'Second', kind: DocumentSectionKind.TEXT },
    ]);

    await generateSourceUnits(prisma, { documentId: document.id, userId: user.id });
    await generateSourceUnits(prisma, { documentId: document.id, userId: user.id });

    const units = await prisma.sourceUnit.findMany({
      where: { documentId: document.id },
    });
    expect(units).toHaveLength(2);
  });

  it('preserves sourceTrace from the originating section', async () => {
    const { document, user } = await createDocumentWithSections([
      {
        content: 'Traced content',
        kind: DocumentSectionKind.TEXT,
        sourceTrace: { format: 'pdf', headingPath: ['Chapter 1'], order: 0, pageNumber: 3 },
      },
    ]);

    await generateSourceUnits(prisma, { documentId: document.id, userId: user.id });

    const units = await prisma.sourceUnit.findMany({
      where: { documentId: document.id },
    });

    const trace = units[0]!.sourceTrace as Record<string, unknown>;
    expect(trace.format).toBe('pdf');
    expect(trace.pageNumber).toBe(3);
    expect(trace.headingPath).toEqual(['Chapter 1']);
  });

  async function createDocumentWithSections(
    sectionDefs: Array<{
      content: string;
      kind: DocumentSectionKind;
      sourceTrace?: Record<string, unknown>;
      title?: string;
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
          title: def.title ?? null,
          userId: user.id,
        },
      });
    }

    return { document, user };
  }
});
