import { z } from 'zod';
import { sourceTraceSchema } from './tutoring-content.js';
export const sourceUnitCategorySchema = z.enum([
    'text',
    'heading',
    'list',
    'table',
    'formula',
    'caption',
    'visual',
]);
export const sourceUnitSchema = z.object({
    assetId: z.string().min(1).nullable(),
    category: sourceUnitCategorySchema,
    content: z.string().min(1),
    documentId: z.string().min(1),
    id: z.string().min(1),
    ordinal: z.number().int().nonnegative(),
    sectionId: z.string().min(1).nullable(),
    sourceTrace: sourceTraceSchema,
    title: z.string().min(1).optional(),
    userId: z.string().min(1),
});
export const atuCategorySchema = z.enum([
    'concept',
    'fact',
    'procedure',
    'principle',
    'definition',
]);
export const atuDifficultySchema = z.enum([
    'introductory',
    'intermediate',
    'advanced',
]);
export const atuSchema = z.object({
    category: atuCategorySchema,
    content: z.string().min(1),
    difficulty: atuDifficultySchema,
    documentId: z.string().min(1),
    examRelevance: z.boolean(),
    id: z.string().min(1),
    isImplied: z.boolean(),
    ordinal: z.number().int().nonnegative(),
    sourceTrace: sourceTraceSchema,
    sourceUnitId: z.string().min(1),
    title: z.string().min(1),
    userId: z.string().min(1),
});
//# sourceMappingURL=knowledge.js.map