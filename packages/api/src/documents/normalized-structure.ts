import {
  normalizedDocumentStructureSchema,
  type DocumentSectionKind,
  type NormalizedDocumentAsset,
  type NormalizedDocumentSection,
  type NormalizedDocumentStructure,
  type NormalizedExtractionWarning,
} from '@ai-tutor-pwa/shared';

const CAPTION_REGEX = /^(?:figure|fig\.?|table)\s+\d+/i;
const FORMULA_REGEX = /[=+\-*/^<>≤≥±×÷√∑∫]/;
const LIST_REGEX = /^(?:[-*•]\s+|\d+[.)]\s+)/;

export type NormalizedAssetDraft = Omit<NormalizedDocumentAsset, 'ordinal'>;

export type NormalizedSectionDraft = Omit<NormalizedDocumentSection, 'ordinal'>;

export function finalizeNormalizedDocumentStructure(input: {
  assets?: readonly NormalizedAssetDraft[];
  sections: readonly NormalizedSectionDraft[];
  warnings?: readonly NormalizedExtractionWarning[];
}): NormalizedDocumentStructure {
  return normalizedDocumentStructureSchema.parse({
    assets: (input.assets ?? []).map((asset, ordinal) => ({
      ...asset,
      ordinal,
      sourceTrace: {
        ...asset.sourceTrace,
        order: ordinal,
      },
    })),
    sections: input.sections.map((section, ordinal) => ({
      ...section,
      ordinal,
      sourceTrace: {
        ...section.sourceTrace,
        order: ordinal,
      },
    })),
    warnings: [...(input.warnings ?? [])],
  });
}

export function createMissingExtractableTextWarning(input: {
  format: 'docx' | 'pdf' | 'pptx';
  message?: string;
  pageNumber?: number;
  slideNumber?: number;
  sourceId: string;
}): NormalizedExtractionWarning {
  return {
    code: 'missing_extractable_text',
    message:
      input.message ??
      'No extractable text was found in this document segment.',
    ...(input.pageNumber === undefined ? {} : { pageNumber: input.pageNumber }),
    sourceId: input.sourceId,
  };
}

export function isCaptionLikeText(text: string): boolean {
  return CAPTION_REGEX.test(text);
}

export function isFormulaLikeText(text: string): boolean {
  return FORMULA_REGEX.test(text) && text.length <= 120;
}

export function isListLikeText(text: string): boolean {
  return LIST_REGEX.test(text);
}

export function resolveTextSectionKind(input: {
  isExplicitCaption?: boolean;
  isExplicitFormula?: boolean;
  isExplicitHeading?: boolean;
  isExplicitList?: boolean;
  text: string;
}): DocumentSectionKind {
  if (input.isExplicitCaption || isCaptionLikeText(input.text)) {
    return 'caption';
  }

  if (input.isExplicitFormula || isFormulaLikeText(input.text)) {
    return 'formula';
  }

  if (input.isExplicitList || isListLikeText(input.text)) {
    return 'list';
  }

  if (input.isExplicitHeading) {
    return 'heading';
  }

  return 'text';
}
