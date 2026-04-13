import {
  type DatabaseClient,
  type Prisma,
  DocumentAssetKind as PrismaDocumentAssetKind,
  DocumentSectionKind as PrismaDocumentSectionKind,
} from '@ai-tutor-pwa/db';
import type { NormalizedDocumentStructure } from '@ai-tutor-pwa/shared';

export async function persistNormalizedDocumentStructure(
  prisma: DatabaseClient,
  input: {
    documentId: string;
    structure: NormalizedDocumentStructure;
    userId: string;
  },
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // Clean up any existing sections/assets from previous attempts (retry safety)
    await tx.documentAsset.deleteMany({
      where: { documentId: input.documentId },
    });
    await tx.documentSection.deleteMany({
      where: { documentId: input.documentId },
    });

    // Persist sections
    if (input.structure.sections.length > 0) {
      await tx.documentSection.createMany({
        data: input.structure.sections.map((section) => ({
          content: section.content,
          documentId: input.documentId,
          kind: mapSectionKind(section.kind),
          ordinal: section.ordinal,
          sourceTrace: section.sourceTrace as unknown as Prisma.InputJsonValue,
          title: section.title ?? null,
          userId: input.userId,
        })),
      });
    }

    // Persist assets (need section IDs for linking)
    if (input.structure.assets.length > 0) {
      const sectionRecords = await tx.documentSection.findMany({
        orderBy: { ordinal: 'asc' },
        select: { id: true, ordinal: true },
        where: { documentId: input.documentId },
      });
      const sectionByOrdinal = new Map(
        sectionRecords.map((s) => [s.ordinal, s.id]),
      );

      await tx.documentAsset.createMany({
        data: input.structure.assets.map((asset) => ({
          description: asset.description ?? null,
          documentId: input.documentId,
          height: asset.height ?? null,
          kind: mapAssetKind(asset.kind),
          mimeType: asset.mimeType,
          ordinal: asset.ordinal,
          sectionId: asset.sectionOrdinal !== undefined
            ? sectionByOrdinal.get(asset.sectionOrdinal) ?? null
            : null,
          sourceTrace: asset.sourceTrace as unknown as Prisma.InputJsonValue,
          storageKey: asset.storageKey,
          title: asset.title ?? null,
          userId: input.userId,
          width: asset.width ?? null,
        })),
      });
    }
  });
}

function mapSectionKind(kind: string): PrismaDocumentSectionKind {
  switch (kind) {
    case 'text': return PrismaDocumentSectionKind.TEXT;
    case 'heading': return PrismaDocumentSectionKind.HEADING;
    case 'list': return PrismaDocumentSectionKind.LIST;
    case 'table': return PrismaDocumentSectionKind.TABLE;
    case 'formula': return PrismaDocumentSectionKind.FORMULA;
    case 'caption': return PrismaDocumentSectionKind.CAPTION;
    default: return PrismaDocumentSectionKind.TEXT;
  }
}

function mapAssetKind(kind: string): PrismaDocumentAssetKind {
  switch (kind) {
    case 'image': return PrismaDocumentAssetKind.IMAGE;
    case 'diagram': return PrismaDocumentAssetKind.DIAGRAM;
    default: return PrismaDocumentAssetKind.IMAGE;
  }
}
