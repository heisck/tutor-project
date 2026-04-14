import { randomUUID } from 'node:crypto';

import { afterAll, describe, expect, it } from 'vitest';

import {
  AcademicLevel,
  AuthProvider,
  DocumentProcessingStatus,
  DocumentSectionKind,
  ExplanationStartPreference,
  FeedbackAlertStatus,
  FeedbackContentType,
  FeedbackReason,
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
const testPrefix = `db-user-feedback-${randomUUID()}`;

describe('user feedback models', () => {
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

  it('stores feedback records and threshold alerts linked to the tutoring context', async () => {
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
        title: 'feedback.pdf',
        userId: user.id,
      },
    });

    const section = await client.documentSection.create({
      data: {
        content: 'Cells are the basic unit of life.',
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
        description: 'Cells organize living systems.',
        documentId: document.id,
        ordinal: 0,
        title: 'Cells',
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
        analogyPrompt: 'Explain cells through a simple familiar picture.',
        atuIds: ['atu-1'],
        checkPrompt: 'Why are cells important?',
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
          requiredQuestionTypes: ['explanation'],
          requiresDistinctQuestionTypes: false,
        },
        ordinal: 0,
        prerequisiteConceptIds: [],
        sectionId: section.id,
        sourceOrdinal: 0,
        sourceUnitIds: ['source-unit-1'],
        studySessionId: session.id,
        userId: user.id,
      },
    });

    const feedback = await client.userFeedback.create({
      data: {
        conceptId: concept.id,
        contentType: FeedbackContentType.TUTOR_EXPLANATION,
        documentId: document.id,
        lessonSegmentId: segment.id,
        messageId: 'message-1',
        reason: FeedbackReason.HALLUCINATION,
        scopeKey: `tutor_explanation:${concept.id}`,
        studySessionId: session.id,
        userId: user.id,
      },
      include: {
        concept: true,
        document: true,
        lessonSegment: true,
        studySession: true,
        user: true,
      },
    });

    const alert = await client.feedbackAlert.create({
      data: {
        conceptId: concept.id,
        contentType: FeedbackContentType.TUTOR_EXPLANATION,
        documentId: document.id,
        feedbackCount: 4,
        lessonSegmentId: segment.id,
        reason: FeedbackReason.HALLUCINATION,
        scopeKey: `tutor_explanation:${concept.id}`,
        threshold: 4,
      },
      include: {
        concept: true,
        document: true,
        lessonSegment: true,
      },
    });

    expect(feedback.user.id).toBe(user.id);
    expect(feedback.studySession.id).toBe(session.id);
    expect(feedback.document.id).toBe(document.id);
    expect(feedback.lessonSegment.id).toBe(segment.id);
    expect(feedback.concept.id).toBe(concept.id);
    expect(feedback.messageId).toBe('message-1');

    expect(alert.document.id).toBe(document.id);
    expect(alert.concept.id).toBe(concept.id);
    expect(alert.lessonSegment?.id).toBe(segment.id);
    expect(alert.status).toBe(FeedbackAlertStatus.PENDING_REVIEW);
    expect(alert.feedbackCount).toBe(4);
    expect(alert.threshold).toBe(4);
  });
});
