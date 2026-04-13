export type DocumentProcessingStatus =
  | 'pending'
  | 'queued'
  | 'processing'
  | 'extracting'
  | 'indexing'
  | 'complete'
  | 'failed'
  | 'retrying';

export interface DocumentStatusResponse {
  documentId: string;
  fileName: string;
  processingStatus: DocumentProcessingStatus;
  uploadId: string | null;
}

export interface DocumentStructureSection {
  content: string;
  kind: string;
  ordinal: number;
  sourceTrace: Record<string, unknown>;
  title?: string;
}

export interface DocumentStructureAsset {
  description?: string;
  height?: number;
  kind: string;
  mimeType: string;
  ordinal: number;
  sourceTrace: Record<string, unknown>;
  storageKey: string;
  title?: string;
  width?: number;
}

export interface DocumentStructureResponse {
  assets: readonly DocumentStructureAsset[];
  documentId: string;
  sections: readonly DocumentStructureSection[];
}
