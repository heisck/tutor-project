import type {
  DocumentAssetKind,
  NormalizedExtractionWarning,
  SourceTrace,
} from '@ai-tutor-pwa/shared';

import type { NormalizedSectionDraft } from './normalized-structure.js';

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
  sections: readonly NormalizedSectionDraft[];
  warnings: readonly NormalizedExtractionWarning[];
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

const MIME_TO_EXTENSION: ReadonlyMap<string, string> = new Map(
  [...IMAGE_EXTENSIONS_TO_MIME.entries()].map(([ext, mime]) => [mime, ext.slice(1)]),
);

export function isVisionSupportedMimeType(mimeType: string): boolean {
  return SUPPORTED_VISION_MIME_TYPES.has(mimeType);
}

export function mimeTypeToExtension(mimeType: string): string {
  return MIME_TO_EXTENSION.get(mimeType) ?? 'bin';
}
