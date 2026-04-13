import { randomUUID } from 'node:crypto';

import { afterAll, describe, expect, it } from 'vitest';

import {
  AuthProvider,
  DocumentProcessingStatus,
  createPrismaClient,
  disconnectDatabase,
} from '../src/index.js';

const client = createPrismaClient({
  DATABASE_URL:
    process.env.DATABASE_URL ??
    'postgresql://postgres:postgres@localhost:5433/ai_tutor_pwa?schema=public',
});
const testPrefix = `db-document-${randomUUID()}`;

describe('document model', () => {
  afterAll(async () => {
    await client.user.deleteMany({
      where: {
        email: {
          startsWith: testPrefix,
        },
      },
    });
    await disconnectDatabase(client);
  });

  it('stores documents with processing status and ownership', async () => {
    const user = await client.user.create({
      data: {
        authProvider: AuthProvider.EMAIL,
        email: `${testPrefix}@example.com`,
        passwordHash: 'hashed-password',
      },
    });

    const document = await client.document.create({
      data: {
        fileSize: 1024,
        fileType: 'application/pdf',
        fileUrl: 'r2://bucket/users/user-1/uploads/upload-1/file.pdf',
        processingStatus: DocumentProcessingStatus.PENDING,
        title: 'file.pdf',
        userId: user.id,
      },
      include: {
        user: true,
      },
    });

    expect(document.user.email).toBe(user.email);
    expect(document.processingStatus).toBe(DocumentProcessingStatus.PENDING);
  });
});
