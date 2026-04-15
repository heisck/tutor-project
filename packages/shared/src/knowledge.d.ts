import { z } from 'zod';
export declare const sourceUnitCategorySchema: z.ZodEnum<{
    text: "text";
    heading: "heading";
    list: "list";
    table: "table";
    formula: "formula";
    caption: "caption";
    visual: "visual";
}>;
export type SourceUnitCategory = z.infer<typeof sourceUnitCategorySchema>;
export declare const sourceUnitSchema: z.ZodObject<{
    assetId: z.ZodNullable<z.ZodString>;
    category: z.ZodEnum<{
        text: "text";
        heading: "heading";
        list: "list";
        table: "table";
        formula: "formula";
        caption: "caption";
        visual: "visual";
    }>;
    content: z.ZodString;
    documentId: z.ZodString;
    id: z.ZodString;
    ordinal: z.ZodNumber;
    sectionId: z.ZodNullable<z.ZodString>;
    sourceTrace: z.ZodObject<{
        boundingBox: z.ZodOptional<z.ZodObject<{
            height: z.ZodNumber;
            width: z.ZodNumber;
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.core.$strip>>;
        endOffset: z.ZodOptional<z.ZodNumber>;
        format: z.ZodEnum<{
            pdf: "pdf";
            pptx: "pptx";
            docx: "docx";
        }>;
        headingPath: z.ZodDefault<z.ZodArray<z.ZodString>>;
        order: z.ZodNumber;
        pageNumber: z.ZodOptional<z.ZodNumber>;
        slideNumber: z.ZodOptional<z.ZodNumber>;
        sourceId: z.ZodOptional<z.ZodString>;
        startOffset: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>;
    title: z.ZodOptional<z.ZodString>;
    userId: z.ZodString;
}, z.core.$strip>;
export type SourceUnitRecord = z.infer<typeof sourceUnitSchema>;
export declare const atuCategorySchema: z.ZodEnum<{
    concept: "concept";
    fact: "fact";
    procedure: "procedure";
    principle: "principle";
    definition: "definition";
}>;
export type AtuCategory = z.infer<typeof atuCategorySchema>;
export declare const atuDifficultySchema: z.ZodEnum<{
    introductory: "introductory";
    intermediate: "intermediate";
    advanced: "advanced";
}>;
export type AtuDifficulty = z.infer<typeof atuDifficultySchema>;
export declare const atuSchema: z.ZodObject<{
    category: z.ZodEnum<{
        concept: "concept";
        fact: "fact";
        procedure: "procedure";
        principle: "principle";
        definition: "definition";
    }>;
    content: z.ZodString;
    difficulty: z.ZodEnum<{
        introductory: "introductory";
        intermediate: "intermediate";
        advanced: "advanced";
    }>;
    documentId: z.ZodString;
    examRelevance: z.ZodBoolean;
    id: z.ZodString;
    isImplied: z.ZodBoolean;
    ordinal: z.ZodNumber;
    sourceTrace: z.ZodObject<{
        boundingBox: z.ZodOptional<z.ZodObject<{
            height: z.ZodNumber;
            width: z.ZodNumber;
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, z.core.$strip>>;
        endOffset: z.ZodOptional<z.ZodNumber>;
        format: z.ZodEnum<{
            pdf: "pdf";
            pptx: "pptx";
            docx: "docx";
        }>;
        headingPath: z.ZodDefault<z.ZodArray<z.ZodString>>;
        order: z.ZodNumber;
        pageNumber: z.ZodOptional<z.ZodNumber>;
        slideNumber: z.ZodOptional<z.ZodNumber>;
        sourceId: z.ZodOptional<z.ZodString>;
        startOffset: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>;
    sourceUnitId: z.ZodString;
    title: z.ZodString;
    userId: z.ZodString;
}, z.core.$strip>;
export type AtuRecord = z.infer<typeof atuSchema>;
//# sourceMappingURL=knowledge.d.ts.map