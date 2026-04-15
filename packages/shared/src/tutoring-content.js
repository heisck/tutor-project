import { z } from 'zod';
export const parserFormatSchema = z.enum(['pdf', 'pptx', 'docx']);
export const sourceBoundingBoxSchema = z.object({
    height: z.number().positive(),
    width: z.number().positive(),
    x: z.number().nonnegative(),
    y: z.number().nonnegative(),
});
export const sourceTraceSchema = z.object({
    boundingBox: sourceBoundingBoxSchema.optional(),
    endOffset: z.number().int().nonnegative().optional(),
    format: parserFormatSchema,
    headingPath: z.array(z.string().min(1)).default([]),
    order: z.number().int().nonnegative(),
    pageNumber: z.number().int().positive().optional(),
    slideNumber: z.number().int().positive().optional(),
    sourceId: z.string().min(1).optional(),
    startOffset: z.number().int().nonnegative().optional(),
});
export const documentSectionKindSchema = z.enum([
    'text',
    'heading',
    'list',
    'table',
    'formula',
    'caption',
]);
export const documentAssetKindSchema = z.enum(['image', 'diagram']);
export const normalizedDocumentSectionSchema = z.object({
    content: z.string().min(1),
    kind: documentSectionKindSchema,
    ordinal: z.number().int().nonnegative(),
    sourceTrace: sourceTraceSchema,
    title: z.string().min(1).optional(),
});
export const normalizedDocumentAssetSchema = z.object({
    description: z.string().min(1).optional(),
    height: z.number().int().positive().optional(),
    kind: documentAssetKindSchema,
    mimeType: z.string().min(1),
    ordinal: z.number().int().nonnegative(),
    sectionOrdinal: z.number().int().nonnegative().optional(),
    sourceTrace: sourceTraceSchema,
    storageKey: z.string().min(1),
    title: z.string().min(1).optional(),
    width: z.number().int().positive().optional(),
});
export const normalizedExtractionWarningCodeSchema = z.enum([
    'missing_extractable_text',
    'low_confidence_caption',
    'low_confidence_formula',
    'low_confidence_table',
    'asset_storage_failed',
]);
export const normalizedExtractionWarningSchema = z.object({
    code: normalizedExtractionWarningCodeSchema,
    message: z.string().min(1),
    pageNumber: z.number().int().positive().optional(),
    sourceId: z.string().min(1).optional(),
});
export const normalizedDocumentStructureSchema = z.object({
    assets: z.array(normalizedDocumentAssetSchema),
    sections: z.array(normalizedDocumentSectionSchema),
    warnings: z.array(normalizedExtractionWarningSchema).default([]),
});
//# sourceMappingURL=tutoring-content.js.map