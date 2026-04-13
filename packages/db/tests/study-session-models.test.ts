import { randomUUID } from 'node:crypto';

import { afterAll, describe, expect, it } from 'vitest';

import {
  AuthProvider,
  DocumentProcessingStatus,
  MotivationState,
  StudySessionMode,
  StudySessionStatus,
  createPrismaClient,
  disconnectDatabase,
} from '../src/index.js';

const client = createPrismaClient({
  DATABASE_URL:
    process.env.DATABASE_URL ??
    'postgresql://postgres:postgres@localhost:5433/ai_tutor_pwa?schema=public',
});
const testPrefix = `db-study-session-${randomUUID()}`;

describe('study session model', () => {
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

  it('stores lifecycle defaults and ownership links for study sessions', async () => {
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
        processingStatus: DocumentProcessingStatus.COMPLETE,
        title: 'session-ready.pdf',
        userId: user.id,
      },
    });

    const session = await client.studySession.create({
      data: {
        documentId: document.id,
        mode: StudySessionMode.FULL,
        userId: user.id,
      },
      include: {
        document: true,
        user: true,
      },
    });

    expect(session.document.id).toBe(document.id);
    expect(session.user.id).toBe(user.id);
    expect(session.status).toBe(StudySessionStatus.CREATED);
    expect(session.currentStep).toBe(0);
    expect(session.frustrationFlagCount).toBe(0);
    expect(session.motivationState).toBe(MotivationState.NEUTRAL);
    expect(session.startedAt).toBeNull();
    expect(session.lastActiveAt).toBeNull();
  });
});
