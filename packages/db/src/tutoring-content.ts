import type {
  DocumentAsset,
  DocumentSection,
  DocumentAssetKind,
  DocumentSectionKind,
  Prisma,
  PrismaClient,
} from '@prisma/client';

export interface CreateDocumentSectionInput {
  content: string;
  documentId: string;
  kind: DocumentSectionKind;
  ordinal: number;
  sourceTrace: Prisma.InputJsonValue;
  title?: string | null;
  userId: string;
}

export interface CreateDocumentAssetInput {
  description?: string | null;
  documentId: string;
  height?: number | null;
  kind: DocumentAssetKind;
  mimeType: string;
  ordinal: number;
  sectionId?: string | null;
  sourceTrace: Prisma.InputJsonValue;
  storageKey: string;
  title?: string | null;
  userId: string;
  width?: number | null;
}

export interface OwnedDocumentStructure {
  assets: DocumentAsset[];
  sections: DocumentSection[];
}

export async function createDocumentSections(
  prisma: PrismaClient,
  sections: readonly CreateDocumentSectionInput[],
): Promise<DocumentSection[]> {
  if (sections.length === 0) {
    return [];
  }

  return prisma.$transaction(
    sections.map((section) =>
      prisma.documentSection.create({
        data: {
          content: section.content,
          documentId: section.documentId,
          kind: section.kind,
          ordinal: section.ordinal,
          sourceTrace: section.sourceTrace,
          title: section.title ?? null,
          userId: section.userId,
        },
      }),
    ),
  );
}

export async function createDocumentAssets(
  prisma: PrismaClient,
  assets: readonly CreateDocumentAssetInput[],
): Promise<DocumentAsset[]> {
  if (assets.length === 0) {
    return [];
  }

  return prisma.$transaction(
    assets.map((asset) =>
      prisma.documentAsset.create({
        data: {
          description: asset.description ?? null,
          documentId: asset.documentId,
          height: asset.height ?? null,
          kind: asset.kind,
          mimeType: asset.mimeType,
          ordinal: asset.ordinal,
          sectionId: asset.sectionId ?? null,
          sourceTrace: asset.sourceTrace,
          storageKey: asset.storageKey,
          title: asset.title ?? null,
          userId: asset.userId,
          width: asset.width ?? null,
        },
      }),
    ),
  );
}

export async function getOwnedDocumentStructure(
  prisma: PrismaClient,
  input: {
    documentId: string;
    userId: string;
  },
): Promise<OwnedDocumentStructure | null> {
  const document = await prisma.document.findFirst({
    where: {
      id: input.documentId,
      userId: input.userId,
    },
    include: {
      assets: {
        orderBy: {
          ordinal: 'asc',
        },
      },
      sections: {
        orderBy: {
          ordinal: 'asc',
        },
      },
    },
  });

  if (document === null) {
    return null;
  }

  return {
    assets: document.assets,
    sections: document.sections,
  };
}
