import {
  DocumentProcessingStatus as PrismaDocumentProcessingStatus,
  type DatabaseClient,
  type Document,
} from '@ai-tutor-pwa/db';
import type {
  DocumentProcessingStatus,
  DocumentStatusResponse,
} from '@ai-tutor-pwa/shared';

const allowedDocumentStatusTransitions: Record<
  PrismaDocumentProcessingStatus,
  PrismaDocumentProcessingStatus[]
> = {
  COMPLETE: [],
  EXTRACTING: [PrismaDocumentProcessingStatus.INDEXING, PrismaDocumentProcessingStatus.FAILED],
  FAILED: [PrismaDocumentProcessingStatus.RETRYING],
  INDEXING: [PrismaDocumentProcessingStatus.COMPLETE, PrismaDocumentProcessingStatus.FAILED],
  PENDING: [PrismaDocumentProcessingStatus.QUEUED, PrismaDocumentProcessingStatus.FAILED],
  PROCESSING: [PrismaDocumentProcessingStatus.EXTRACTING, PrismaDocumentProcessingStatus.FAILED],
  QUEUED: [PrismaDocumentProcessingStatus.PROCESSING, PrismaDocumentProcessingStatus.FAILED],
  RETRYING: [PrismaDocumentProcessingStatus.QUEUED, PrismaDocumentProcessingStatus.FAILED],
};

export async function createDocumentRecord(
  prisma: DatabaseClient,
  input: {
    fileSize: number;
    fileType: string;
    fileUrl: string;
    title: string;
    userId: string;
  },
): Promise<Document> {
  return prisma.document.create({
    data: {
      fileSize: input.fileSize,
      fileType: input.fileType,
      fileUrl: input.fileUrl,
      processingStatus: PrismaDocumentProcessingStatus.PENDING,
      title: input.title,
      userId: input.userId,
    },
  });
}

export async function getOwnedDocumentStatus(
  prisma: DatabaseClient,
  input: {
    documentId: string;
    uploadId?: string | null;
    userId: string;
  },
): Promise<DocumentStatusResponse | null> {
  const document = await prisma.document.findFirst({
    where: {
      id: input.documentId,
      userId: input.userId,
    },
  });

  if (document === null) {
    return null;
  }

  return toDocumentStatusResponse(document, input.uploadId ?? null);
}

export async function transitionDocumentProcessingStatus(
  prisma: DatabaseClient,
  input: {
    documentId: string;
    nextStatus: PrismaDocumentProcessingStatus;
  },
): Promise<Document> {
  const document = await prisma.document.findUnique({
    where: {
      id: input.documentId,
    },
  });

  if (document === null) {
    throw new DocumentStatusTransitionError('Document not found');
  }

  if (!canTransitionDocumentStatus(document.processingStatus, input.nextStatus)) {
    throw new DocumentStatusTransitionError(
      `Invalid document status transition: ${document.processingStatus} -> ${input.nextStatus}`,
    );
  }

  return prisma.document.update({
    data: {
      processingStatus: input.nextStatus,
    },
    where: {
      id: input.documentId,
    },
  });
}

export function mapDocumentProcessingStatus(
  status: PrismaDocumentProcessingStatus,
): DocumentProcessingStatus {
  switch (status) {
    case PrismaDocumentProcessingStatus.PENDING:
      return 'pending';
    case PrismaDocumentProcessingStatus.QUEUED:
      return 'queued';
    case PrismaDocumentProcessingStatus.PROCESSING:
      return 'processing';
    case PrismaDocumentProcessingStatus.EXTRACTING:
      return 'extracting';
    case PrismaDocumentProcessingStatus.INDEXING:
      return 'indexing';
    case PrismaDocumentProcessingStatus.COMPLETE:
      return 'complete';
    case PrismaDocumentProcessingStatus.FAILED:
      return 'failed';
    case PrismaDocumentProcessingStatus.RETRYING:
      return 'retrying';
  }
}

export function toDocumentStatusResponse(
  document: Pick<Document, 'id' | 'processingStatus' | 'title'>,
  uploadId: string | null,
): DocumentStatusResponse {
  return {
    documentId: document.id,
    fileName: document.title,
    processingStatus: mapDocumentProcessingStatus(document.processingStatus),
    uploadId,
  };
}

function canTransitionDocumentStatus(
  currentStatus: PrismaDocumentProcessingStatus,
  nextStatus: PrismaDocumentProcessingStatus,
): boolean {
  if (currentStatus === nextStatus) {
    return true;
  }

  if (nextStatus === PrismaDocumentProcessingStatus.FAILED) {
    return currentStatus !== PrismaDocumentProcessingStatus.COMPLETE;
  }

  return allowedDocumentStatusTransitions[currentStatus].includes(nextStatus);
}

export class DocumentStatusTransitionError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'DocumentStatusTransitionError';
  }
}
