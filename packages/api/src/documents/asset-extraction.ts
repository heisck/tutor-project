import type { DocumentAssetKind, SourceTrace } from '@ai-tutor-pwa/shared';

/**
 * Raw asset extracted during document parsing, before storage or description.
 */
export interface ExtractedDocumentAsset {
  buffer: Buffer;
  height?: number;
  kind: DocumentAssetKind;
  mimeType: string;
  sectionOrdinal?: number;
  sourceTrace: Omit<SourceTrace, 'order'>;
  title?: string;
  width?: number;
}

export interface DocumentExtractionResult {
  assets: readonly ExtractedDocumentAsset[];
  sections: readonly import('./normalized-structure.js').NormalizedSectionDraft[];
  warnings: readonly import('@ai-tutor-pwa/shared').NormalizedExtractionWarning[];
}

const IMAGE_EXTENSIONS_TO_MIME: ReadonlyMap<string, string> = new Map([
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.gif', 'image/gif'],
  ['.bmp', 'image/bmp'],
  ['.tiff', 'image/tiff'],
  ['.tif', 'image/tiff'],
  ['.svg', 'image/svg+xml'],
  ['.emf', 'image/x-emf'],
  ['.wmf', 'image/x-wmf'],
]);

const SUPPORTED_VISION_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
]);

export function resolveImageMimeType(filename: string): string | null {
  const extension = filename
    .slice(filename.lastIndexOf('.'))
    .toLowerCase();
  return IMAGE_EXTENSIONS_TO_MIME.get(extension) ?? null;
}

export function isVisionSupportedMimeType(mimeType: string): boolean {
  return SUPPORTED_VISION_MIME_TYPES.has(mimeType);
}
