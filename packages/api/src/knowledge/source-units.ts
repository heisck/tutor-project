import {
  type DatabaseClient,
  type Prisma,
  SourceUnitCategory,
} from '@ai-tutor-pwa/db';

export async function generateSourceUnits(
  prisma: DatabaseClient,
  input: {
    documentId: string;
    userId: string;
  },
): Promise<{ count: number }> {
  const [sections, assets] = await Promise.all([
    prisma.documentSection.findMany({
      orderBy: { ordinal: 'asc' },
      where: { documentId: input.documentId },
    }),
    prisma.documentAsset.findMany({
      orderBy: { ordinal: 'asc' },
      where: { documentId: input.documentId },
    }),
  ]);

  const unitData: Array<{
    assetId: string | null;
    category: SourceUnitCategory;
    content: string;
    sectionId: string | null;
    sourceTrace: Prisma.InputJsonValue;
    title: string | null;
  }> = [];

  // Sections become source units in document order
  for (const section of sections) {
    unitData.push({
      assetId: null,
      category: mapSectionKindToCategory(section.kind),
      content: section.content,
      sectionId: section.id,
      sourceTrace: section.sourceTrace as Prisma.InputJsonValue,
      title: section.title,
    });
  }

  // Assets with descriptions become additional source units
  for (const asset of assets) {
    if (asset.description === null) {
      continue;
    }

    unitData.push({
      assetId: asset.id,
      category: SourceUnitCategory.VISUAL,
      content: asset.description,
      sectionId: asset.sectionId,
      sourceTrace: asset.sourceTrace as Prisma.InputJsonValue,
      title: asset.title,
    });
  }

  if (unitData.length === 0) {
    return { count: 0 };
  }

  await prisma.$transaction(async (tx) => {
    // Clean up any existing source units (retry safety)
    await tx.sourceUnit.deleteMany({
      where: { documentId: input.documentId },
    });

    await tx.sourceUnit.createMany({
      data: unitData.map((unit, ordinal) => ({
        assetId: unit.assetId,
        category: unit.category,
        content: unit.content,
        documentId: input.documentId,
        ordinal,
        sectionId: unit.sectionId,
        sourceTrace: unit.sourceTrace,
        title: unit.title,
        userId: input.userId,
      })),
    });
  });

  return { count: unitData.length };
}

function mapSectionKindToCategory(kind: string): SourceUnitCategory {
  switch (kind) {
    case 'TEXT': return SourceUnitCategory.TEXT;
    case 'HEADING': return SourceUnitCategory.HEADING;
    case 'LIST': return SourceUnitCategory.LIST;
    case 'TABLE': return SourceUnitCategory.TABLE;
    case 'FORMULA': return SourceUnitCategory.FORMULA;
    case 'CAPTION': return SourceUnitCategory.CAPTION;
    default: return SourceUnitCategory.TEXT;
  }
}
