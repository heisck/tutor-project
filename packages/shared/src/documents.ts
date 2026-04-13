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
