import { randomUUID } from 'node:crypto';

import { createPrismaClient } from '@ai-tutor-pwa/db';
import { AUTH_PATHS, PROFILE_PATHS, UPLOAD_PATHS } from '@ai-tutor-pwa/shared';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';

import { buildApp } from '../src/app.js';
import type { DocumentProcessingQueue } from '../src/documents/queue.js';
import { closeRedisClient, createRedisClient } from '../src/lib/redis.js';
import type { UploadStorageClient } from '../src/upload/storage/r2.js';
import { createApiTestEnv } from './test-env.js';

const baseEnv = createApiTestEnv();
const prismaClient = createPrismaClient({
  DATABASE_URL: baseEnv.DATABASE_URL,
});
const redisClient = createRedisClient(baseEnv);
const testPrefix = `upload-test-${randomUUID()}`;

let app: Awaited<ReturnType<typeof buildApp>>;
let agent: ReturnType<typeof request.agent>;
let mockDocumentQueue: InMemoryDocumentProcessingQueue;
let mockStorageClient: InMemoryUploadStorageClient;

beforeAll(async () => {
  await redisClient.ping();
});

afterAll(async () => {
  await closeRedisClient(redisClient);
  await prismaClient.$disconnect();
});

beforeEach(async () => {
  mockDocumentQueue = new InMemoryDocumentProcessingQueue();
  mockStorageClient = new InMemoryUploadStorageClient();
  app = await buildApp({
    documentProcessingQueue: mockDocumentQueue,
    env: createApiTestEnv(),
    prismaClient,
    rateLimitKeyPrefix: `rate-limit:auth-upload-test:${randomUUID()}`,
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

describe('upload routes', () => {
  it('uploads a supported file successfully', async () => {
    await signUp(agent, 'valid-upload');

    const validateResponse = await agent
      .post(UPLOAD_PATHS.validate)
      .set('Origin', 'http://localhost:3000')
      .send(buildUploadDescriptor('notes.pdf', 'application/pdf', pdfBuffer().byteLength));

    expect(validateResponse.status).toBe(200);

    const createResponse = await agent
      .post(UPLOAD_PATHS.create)
      .set('Origin', 'http://localhost:3000')
      .send(buildUploadDescriptor('notes.pdf', 'application/pdf', pdfBuffer().byteLength));

    expect(createResponse.status).toBe(201);

    const finishResponse = await agent
      .post(UPLOAD_PATHS.finish)
      .set('Origin', 'http://localhost:3000')
      .field('uploadId', createResponse.body.uploadId)
      .attach('file', pdfBuffer(), {
        contentType: 'application/pdf',
        filename: 'notes.pdf',
      });

    expect(finishResponse.status).toBe(200);
    expect(finishResponse.body).toMatchObject({
      document: {
        processingStatus: 'pending',
      },
      fileName: 'notes.pdf',
      mimeType: 'application/pdf',
      status: 'uploaded',
    });
    expect(mockStorageClient.keys()).toEqual([finishResponse.body.storage.key]);
  });

  it('rejects unsupported file types', async () => {
    await signUp(agent, 'unsupported-upload');

    const response = await agent
      .post(UPLOAD_PATHS.create)
      .set('Origin', 'http://localhost:3000')
      .send(buildUploadDescriptor('virus.exe', 'application/x-msdownload', 128));

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: 'Unsupported file type',
    });
  });

  it('rejects oversized files', async () => {
    await signUp(agent, 'oversized-upload');

    const response = await agent
      .post(UPLOAD_PATHS.create)
      .set('Origin', 'http://localhost:3000')
      .send(buildUploadDescriptor('notes.pdf', 'application/pdf', 100 * 1024 * 1024 + 1));

    expect(response.status).toBe(413);
  });

  it('rejects unauthenticated upload requests', async () => {
    const response = await agent
      .post(UPLOAD_PATHS.create)
      .set('Origin', 'http://localhost:3000')
      .send(buildUploadDescriptor('notes.pdf', 'application/pdf', pdfBuffer().byteLength));

    expect(response.status).toBe(401);
  });

  it('associates stored file locations with the correct authenticated user', async () => {
    const email = await signUp(agent, 'ownership');
    const profileResponse = await agent.get(PROFILE_PATHS.profile);
    const userId = profileResponse.body.id as string;

    const createResponse = await agent
      .post(UPLOAD_PATHS.create)
      .set('Origin', 'http://localhost:3000')
      .send(buildUploadDescriptor('notes.pdf', 'application/pdf', pdfBuffer().byteLength));

    const finishResponse = await agent
      .post(UPLOAD_PATHS.finish)
      .set('Origin', 'http://localhost:3000')
      .field('uploadId', createResponse.body.uploadId)
      .attach('file', pdfBuffer(), {
        contentType: 'application/pdf',
        filename: 'notes.pdf',
      });

    expect(finishResponse.status).toBe(200);
    expect(finishResponse.body.storage.key).toContain(`users/${userId}/uploads/`);
    expect(mockStorageClient.get(finishResponse.body.storage.key)?.metadata.userId).toBe(
      userId,
    );
    expect(email).toContain(testPrefix);
  });

  it('rate limits uploads after 5 successful upload creations per hour', async () => {
    await signUp(agent, 'rate-limit');

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const fileName = `notes-${attempt}.pdf`;
      const createResponse = await agent
        .post(UPLOAD_PATHS.create)
        .set('Origin', 'http://localhost:3000')
        .send(buildUploadDescriptor(fileName, 'application/pdf', pdfBuffer().byteLength));

      expect(createResponse.status).toBe(201);

      const finishResponse = await agent
        .post(UPLOAD_PATHS.finish)
        .set('Origin', 'http://localhost:3000')
        .field('uploadId', createResponse.body.uploadId)
        .attach('file', pdfBuffer(), {
          contentType: 'application/pdf',
          filename: fileName,
        });

      expect(finishResponse.status).toBe(200);
    }

    const limitedResponse = await agent
      .post(UPLOAD_PATHS.create)
      .set('Origin', 'http://localhost:3000')
      .send(buildUploadDescriptor('notes-6.pdf', 'application/pdf', pdfBuffer().byteLength));

    expect(limitedResponse.status).toBe(429);
    expect(limitedResponse.body).toEqual({
      message: 'Too many requests',
    });
  });

  it('enforces the maximum of 3 concurrent uploads per user', async () => {
    await signUp(agent, 'concurrent-limit');

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await agent
        .post(UPLOAD_PATHS.create)
        .set('Origin', 'http://localhost:3000')
        .send(
          buildUploadDescriptor(
            `concurrent-${attempt}.pdf`,
            'application/pdf',
            pdfBuffer().byteLength,
          ),
        );

      expect(response.status).toBe(201);
    }

    const fourthResponse = await agent
      .post(UPLOAD_PATHS.create)
      .set('Origin', 'http://localhost:3000')
      .send(
        buildUploadDescriptor(
          'concurrent-4.pdf',
          'application/pdf',
          pdfBuffer().byteLength,
        ),
      );

    expect(fourthResponse.status).toBe(429);
    expect(fourthResponse.body).toEqual({
      message: 'You already have 3 uploads in progress',
    });
  });
});

async function signUp(
  testAgent: ReturnType<typeof request.agent>,
  label: string,
): Promise<string> {
  const email = `${testPrefix}-${label}@example.com`;
  const response = await testAgent.post(AUTH_PATHS.signup).send({
    email,
    password: 'password123',
  });

  expect(response.status).toBe(201);
  return email;
}

function buildUploadDescriptor(
  fileName: string,
  mimeType: string,
  fileSizeBytes: number,
) {
  return {
    fileName,
    fileSizeBytes,
    mimeType,
  };
}

function pdfBuffer(): Buffer {
  return Buffer.from('%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF');
}

class InMemoryUploadStorageClient implements UploadStorageClient {
  private readonly storage = new Map<
    string,
    {
      body: Buffer;
      metadata: Record<string, string>;
    }
  >();

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
    this.storage.set(input.key, {
      body: input.body,
      metadata: input.metadata,
    });

    return {
      bucket: 'test-private-bucket',
      key: input.key,
    };
  }

  public get(key: string) {
    return this.storage.get(key);
  }

  public keys(): string[] {
    return [...this.storage.keys()];
  }
}

class InMemoryDocumentProcessingQueue implements DocumentProcessingQueue {
  public async enqueue(input: {
    documentId: string;
    storageKey: string;
    userId: string;
  }): Promise<{
    jobId: string;
  }> {
    return {
      jobId: `${input.documentId}:job`,
    };
  }
}
