import type { NormalizedDocumentStructure } from '@ai-tutor-pwa/shared';

import type { DocumentExtractionResult } from './asset-extraction.js';

export interface DocumentParserContext {
  documentId: string;
  fileBuffer: Buffer;
  fileType: string;
  storageKey: string;
  userId: string;
}

export interface DocumentParserAdapter {
  readonly name: string;
  readonly supportedMimeTypes: readonly string[];
  extract?(input: DocumentParserContext): Promise<DocumentExtractionResult>;
  parse(input: DocumentParserContext): Promise<NormalizedDocumentStructure>;
}

export class UnrecoverableDocumentParserError extends Error {
  public constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'UnrecoverableDocumentParserError';
  }
}

export function findDocumentParserAdapter(
  adapters: readonly DocumentParserAdapter[],
  mimeType: string,
): DocumentParserAdapter | null {
  return (
    adapters.find((adapter) => adapter.supportedMimeTypes.includes(mimeType)) ?? null
  );
}
