import { randomUUID } from 'node:crypto';

import {
  DocumentProcessingStatus,
  DocumentSectionKind,
  createPrismaClient,
} from '@ai-tutor-pwa/db';
import { AUTH_HEADER_NAMES, AUTH_PATHS } from '@ai-tutor-pwa/shared';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';

import { buildApp } from '../src/app.js';
import type { DocumentProcessingQueue } from '../src/documents/queue.js';
import { transitionDocumentProcessingStatus } from '../src/documents/service.js';
import { closeRedisClient, createRedisClient } from '../src/lib/redis.js';
import type { UploadStorageClient } from '../src/upload/storage/r2.js';
import { createApiTestEnv } from './test-env.js';
import { fetchAgentCsrfToken } from './auth-test-helpers.js';

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
    const { csrfToken } = await signUp(agent, 'document-record');

    const finishResponse = await completeUpload(agent, csrfToken, 'document-record.pdf');

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
    const { csrfToken: csrfQueue } = await signUp(agent, 'queue-enqueue');

    const finishResponse = await completeUpload(agent, csrfQueue, 'queue-enqueue.pdf');

    expect(finishResponse.status).toBe(200);
    expect(mockDocumentQueue.jobs).toHaveLength(1);
    expect(mockDocumentQueue.jobs[0]).toMatchObject({
      documentId: finishResponse.body.document.id,
    });
  });

  it('returns document processing status for the owner', async () => {
    const { csrfToken: csrfStatus } = await signUp(agent, 'document-status');

    const finishResponse = await completeUpload(agent, csrfStatus, 'document-status.pdf');
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

  it('lists only the authenticated user documents', async () => {
    const { csrfToken: csrfListA } = await signUp(agent, 'document-list-a');
    const firstFinishResponse = await completeUpload(
      agent,
      csrfListA,
      'document-list-a.pdf',
    );

    const secondAgent = request.agent(app.server);
    const { csrfToken: csrfListB } = await signUp(secondAgent, 'document-list-b');
    await completeUpload(secondAgent, csrfListB, 'document-list-b.pdf');

    const response = await agent.get('/api/v1/documents');

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({
      documentId: firstFinishResponse.body.document.id,
      fileName: 'document-list-a.pdf',
      processingStatus: 'queued',
    });
  });

  it('rejects cross-user document status access', async () => {
    const { csrfToken: csrfA } = await signUp(agent, 'cross-user-a');
    const firstFinishResponse = await completeUpload(agent, csrfA, 'cross-user-a.pdf');

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
    const { csrfToken: csrfTransitions } = await signUp(agent, 'transitions');
    const finishResponse = await completeUpload(agent, csrfTransitions, 'transitions.pdf');
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

describe('document structure endpoint', () => {
  it('returns persisted sections and assets for the owning user', async () => {
    const { csrfToken: csrfStructure } = await signUp(agent, 'structure-owner');
    const finishResponse = await completeUpload(agent, csrfStructure, 'structure-owner.pdf');
    const documentId = finishResponse.body.document.id as string;

    // Get the user ID from the session
    const sessionResponse = await agent.get('/api/v1/auth/session');
    const userId = sessionResponse.body.user.id as string;

    // Transition to COMPLETE and add test data
    await transitionDocumentProcessingStatus(prismaClient, {
      documentId,
      nextStatus: DocumentProcessingStatus.QUEUED,
    });
    await transitionDocumentProcessingStatus(prismaClient, {
      documentId,
      nextStatus: DocumentProcessingStatus.PROCESSING,
    });
    await transitionDocumentProcessingStatus(prismaClient, {
      documentId,
      nextStatus: DocumentProcessingStatus.EXTRACTING,
    });
    await transitionDocumentProcessingStatus(prismaClient, {
      documentId,
      nextStatus: DocumentProcessingStatus.INDEXING,
    });

    await prismaClient.documentSection.create({
      data: {
        content: 'Introduction to Biology',
        documentId,
        kind: DocumentSectionKind.HEADING,
        ordinal: 0,
        sourceTrace: { format: 'pdf', headingPath: [], order: 0, pageNumber: 1 },
        title: 'Introduction to Biology',
        userId,
      },
    });
    await prismaClient.documentSection.create({
      data: {
        content: 'Cells are the basic unit of life.',
        documentId,
        kind: DocumentSectionKind.TEXT,
        ordinal: 1,
        sourceTrace: { format: 'pdf', headingPath: ['Introduction to Biology'], order: 1, pageNumber: 1 },
        userId,
      },
    });

    await transitionDocumentProcessingStatus(prismaClient, {
      documentId,
      nextStatus: DocumentProcessingStatus.COMPLETE,
    });

    const response = await agent.get(`/api/v1/documents/${documentId}/structure`);

    expect(response.status).toBe(200);
    expect(response.body.documentId).toBe(documentId);
    expect(response.body.sections).toHaveLength(2);
    expect(response.body.sections[0].content).toBe('Introduction to Biology');
    expect(response.body.sections[0].kind).toBe('heading');
    expect(response.body.sections[0].ordinal).toBe(0);
    expect(response.body.sections[1].content).toBe('Cells are the basic unit of life.');
    expect(response.body.assets).toEqual([]);
  });

  it('rejects unauthenticated access', async () => {
    const response = await request(app.server).get('/api/v1/documents/any-id/structure');

    expect(response.status).toBe(401);
  });

  it('rejects cross-user access to document structure', async () => {
    const { csrfToken: csrfStructureA } = await signUp(agent, 'structure-a');
    const finishResponse = await completeUpload(agent, csrfStructureA, 'structure-a.pdf');

    const secondAgent = request.agent(app.server);
    await signUp(secondAgent, 'structure-b');

    const response = await secondAgent.get(
      `/api/v1/documents/${finishResponse.body.document.id}/structure`,
    );

    expect(response.status).toBe(404);
  });

  it('returns 404 for nonexistent document', async () => {
    await signUp(agent, 'structure-missing');

    const response = await agent.get('/api/v1/documents/does-not-exist/structure');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: 'Document not found' });
  });
});

async function signUp(
  testAgent: ReturnType<typeof request.agent>,
  label: string,
): Promise<{ csrfToken: string }> {
  const csrfToken = await fetchAgentCsrfToken(testAgent);
  const response = await testAgent
    .post(AUTH_PATHS.signup)
    .set('Origin', 'http://localhost:3000')
    .set(AUTH_HEADER_NAMES.csrf, csrfToken)
    .send({
      email: `${testPrefix}-${label}@example.com`,
      password: 'password123',
    });

  expect(response.status).toBe(201);
  return { csrfToken };
}

async function completeUpload(
  testAgent: ReturnType<typeof request.agent>,
  csrfToken: string,
  fileName: string,
) {
  const createResponse = await testAgent
    .post('/api/v1/uploads/create')
    .set('Origin', 'http://localhost:3000')
    .set(AUTH_HEADER_NAMES.csrf, csrfToken)
    .send({
      fileName,
      fileSizeBytes: pdfBuffer().byteLength,
      mimeType: 'application/pdf',
    });

  expect(createResponse.status).toBe(201);

  return testAgent
    .post('/api/v1/uploads/finish')
    .set('Origin', 'http://localhost:3000')
    .set(AUTH_HEADER_NAMES.csrf, csrfToken)
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
