import { z } from 'zod';
export declare const parserFormatSchema: z.ZodEnum<{
    pdf: "pdf";
    pptx: "pptx";
    docx: "docx";
}>;
export type ParserFormat = z.infer<typeof parserFormatSchema>;
export declare const sourceBoundingBoxSchema: z.ZodObject<{
    height: z.ZodNumber;
    width: z.ZodNumber;
    x: z.ZodNumber;
    y: z.ZodNumber;
}, z.core.$strip>;
export type SourceBoundingBox = z.infer<typeof sourceBoundingBoxSchema>;
export declare const sourceTraceSchema: z.ZodObject<{
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
export type SourceTrace = z.infer<typeof sourceTraceSchema>;
export declare const documentSectionKindSchema: z.ZodEnum<{
    text: "text";
    heading: "heading";
    list: "list";
    table: "table";
    formula: "formula";
    caption: "caption";
}>;
export type DocumentSectionKind = z.infer<typeof documentSectionKindSchema>;
export declare const documentAssetKindSchema: z.ZodEnum<{
    image: "image";
    diagram: "diagram";
}>;
export type DocumentAssetKind = z.infer<typeof documentAssetKindSchema>;
export declare const normalizedDocumentSectionSchema: z.ZodObject<{
    content: z.ZodString;
    kind: z.ZodEnum<{
        text: "text";
        heading: "heading";
        list: "list";
        table: "table";
        formula: "formula";
        caption: "caption";
    }>;
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
    title: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type NormalizedDocumentSection = z.infer<typeof normalizedDocumentSectionSchema>;
export declare const normalizedDocumentAssetSchema: z.ZodObject<{
    description: z.ZodOptional<z.ZodString>;
    height: z.ZodOptional<z.ZodNumber>;
    kind: z.ZodEnum<{
        image: "image";
        diagram: "diagram";
    }>;
    mimeType: z.ZodString;
    ordinal: z.ZodNumber;
    sectionOrdinal: z.ZodOptional<z.ZodNumber>;
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
    storageKey: z.ZodString;
    title: z.ZodOptional<z.ZodString>;
    width: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export type NormalizedDocumentAsset = z.infer<typeof normalizedDocumentAssetSchema>;
export declare const normalizedExtractionWarningCodeSchema: z.ZodEnum<{
    missing_extractable_text: "missing_extractable_text";
    low_confidence_caption: "low_confidence_caption";
    low_confidence_formula: "low_confidence_formula";
    low_confidence_table: "low_confidence_table";
    asset_storage_failed: "asset_storage_failed";
}>;
export type NormalizedExtractionWarningCode = z.infer<typeof normalizedExtractionWarningCodeSchema>;
export declare const normalizedExtractionWarningSchema: z.ZodObject<{
    code: z.ZodEnum<{
        missing_extractable_text: "missing_extractable_text";
        low_confidence_caption: "low_confidence_caption";
        low_confidence_formula: "low_confidence_formula";
        low_confidence_table: "low_confidence_table";
        asset_storage_failed: "asset_storage_failed";
    }>;
    message: z.ZodString;
    pageNumber: z.ZodOptional<z.ZodNumber>;
    sourceId: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type NormalizedExtractionWarning = z.infer<typeof normalizedExtractionWarningSchema>;
export declare const normalizedDocumentStructureSchema: z.ZodObject<{
    assets: z.ZodArray<z.ZodObject<{
        description: z.ZodOptional<z.ZodString>;
        height: z.ZodOptional<z.ZodNumber>;
        kind: z.ZodEnum<{
            image: "image";
            diagram: "diagram";
        }>;
        mimeType: z.ZodString;
        ordinal: z.ZodNumber;
        sectionOrdinal: z.ZodOptional<z.ZodNumber>;
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
        storageKey: z.ZodString;
        title: z.ZodOptional<z.ZodString>;
        width: z.ZodOptional<z.ZodNumber>;
    }, z.core.$strip>>;
    sections: z.ZodArray<z.ZodObject<{
        content: z.ZodString;
        kind: z.ZodEnum<{
            text: "text";
            heading: "heading";
            list: "list";
            table: "table";
            formula: "formula";
            caption: "caption";
        }>;
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
        title: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    warnings: z.ZodDefault<z.ZodArray<z.ZodObject<{
        code: z.ZodEnum<{
            missing_extractable_text: "missing_extractable_text";
            low_confidence_caption: "low_confidence_caption";
            low_confidence_formula: "low_confidence_formula";
            low_confidence_table: "low_confidence_table";
            asset_storage_failed: "asset_storage_failed";
        }>;
        message: z.ZodString;
        pageNumber: z.ZodOptional<z.ZodNumber>;
        sourceId: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>;
}, z.core.$strip>;
export type NormalizedDocumentStructure = z.infer<typeof normalizedDocumentStructureSchema>;
//# sourceMappingURL=tutoring-content.d.ts.map