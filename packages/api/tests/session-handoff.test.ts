import { randomUUID } from 'node:crypto';

import { createPrismaClient } from '@ai-tutor-pwa/db';
import {
  SESSION_PATHS,
  type SessionHandoffSnapshotInput,
  type StudySessionLifecycleResponse,
} from '@ai-tutor-pwa/shared';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { buildApp } from '../src/app.js';
import { getOwnedSessionHandoffSnapshot } from '../src/sessions/handoff.js';
import { getTeachingPlanForOwnedSession } from '../src/sessions/planner.js';
import { closeRedisClient, createRedisClient } from '../src/lib/redis.js';
import { createDocumentWithKnowledgeGraph } from './fixtures/knowledge-graph.js';
import { createApiTestEnv } from './test-env.js';
import { createNoopDocumentProcessingQueue } from './test-doubles.js';
import { buildInjectHeaders, createInjectAuthSession } from './auth-test-helpers.js';

const baseEnv = createApiTestEnv();
const prismaClient = createPrismaClient({
  DATABASE_URL: baseEnv.DATABASE_URL,
});
const redisClient = createRedisClient(baseEnv);
const testEmailPrefix = `session-handoff-test-${randomUUID()}`;

let app: Awaited<ReturnType<typeof buildApp>>;

beforeAll(async () => {
  await redisClient.ping();
});

afterAll(async () => {
  await closeRedisClient(redisClient);
  await prismaClient.$disconnect();
});

beforeEach(async () => {
  app = await buildApp({
    documentProcessingQueue: createNoopDocumentProcessingQueue(),
    env: createApiTestEnv(),
    prismaClient,
    rateLimitKeyPrefix: `rate-limit:session-handoff-test:${randomUUID()}`,
    redisClient,
  });
  await app.ready();
});

afterEach(async () => {
  await app.close();
  await prismaClient.user.deleteMany({
    where: {
      email: {
        startsWith: testEmailPrefix,
      },
    },
  });
});

describe('session handoff routes', () => {
  it(
    'persists a handoff snapshot on pause and restores it on resume',
    async () => {
      const account = await signUpAndAuthenticate('restore-owner');
      const document = await createOwnedSessionDocument(
        account.userId,
        'restore-owner.pdf',
      );
      const startedSession = await startStudySession(account,document.id);
      const teachingPlan = await getTeachingPlanForOwnedSession(prismaClient, {
        sessionId: startedSession.session.id,
        userId: account.userId,
      });

      expect(teachingPlan).not.toBeNull();

      const restoredSegment = teachingPlan!.segments[1]!;
      const handoff = createHandoffInput(restoredSegment);

      const pauseResponse = await app.inject({
        headers: buildInjectHeaders(account),
        method: 'POST',
        payload: {
          handoff,
        },
        url: SESSION_PATHS.pause(startedSession.session.id),
      });

      expect(pauseResponse.statusCode).toBe(200);
      expect(
        parseJson<StudySessionLifecycleResponse>(pauseResponse.body).session.status,
      ).toBe('paused');

      const savedSnapshot = await getOwnedSessionHandoffSnapshot(prismaClient, {
        sessionId: startedSession.session.id,
        userId: account.userId,
      });

      expect(savedSnapshot).not.toBeNull();
      expect(savedSnapshot).toMatchObject(handoff);

      await prismaClient.studySession.update({
        data: {
          currentSectionId: teachingPlan!.segments[0]?.sectionId ?? null,
          currentSegmentId: teachingPlan!.segments[0]?.id ?? null,
          currentStep: 0,
        },
        where: {
          id: startedSession.session.id,
        },
      });

      const resumeResponse = await app.inject({
        headers: buildInjectHeaders(account),
        method: 'POST',
        url: SESSION_PATHS.resume(startedSession.session.id),
      });

      expect(resumeResponse.statusCode).toBe(200);

      const resumedSession = parseJson<StudySessionLifecycleResponse>(
        resumeResponse.body,
      ).session;

      expect(resumedSession.status).toBe('active');
      expect(resumedSession.currentSegmentId).toBe(restoredSegment.id);
      expect(resumedSession.currentSectionId).toBe(restoredSegment.sectionId);
      expect(resumedSession.currentStep).toBe(3);
    },
    15_000,
  );

  it('rejects corrupted saved handoff snapshots during resume', async () => {
    const account = await signUpAndAuthenticate('corrupt-owner');
    const document = await createOwnedSessionDocument(
      account.userId,
      'corrupt-owner.pdf',
    );
    const startedSession = await startStudySession(account,document.id);

    const pauseResponse = await app.inject({
      headers: buildInjectHeaders(account),
      method: 'POST',
      url: SESSION_PATHS.pause(startedSession.session.id),
    });

    expect(pauseResponse.statusCode).toBe(200);

    await prismaClient.sessionHandoffSnapshot.update({
      data: {
        currentSegmentId: 'missing-segment',
      },
      where: {
        studySessionId: startedSession.session.id,
      },
    });

    const resumeResponse = await app.inject({
      headers: buildInjectHeaders(account),
      method: 'POST',
      url: SESSION_PATHS.resume(startedSession.session.id),
    });

    expect(resumeResponse.statusCode).toBe(409);
    expect(parseJson<{ message: string }>(resumeResponse.body)).toEqual({
      message:
        'Saved handoff snapshot references a lesson segment that is not in the current teaching plan',
    });

    const pausedSession = await prismaClient.studySession.findUnique({
      where: {
        id: startedSession.session.id,
      },
    });

    expect(pausedSession?.status).toBe('PAUSED');
  });

  it('rejects handoff payloads that point a sectionless segment at another section', async () => {
    const owner = await signUpAndAuthenticate('mismatch-owner');
    const intruder = await signUpAndAuthenticate('mismatch-intruder');
    const ownerDocument = await createOwnedSessionDocument(
      owner.userId,
      'mismatch-owner.pdf',
    );
    const intruderDocument = await createOwnedSessionDocument(
      intruder.userId,
      'mismatch-intruder.pdf',
    );
    const startedSession = await startStudySession(owner,ownerDocument.id);
    const teachingPlan = await getTeachingPlanForOwnedSession(prismaClient, {
      sessionId: startedSession.session.id,
      userId: owner.userId,
    });

    expect(teachingPlan).not.toBeNull();

    const targetSegment = teachingPlan!.segments[0]!;
    const intruderSection = await prismaClient.documentSection.findFirst({
      select: {
        id: true,
      },
      where: {
        documentId: intruderDocument.id,
        userId: intruder.userId,
      },
    });

    expect(intruderSection).not.toBeNull();

    await prismaClient.lessonSegment.update({
      data: {
        sectionId: null,
      },
      where: {
        id: targetSegment.id,
      },
    });

    const pauseResponse = await app.inject({
      headers: buildInjectHeaders(owner),
      method: 'POST',
      payload: {
        handoff: {
          currentSectionId: intruderSection!.id,
          currentSegmentId: targetSegment.id,
          currentStep: 2,
        },
      },
      url: SESSION_PATHS.pause(startedSession.session.id),
    });

    expect(pauseResponse.statusCode).toBe(409);
    expect(parseJson<{ message: string }>(pauseResponse.body)).toEqual({
      message:
        'Saved handoff snapshot section does not match the selected lesson segment',
    });

    const activeSession = await prismaClient.studySession.findUnique({
      where: {
        id: startedSession.session.id,
      },
    });

    expect(activeSession?.status).toBe('ACTIVE');
  });
});

function createHandoffInput(
  segment: NonNullable<
    Awaited<ReturnType<typeof getTeachingPlanForOwnedSession>>
  >['segments'][number],
): SessionHandoffSnapshotInput {
  return {
    currentSectionId: segment.sectionId,
    currentSegmentId: segment.id,
    currentStep: 3,
    explanationHistory: [
      {
        conceptId: segment.conceptId,
        explanationType: 'analogy',
        outcome: 'successful',
        usedAt: new Date().toISOString(),
      },
    ],
    masterySnapshot: [
      {
        conceptId: segment.conceptId,
        confusionScore: 0.3,
        evidenceCount: 1,
        status: 'partial',
      },
    ],
    resumeNotes: 'Restart from the concept that still feels shaky',
    unresolvedAtuIds: [segment.atuIds[0]!],
  };
}

async function createOwnedSessionDocument(userId: string, title: string) {
  const { document } = await createDocumentWithKnowledgeGraph(prismaClient, {
    concepts: [
      {
        description: 'What a cell is and why it matters',
        sectionContent:
          'Cells are the basic unit of life and every organism depends on them.',
        title: 'Cells',
      },
      {
        description: 'How cells divide',
        prerequisiteTitles: ['Cells'],
        sectionContent:
          'Mitosis explains how one cell divides into two similar cells.',
        title: 'Mitosis',
      },
    ],
    title,
    userId,
  });

  return document;
}

function createMiniCalibrationInput() {
  return {
    academicLevel: 'undergraduate',
    explanationStartPreference: 'example_first',
    sessionGoal: 'deep_understanding',
  } as const;
}

function parseJson<T>(body: string): T {
  return JSON.parse(body) as T;
}

async function signUpAndAuthenticate(label: string): Promise<{
  cookie: string;
  csrfToken: string;
  userId: string;
}> {
  return createInjectAuthSession(app, {
    email: `${testEmailPrefix}-${label}@example.com`,
    password: 'password123',
  });
}

async function startStudySession(
  auth: { cookie: string; csrfToken: string },
  documentId: string,
): Promise<StudySessionLifecycleResponse> {
  const response = await app.inject({
    headers: buildInjectHeaders(auth),
    method: 'POST',
    payload: {
      calibration: createMiniCalibrationInput(),
      documentId,
    },
    url: SESSION_PATHS.start,
  });

  expect(response.statusCode).toBe(201);

  return parseJson<StudySessionLifecycleResponse>(response.body);
}
