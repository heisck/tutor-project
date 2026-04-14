import { randomUUID } from 'node:crypto';

import { afterAll, describe, expect, it } from 'vitest';

import {
  AcademicLevel,
  AuthProvider,
  DocumentProcessingStatus,
  ExplanationStartPreference,
  StudyGoalPreference,
  StudySessionMode,
  createPrismaClient,
  disconnectDatabase,
} from '../src/index.js';

const client = createPrismaClient({
  DATABASE_URL:
    process.env.DATABASE_URL ??
    'postgresql://postgres:postgres@localhost:5433/ai_tutor_pwa?schema=public',
});
const testPrefix = `db-ai-runtime-usage-${randomUUID()}`;

describe('AI runtime usage model', () => {
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

  it('stores per-user runtime usage metrics linked to a study session and document', async () => {
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
        fileUrl: 'r2://bucket/users/user-1/uploads/runtime-usage/file.pdf',
        processingStatus: DocumentProcessingStatus.COMPLETE,
        title: 'runtime-usage.pdf',
        userId: user.id,
      },
    });

    const learningProfile = await client.learningProfile.create({
      data: {
        academicLevel: AcademicLevel.UNDERGRADUATE,
        explanationStartPreference: ExplanationStartPreference.EXAMPLE_FIRST,
        studyGoalPreference: StudyGoalPreference.DEEP_UNDERSTANDING,
        userId: user.id,
      },
    });

    const session = await client.studySession.create({
      data: {
        documentId: document.id,
        learningProfileId: learningProfile.id,
        mode: StudySessionMode.FULL,
        userId: user.id,
      },
    });

    const usage = await client.aiRuntimeUsage.create({
      data: {
        documentId: document.id,
        inputTokenCount: 32,
        metadata: {
          groundedEvidenceCount: 2,
        },
        outcome: 'answered',
        outputTokenCount: 64,
        providerCallCount: 0,
        route: 'assistant_question',
        studySessionId: session.id,
        userId: user.id,
      },
      include: {
        document: true,
        studySession: true,
        user: true,
      },
    });

    expect(usage.user.id).toBe(user.id);
    expect(usage.document.id).toBe(document.id);
    expect(usage.studySession.id).toBe(session.id);
    expect(usage.route).toBe('assistant_question');
    expect(usage.outcome).toBe('answered');
    expect(usage.providerCallCount).toBe(0);
    expect(usage.inputTokenCount).toBe(32);
    expect(usage.outputTokenCount).toBe(64);
    expect(usage.metadata).toEqual({
      groundedEvidenceCount: 2,
    });
  });
});
