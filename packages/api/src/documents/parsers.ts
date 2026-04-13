import type { NormalizedDocumentStructure } from '@ai-tutor-pwa/shared';

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
  parse(input: DocumentParserContext): Promise<NormalizedDocumentStructure>;
}

export function findDocumentParserAdapter(
  adapters: readonly DocumentParserAdapter[],
  mimeType: string,
): DocumentParserAdapter | null {
  return (
    adapters.find((adapter) => adapter.supportedMimeTypes.includes(mimeType)) ?? null
  );
}
