import type { DocumentAsset, DocumentSection, DocumentAssetKind, DocumentSectionKind, Prisma, PrismaClient } from '@prisma/client';
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
export declare function createDocumentSections(prisma: PrismaClient, sections: readonly CreateDocumentSectionInput[]): Promise<DocumentSection[]>;
export declare function createDocumentAssets(prisma: PrismaClient, assets: readonly CreateDocumentAssetInput[]): Promise<DocumentAsset[]>;
export declare function getOwnedDocumentStructure(prisma: PrismaClient, input: {
    documentId: string;
    userId: string;
}): Promise<OwnedDocumentStructure | null>;
//# sourceMappingURL=tutoring-content.d.ts.map