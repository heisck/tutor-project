import {
  AtuCategory,
  AtuDifficulty,
  DocumentProcessingStatus,
  DocumentSectionKind,
  type DatabaseClient,
  type CoverageStatus,
  type Document,
  type Prisma,
} from '@ai-tutor-pwa/db';

import { initializeCoverageLedger } from '../../src/knowledge/coverage-ledger.js';
import { generateDocumentChunks } from '../../src/knowledge/chunk-pipeline.js';
import { generateSourceUnits } from '../../src/knowledge/source-units.js';

export interface TestKnowledgeConceptInput {
  coverageStatus?: CoverageStatus;
  description: string;
  sectionContent: string;
  title: string;
  prerequisiteTitles?: readonly string[];
}

export async function createDocumentWithKnowledgeGraph(
  prisma: DatabaseClient,
  input: {
    concepts: readonly TestKnowledgeConceptInput[];
    title: string;
    userId: string;
  },
): Promise<{
  conceptIdsByTitle: ReadonlyMap<string, string>;
  document: Document;
}> {
  const document = await prisma.document.create({
    data: {
      fileSize: 2048,
      fileType: 'application/pdf',
      fileUrl: `r2://bucket/users/${input.userId}/documents/${input.title}`,
      processingStatus: DocumentProcessingStatus.COMPLETE,
      title: input.title,
      userId: input.userId,
    },
  });

  for (let index = 0; index < input.concepts.length; index++) {
    const concept = input.concepts[index]!;

    await prisma.documentSection.create({
      data: {
        content: concept.sectionContent,
        documentId: document.id,
        kind: DocumentSectionKind.TEXT,
        ordinal: index,
        sourceTrace: createSourceTrace(index),
        title: concept.title,
        userId: input.userId,
      },
    });
  }

  await generateSourceUnits(prisma, {
    documentId: document.id,
    userId: input.userId,
  });
  await generateDocumentChunks(prisma, null, {
    documentId: document.id,
    userId: input.userId,
  });

  const sourceUnits = await prisma.sourceUnit.findMany({
    orderBy: {
      ordinal: 'asc',
    },
    where: {
      documentId: document.id,
      userId: input.userId,
    },
  });

  const conceptIdsByTitle = new Map<string, string>();
  const atuIdsByTitle = new Map<string, string>();

  for (let index = 0; index < input.concepts.length; index++) {
    const conceptInput = input.concepts[index]!;
    const sourceUnit = sourceUnits[index];

    if (sourceUnit === undefined) {
      throw new Error(`Missing generated source unit for concept "${conceptInput.title}"`);
    }

    const concept = await prisma.concept.create({
      data: {
        description: conceptInput.description,
        documentId: document.id,
        ordinal: index,
        title: conceptInput.title,
        userId: input.userId,
      },
    });

    conceptIdsByTitle.set(concept.title, concept.id);

    const atu = await prisma.atomicTeachableUnit.create({
      data: {
        category: AtuCategory.CONCEPT,
        conceptId: concept.id,
        content: conceptInput.sectionContent,
        difficulty: AtuDifficulty.INTRODUCTORY,
        documentId: document.id,
        ordinal: index,
        sourceTrace: sourceUnit.sourceTrace as Prisma.InputJsonValue,
        sourceUnitId: sourceUnit.id,
        title: `${conceptInput.title} ATU`,
        userId: input.userId,
      },
    });

    atuIdsByTitle.set(conceptInput.title, atu.id);
  }

  for (const conceptInput of input.concepts) {
    for (const prerequisiteTitle of conceptInput.prerequisiteTitles ?? []) {
      const prerequisiteId = conceptIdsByTitle.get(prerequisiteTitle);
      const dependentId = conceptIdsByTitle.get(conceptInput.title);

      if (prerequisiteId === undefined || dependentId === undefined) {
        throw new Error(
          `Missing prerequisite linkage for "${prerequisiteTitle}" -> "${conceptInput.title}"`,
        );
      }

      await prisma.conceptPrerequisite.create({
        data: {
          dependentId,
          documentId: document.id,
          prerequisiteId,
        },
      });
    }
  }

  await initializeCoverageLedger(prisma, {
    documentId: document.id,
    userId: input.userId,
  });

  for (const conceptInput of input.concepts) {
    if (conceptInput.coverageStatus === undefined) {
      continue;
    }

    const atuId = atuIdsByTitle.get(conceptInput.title);

    if (atuId === undefined) {
      throw new Error(`Missing ATU for concept "${conceptInput.title}"`);
    }

    await prisma.coverageLedger.updateMany({
      data: {
        status: conceptInput.coverageStatus,
      },
      where: {
        atuId,
        documentId: document.id,
        userId: input.userId,
      },
    });
  }

  return {
    conceptIdsByTitle,
    document,
  };
}

function createSourceTrace(order: number): Prisma.InputJsonValue {
  return {
    format: 'pdf',
    headingPath: [],
    order,
    pageNumber: order + 1,
  } satisfies Prisma.InputJsonObject;
}
