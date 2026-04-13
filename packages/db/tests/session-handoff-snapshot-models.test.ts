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
const testPrefix = `db-session-handoff-${randomUUID()}`;

describe('session handoff snapshot model', () => {
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

  it('stores durable resume state for a study session', async () => {
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
        title: 'handoff.pdf',
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

    const snapshot = await client.sessionHandoffSnapshot.create({
      data: {
        currentSectionId: 'section-1',
        currentSegmentId: 'segment-1',
        currentStep: 3,
        documentId: document.id,
        explanationHistory: [
          {
            conceptId: 'concept-1',
            explanationType: 'analogy',
            outcome: 'successful',
            usedAt: new Date().toISOString(),
          },
        ],
        masterySnapshot: [
          {
            conceptId: 'concept-1',
            confusionScore: 0.2,
            evidenceCount: 2,
            status: 'partial',
          },
        ],
        resumeNotes: 'Restart with a quick recap',
        studySessionId: session.id,
        unresolvedAtuIds: ['atu-1'],
        userId: user.id,
      },
      include: {
        document: true,
        studySession: true,
        user: true,
      },
    });

    expect(snapshot.document.id).toBe(document.id);
    expect(snapshot.studySession.id).toBe(session.id);
    expect(snapshot.user.id).toBe(user.id);
    expect(snapshot.currentSegmentId).toBe('segment-1');
    expect(snapshot.currentStep).toBe(3);
    expect(snapshot.unresolvedAtuIds).toEqual(['atu-1']);
    expect(snapshot.resumeNotes).toBe('Restart with a quick recap');
  });
});
