import { randomUUID } from 'node:crypto';

import { afterAll, describe, expect, it } from 'vitest';

import {
  AcademicLevel,
  AuthProvider,
  DocumentProcessingStatus,
  DocumentSectionKind,
  ExplanationStartPreference,
  LessonSegmentExplanationStrategy,
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
const testPrefix = `db-lesson-segment-${randomUUID()}`;

describe('lesson segment model', () => {
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

  it('stores replayable teaching-plan metadata linked to a study session', async () => {
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
        title: 'lesson-plan.pdf',
        userId: user.id,
      },
    });

    const section = await client.documentSection.create({
      data: {
        content: 'Cells are surrounded by a membrane.',
        documentId: document.id,
        kind: DocumentSectionKind.TEXT,
        ordinal: 0,
        sourceTrace: {
          format: 'pdf',
          headingPath: [],
          order: 0,
          pageNumber: 1,
        },
        userId: user.id,
      },
    });

    const concept = await client.concept.create({
      data: {
        description: 'The membrane controls what enters and leaves the cell.',
        documentId: document.id,
        ordinal: 0,
        title: 'Cell Membrane',
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

    const segment = await client.lessonSegment.create({
      data: {
        analogyPrompt:
          'Ground Cell Membrane in a familiar class-friendly example before formal detail.',
        atuIds: ['atu-1'],
        checkPrompt:
          'Explain Cell Membrane in your own words and connect it to a fresh example.',
        chunkIds: ['chunk-1'],
        conceptDescription: concept.description,
        conceptId: concept.id,
        conceptTitle: concept.title,
        coverageSummary: {
          assessed: 0,
          inProgress: 0,
          notTaught: 1,
          taught: 0,
        },
        documentId: document.id,
        explanationStrategy: LessonSegmentExplanationStrategy.EXAMPLE_FIRST,
        masteryGate: {
          confusionThreshold: 0.4,
          minimumChecks: 2,
          requiredQuestionTypes: ['explanation', 'transfer'],
          requiresDistinctQuestionTypes: true,
        },
        ordinal: 0,
        prerequisiteConceptIds: [],
        sectionId: section.id,
        sourceOrdinal: 0,
        sourceUnitIds: ['source-unit-1'],
        studySessionId: session.id,
        userId: user.id,
      },
      include: {
        concept: true,
        section: true,
        studySession: true,
      },
    });

    await client.studySession.update({
      data: {
        currentSegmentId: segment.id,
      },
      where: {
        id: session.id,
      },
    });

    expect(segment.studySession.id).toBe(session.id);
    expect(segment.concept.id).toBe(concept.id);
    expect(segment.section?.id).toBe(section.id);
    expect(segment.explanationStrategy).toBe(
      LessonSegmentExplanationStrategy.EXAMPLE_FIRST,
    );
    expect(segment.atuIds).toEqual(['atu-1']);
    expect(segment.chunkIds).toEqual(['chunk-1']);
    expect(segment.sourceUnitIds).toEqual(['source-unit-1']);
    expect(segment.prerequisiteConceptIds).toEqual([]);

    const refreshedSession = await client.studySession.findUnique({
      where: {
        id: session.id,
      },
    });

    expect(refreshedSession?.currentSegmentId).toBe(segment.id);
  });
});
