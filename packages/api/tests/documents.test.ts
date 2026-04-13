import { randomUUID } from 'node:crypto';

import {
  DocumentProcessingStatus,
  createPrismaClient,
} from '@ai-tutor-pwa/db';
import { AUTH_PATHS } from '@ai-tutor-pwa/shared';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';

import { buildApp } from '../src/app.js';
import type { DocumentProcessingQueue } from '../src/documents/queue.js';
import { transitionDocumentProcessingStatus } from '../src/documents/service.js';
import { closeRedisClient, createRedisClient } from '../src/lib/redis.js';
import type { UploadStorageClient } from '../src/upload/storage/r2.js';
import { createApiTestEnv } from './test-env.js';

const baseEnv = createApiTestEnv();
const prismaClient = createPrismaClient({
  DATABASE_URL: baseEnv.DATABASE_URL,
});
const redisClient = createRedisClient(baseEnv);
const testPrefix = `document-test-${randomUUID()}`;

let app: Awaited<ReturnType<typeof buildApp>>;
let agent: ReturnType<typeof request.agent>;
let mockDocumentQueue: RecordingDocumentProcessingQueue;
let mockStorageClient: InMemoryUploadStorageClient;

beforeAll(async () => {
  await redisClient.ping();
});

afterAll(async () => {
  await closeRedisClient(redisClient);
  await prismaClient.$disconnect();
});

beforeEach(async () => {
  mockDocumentQueue = new RecordingDocumentProcessingQueue();
  mockStorageClient = new InMemoryUploadStorageClient();
  app = await buildApp({
    documentProcessingQueue: mockDocumentQueue,
    env: createApiTestEnv(),
    prismaClient,
    rateLimitKeyPrefix: `rate-limit:auth-document-test:${randomUUID()}`,
    redisClient,
    uploadStorageClient: mockStorageClient,
  });
  await app.ready();
  agent = request.agent(app.server);
});

afterEach(async () => {
  await app.close();
  await prismaClient.user.deleteMany({
    where: {
      email: {
        startsWith: testPrefix,
      },
    },
  });
});

describe('document records and processing status', () => {
  it('creates a document record after a successful upload', async () => {
    await signUp(agent, 'document-record');

    const finishResponse = await completeUpload(agent, 'document-record.pdf');

    expect(finishResponse.status).toBe(200);
    expect(finishResponse.body.document.processingStatus).toBe('queued');

    const document = await prismaClient.document.findUnique({
      where: {
        id: finishResponse.body.document.id,
      },
    });

    expect(document).not.toBeNull();
    expect(document?.processingStatus).toBe(DocumentProcessingStatus.QUEUED);
  });

  it('enqueues a processing job after upload completion', async () => {
    await signUp(agent, 'queue-enqueue');

    const finishResponse = await completeUpload(agent, 'queue-enqueue.pdf');

    expect(finishResponse.status).toBe(200);
    expect(mockDocumentQueue.jobs).toHaveLength(1);
    expect(mockDocumentQueue.jobs[0]).toMatchObject({
      documentId: finishResponse.body.document.id,
    });
  });

  it('returns document processing status for the owner', async () => {
    await signUp(agent, 'document-status');

    const finishResponse = await completeUpload(agent, 'document-status.pdf');
    const documentStatusResponse = await agent.get(
      `/api/v1/documents/${finishResponse.body.document.id}/status`,
    );
    const uploadStatusResponse = await agent.get(
      `/api/v1/uploads/${finishResponse.body.uploadId}/status`,
    );

    expect(documentStatusResponse.status).toBe(200);
    expect(documentStatusResponse.body).toMatchObject({
      documentId: finishResponse.body.document.id,
      processingStatus: 'queued',
      uploadId: null,
    });
    expect(uploadStatusResponse.status).toBe(200);
    expect(uploadStatusResponse.body).toMatchObject({
      documentId: finishResponse.body.document.id,
      processingStatus: 'queued',
      status: 'completed',
      uploadId: finishResponse.body.uploadId,
    });
  });

  it('rejects cross-user document status access', async () => {
    await signUp(agent, 'cross-user-a');
    const firstFinishResponse = await completeUpload(agent, 'cross-user-a.pdf');

    const secondAgent = request.agent(app.server);
    await signUp(secondAgent, 'cross-user-b');

    const response = await secondAgent.get(
      `/api/v1/documents/${firstFinishResponse.body.document.id}/status`,
    );

    expect(response.status).toBe(404);
  });

  it('handles invalid document IDs cleanly', async () => {
    await signUp(agent, 'invalid-document');

    const response = await agent.get('/api/v1/documents/does-not-exist/status');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      message: 'Document not found',
    });
  });

  it('supports the foundation processing-state transitions', async () => {
    await signUp(agent, 'transitions');
    const finishResponse = await completeUpload(agent, 'transitions.pdf');
    const documentId = finishResponse.body.document.id as string;

    const queuedDocument = await transitionDocumentProcessingStatus(prismaClient, {
      documentId,
      nextStatus: DocumentProcessingStatus.QUEUED,
    });
    const processingDocument = await transitionDocumentProcessingStatus(prismaClient, {
      documentId,
      nextStatus: DocumentProcessingStatus.PROCESSING,
    });
    const extractingDocument = await transitionDocumentProcessingStatus(prismaClient, {
      documentId,
      nextStatus: DocumentProcessingStatus.EXTRACTING,
    });
    const indexingDocument = await transitionDocumentProcessingStatus(prismaClient, {
      documentId,
      nextStatus: DocumentProcessingStatus.INDEXING,
    });
    const completedDocument = await transitionDocumentProcessingStatus(prismaClient, {
      documentId,
      nextStatus: DocumentProcessingStatus.COMPLETE,
    });

    expect(queuedDocument.processingStatus).toBe(DocumentProcessingStatus.QUEUED);
    expect(processingDocument.processingStatus).toBe(
      DocumentProcessingStatus.PROCESSING,
    );
    expect(extractingDocument.processingStatus).toBe(
      DocumentProcessingStatus.EXTRACTING,
    );
    expect(indexingDocument.processingStatus).toBe(DocumentProcessingStatus.INDEXING);
    expect(completedDocument.processingStatus).toBe(DocumentProcessingStatus.COMPLETE);
  });
});

async function signUp(
  testAgent: ReturnType<typeof request.agent>,
  label: string,
): Promise<void> {
  const response = await testAgent.post(AUTH_PATHS.signup).send({
    email: `${testPrefix}-${label}@example.com`,
    password: 'password123',
  });

  expect(response.status).toBe(201);
}

async function completeUpload(
  testAgent: ReturnType<typeof request.agent>,
  fileName: string,
) {
  const createResponse = await testAgent
    .post('/api/v1/uploads/create')
    .set('Origin', 'http://localhost:3000')
    .send({
      fileName,
      fileSizeBytes: pdfBuffer().byteLength,
      mimeType: 'application/pdf',
    });

  expect(createResponse.status).toBe(201);

  return testAgent
    .post('/api/v1/uploads/finish')
    .set('Origin', 'http://localhost:3000')
    .field('uploadId', createResponse.body.uploadId)
    .attach('file', pdfBuffer(), {
      contentType: 'application/pdf',
      filename: fileName,
    });
}

function pdfBuffer(): Buffer {
  return Buffer.from('%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF');
}

class InMemoryUploadStorageClient implements UploadStorageClient {
  public async putObject(input: {
    body: Buffer;
    contentLength: number;
    contentType: string;
    key: string;
    metadata: Record<string, string>;
  }): Promise<{
    bucket: string;
    key: string;
  }> {
    return {
      bucket: 'test-private-bucket',
      key: input.key,
    };
  }
}

class RecordingDocumentProcessingQueue implements DocumentProcessingQueue {
  public readonly jobs: Array<{
    documentId: string;
  }> = [];

  public async enqueue(input: {
    documentId: string;
  }): Promise<{
    jobId: string;
  }> {
    this.jobs.push(input);

    return {
      jobId: `${input.documentId}:job`,
    };
  }
}
