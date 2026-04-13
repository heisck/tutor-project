import { randomUUID } from 'node:crypto';

import {
  AcademicLevel,
  AuthProvider,
  CoverageStatus,
  DocumentProcessingStatus,
  ExplanationStartPreference,
  StudyGoalPreference,
  StudySessionMode,
  createPrismaClient,
} from '@ai-tutor-pwa/db';
import { afterAll, afterEach, describe, expect, it } from 'vitest';

import {
  getTeachingPlanForOwnedSession,
  persistTeachingPlanForSession,
  StudySessionPlanningError,
} from '../src/sessions/planner.js';
import { createDocumentWithKnowledgeGraph } from './fixtures/knowledge-graph.js';
import { createApiTestEnv } from './test-env.js';

const env = createApiTestEnv();
const prisma = createPrismaClient({ DATABASE_URL: env.DATABASE_URL });
const testPrefix = `session-planner-${randomUUID()}`;

describe('session planner', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  afterEach(async () => {
    await prisma.user.deleteMany({
      where: {
        email: {
          startsWith: testPrefix,
        },
      },
    });
  });

  it('persists prerequisite-aware lesson segments with deterministic replay metadata', async () => {
    const user = await createUser('ordered');
    const learningProfile = await prisma.learningProfile.create({
      data: {
        academicLevel: AcademicLevel.UNDERGRADUATE,
        explanationStartPreference: ExplanationStartPreference.EXAMPLE_FIRST,
        studyGoalPreference: StudyGoalPreference.DEEP_UNDERSTANDING,
        userId: user.id,
      },
    });
    const { document } = await createDocumentWithKnowledgeGraph(prisma, {
      concepts: [
        {
          description: 'How materials move across the boundary',
          prerequisiteTitles: ['Cell Membrane'],
          sectionContent: 'Transport explains how materials move into and out of a cell.',
          title: 'Transport',
        },
        {
          coverageStatus: CoverageStatus.TAUGHT,
          description: 'The protective boundary around the cell',
          sectionContent: 'The cell membrane is the boundary that separates the cell from its surroundings.',
          title: 'Cell Membrane',
        },
        {
          description: 'A diffusion example that depends on transport ideas',
          prerequisiteTitles: ['Transport'],
          sectionContent: 'Diffusion is one way substances move across the membrane without extra energy.',
          title: 'Diffusion',
        },
      ],
      title: 'planner-ordered.pdf',
      userId: user.id,
    });
    const session = await prisma.studySession.create({
      data: {
        documentId: document.id,
        learningProfileId: learningProfile.id,
        mode: StudySessionMode.FULL,
        userId: user.id,
      },
    });

    const teachingPlan = await persistTeachingPlanForSession(prisma, {
      documentId: document.id,
      learningProfile,
      sessionId: session.id,
      userId: user.id,
    });

    expect(teachingPlan.currentSegmentId).toBe(teachingPlan.segments[0]?.id ?? null);
    expect(teachingPlan.segments.map((segment) => segment.conceptTitle)).toEqual([
      'Cell Membrane',
      'Transport',
      'Diffusion',
    ]);
    expect(teachingPlan.segments.map((segment) => segment.sourceOrdinal)).toEqual([
      1,
      0,
      2,
    ]);
    expect(teachingPlan.segments[0]).toMatchObject({
      checkPrompt:
        'Explain Cell Membrane in your own words and connect it to a fresh example.',
      coverageSummary: {
        assessed: 0,
        inProgress: 0,
        notTaught: 0,
        taught: 1,
      },
      explanationStrategy: 'example_first',
      masteryGate: {
        confusionThreshold: 0.4,
        minimumChecks: 2,
        requiredQuestionTypes: ['explanation', 'transfer'],
        requiresDistinctQuestionTypes: true,
      },
      prerequisiteConceptIds: [],
    });
    expect(teachingPlan.segments[1]?.prerequisiteConceptIds).toHaveLength(1);
    expect(teachingPlan.segments[0]?.chunkIds.length).toBeGreaterThan(0);
    expect(teachingPlan.segments[0]?.sourceUnitIds.length).toBeGreaterThan(0);

    await prisma.studySession.update({
      data: {
        currentSegmentId: teachingPlan.currentSegmentId,
      },
      where: {
        id: session.id,
      },
    });

    const replayablePlan = await getTeachingPlanForOwnedSession(prisma, {
      sessionId: session.id,
      userId: user.id,
    });

    expect(replayablePlan).not.toBeNull();
    expect(replayablePlan?.segments).toEqual(teachingPlan.segments);
  });

  it('fails when required knowledge-model inputs are missing', async () => {
    const user = await createUser('missing');
    const learningProfile = await prisma.learningProfile.create({
      data: {
        academicLevel: AcademicLevel.UNDERGRADUATE,
        explanationStartPreference: ExplanationStartPreference.DIRECT,
        studyGoalPreference: StudyGoalPreference.PASS_EXAM,
        userId: user.id,
      },
    });
    const document = await prisma.document.create({
      data: {
        fileSize: 1024,
        fileType: 'application/pdf',
        fileUrl: 'r2://bucket/users/missing/documents/missing.pdf',
        processingStatus: DocumentProcessingStatus.COMPLETE,
        title: 'missing-plan.pdf',
        userId: user.id,
      },
    });
    const session = await prisma.studySession.create({
      data: {
        documentId: document.id,
        learningProfileId: learningProfile.id,
        mode: StudySessionMode.FULL,
        userId: user.id,
      },
    });

    await expect(
      persistTeachingPlanForSession(prisma, {
        documentId: document.id,
        learningProfile,
        sessionId: session.id,
        userId: user.id,
      }),
    ).rejects.toThrow(StudySessionPlanningError);
  });
});

async function createUser(label: string) {
  return prisma.user.create({
    data: {
      authProvider: AuthProvider.EMAIL,
      email: `${testPrefix}-${label}@example.com`,
      passwordHash: 'hashed-password',
    },
  });
}
