import type { DocumentProcessingStatus } from './documents.js';

export const UPLOAD_PATHS = {
  create: '/api/v1/uploads/create',
  finish: '/api/v1/uploads/finish',
  validate: '/api/v1/uploads/validate',
} as const;

export interface UploadValidationResponse {
  extension: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  valid: true;
}

export interface UploadCreateResponse {
  expiresAt: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  status: 'created';
  storage: {
    bucket: string;
    key: string;
    provider: 'r2';
  };
  uploadId: string;
}

export interface UploadStatusResponse {
  documentId: string | null;
  fileName: string;
  processingStatus: DocumentProcessingStatus | null;
  status: 'completed' | 'created';
  uploadId: string;
}

export interface UploadFinishResponse {
  document: {
    id: string;
    processingStatus: DocumentProcessingStatus;
  };
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  status: 'uploaded';
  storage: {
    bucket: string;
    key: string;
    provider: 'r2';
  };
  uploadedAt: string;
  uploadId: string;
}
