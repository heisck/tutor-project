import { randomUUID } from 'node:crypto';

import {
  DocumentProcessingStatus,
  createPrismaClient,
} from '@ai-tutor-pwa/db';
import {
  SESSION_PATHS,
  type MiniCalibrationInput,
  type StudySessionLifecycleResponse,
} from '@ai-tutor-pwa/shared';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { buildApp } from '../src/app.js';
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
const testEmailPrefix = `study-session-test-${randomUUID()}`;

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
    rateLimitKeyPrefix: `rate-limit:study-session-test:${randomUUID()}`,
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

describe('study session routes', () => {
  it(
    'bootstraps a learning profile during first-time session start',
    async () => {
      const account = await signUpAndAuthenticate('start-owner');
      const document = await createOwnedSessionDocument(
        account.userId,
        'start-owner.pdf',
      );
      const calibration = createMiniCalibrationInput();

      const response = await app.inject({
        headers: buildInjectHeaders(account),
        method: 'POST',
        payload: {
          calibration,
          documentId: document.id,
        },
        url: SESSION_PATHS.start,
      });

      expect(response.statusCode).toBe(201);

      const body = parseJson<StudySessionLifecycleResponse>(response.body);
      expect(body.session).toMatchObject({
        currentStep: 0,
        documentId: document.id,
        frustrationFlagCount: 0,
        mode: 'full',
        motivationState: 'neutral',
        status: 'active',
      });
      expect(body.session.currentSegmentId).not.toBeNull();
      expect(body.learningProfile).toMatchObject(calibration);
      expect(body.learningProfile?.lastCalibratedAt).not.toBeNull();
      expect(body.session.startedAt).not.toBeNull();
      expect(body.session.lastActiveAt).not.toBeNull();

      const [persistedSession, persistedProfile] = await Promise.all([
        prismaClient.studySession.findUnique({
          where: {
            id: body.session.id,
          },
        }),
        prismaClient.learningProfile.findUnique({
          where: {
            userId: account.userId,
          },
        }),
      ]);

      expect(persistedSession).not.toBeNull();
      expect(persistedSession?.userId).toBe(account.userId);
      expect(persistedSession?.documentId).toBe(document.id);
      expect(persistedSession?.learningProfileId).toBe(
        persistedProfile?.id ?? null,
      );
      expect(persistedSession?.status).toBe('ACTIVE');
      expect(persistedProfile).not.toBeNull();
    },
    15_000,
  );

  it('reuses an existing learning profile on later session starts', async () => {
    const account = await signUpAndAuthenticate('reuse-owner');
    const firstDocument = await createOwnedSessionDocument(
      account.userId,
      'reuse-a.pdf',
    );
    const secondDocument = await createOwnedSessionDocument(
      account.userId,
      'reuse-b.pdf',
    );

    const firstStartedSession = await startStudySession(account,firstDocument.id, {
      calibration: createMiniCalibrationInput(),
    });
    const reusedSession = await startStudySession(account,secondDocument.id);

    expect(reusedSession.learningProfile).toEqual(
      firstStartedSession.learningProfile,
    );

    const profiles = await prismaClient.learningProfile.findMany({
      where: {
        userId: account.userId,
      },
    });

    expect(profiles).toHaveLength(1);

    const [firstPersistedSession, secondPersistedSession] = await Promise.all([
      prismaClient.studySession.findUnique({
        where: {
          id: firstStartedSession.session.id,
        },
      }),
      prismaClient.studySession.findUnique({
        where: {
          id: reusedSession.session.id,
        },
      }),
    ]);

    expect(secondPersistedSession?.learningProfileId).toBe(
      firstPersistedSession?.learningProfileId,
    );
  });

  it('pauses and resumes a study session through valid lifecycle transitions', async () => {
    const account = await signUpAndAuthenticate('pause-resume-owner');
    const document = await createOwnedSessionDocument(
      account.userId,
      'pause-resume.pdf',
    );
    const startedSession = await startStudySession(account,document.id, {
      calibration: createMiniCalibrationInput(),
    });

    const pauseResponse = await app.inject({
      headers: buildInjectHeaders(account),
      method: 'POST',
      url: SESSION_PATHS.pause(startedSession.session.id),
    });

    expect(pauseResponse.statusCode).toBe(200);
    expect(
      parseJson<StudySessionLifecycleResponse>(pauseResponse.body).session.status,
    ).toBe('paused');

    const resumeResponse = await app.inject({
      headers: buildInjectHeaders(account),
      method: 'POST',
      url: SESSION_PATHS.resume(startedSession.session.id),
    });

    expect(resumeResponse.statusCode).toBe(200);
    expect(
      parseJson<StudySessionLifecycleResponse>(resumeResponse.body).session.status,
    ).toBe('active');
  });

  it('rejects invalid lifecycle transitions with a clear error', async () => {
    const account = await signUpAndAuthenticate('invalid-transition-owner');
    const document = await createOwnedSessionDocument(
      account.userId,
      'invalid-transition.pdf',
    );
    const startedSession = await startStudySession(account,document.id, {
      calibration: createMiniCalibrationInput(),
    });

    const firstPauseResponse = await app.inject({
      headers: buildInjectHeaders(account),
      method: 'POST',
      url: SESSION_PATHS.pause(startedSession.session.id),
    });

    expect(firstPauseResponse.statusCode).toBe(200);

    const secondPauseResponse = await app.inject({
      headers: buildInjectHeaders(account),
      method: 'POST',
      url: SESSION_PATHS.pause(startedSession.session.id),
    });

    expect(secondPauseResponse.statusCode).toBe(409);
    expect(parseJson<{ message: string }>(secondPauseResponse.body)).toEqual({
      message: 'Invalid study session transition from paused to paused',
    });
  });

  it('rejects unauthenticated access to session lifecycle routes', async () => {
    const startResponse = await app.inject({
      headers: {
        origin: 'http://localhost:3000',
      },
      method: 'POST',
      payload: {
        calibration: createMiniCalibrationInput(),
        documentId: 'document-id',
      },
      url: SESSION_PATHS.start,
    });

    expect(startResponse.statusCode).toBe(401);

    const pauseResponse = await app.inject({
      headers: {
        origin: 'http://localhost:3000',
      },
      method: 'POST',
      url: SESSION_PATHS.pause('session-id'),
    });

    expect(pauseResponse.statusCode).toBe(401);
  });

  it('rejects cross-user access to pause or resume another user session', async () => {
    const owner = await signUpAndAuthenticate('cross-user-owner');
    const intruder = await signUpAndAuthenticate('cross-user-intruder');
    const document = await createOwnedSessionDocument(
      owner.userId,
      'cross-user.pdf',
    );
    const startedSession = await startStudySession(owner,document.id, {
      calibration: createMiniCalibrationInput(),
    });

    const pauseResponse = await app.inject({
      headers: buildInjectHeaders(intruder),
      method: 'POST',
      url: SESSION_PATHS.pause(startedSession.session.id),
    });

    expect(pauseResponse.statusCode).toBe(404);
    expect(parseJson<{ message: string }>(pauseResponse.body)).toEqual({
      message: 'Study session not found',
    });

    const resumeResponse = await app.inject({
      headers: buildInjectHeaders(intruder),
      method: 'POST',
      url: SESSION_PATHS.resume(startedSession.session.id),
    });

    expect(resumeResponse.statusCode).toBe(404);
    expect(parseJson<{ message: string }>(resumeResponse.body)).toEqual({
      message: 'Study session not found',
    });
  });

  it('rejects malformed calibration input and requires calibration for first-time users', async () => {
    const account = await signUpAndAuthenticate('invalid-calibration');
    const document = await createOwnedSessionDocument(
      account.userId,
      'invalid-calibration.pdf',
    );

    const malformedCalibrationResponse = await app.inject({
      headers: buildInjectHeaders(account),
      method: 'POST',
      payload: {
        calibration: {
          academicLevel: 'undergraduate',
          explanationStartPreference: 'direct',
          sessionGoal: 'invalid-goal',
        },
        documentId: document.id,
      },
      url: SESSION_PATHS.start,
    });

    expect(malformedCalibrationResponse.statusCode).toBe(400);

    const missingCalibrationResponse = await app.inject({
      headers: buildInjectHeaders(account),
      method: 'POST',
      payload: {
        documentId: document.id,
      },
      url: SESSION_PATHS.start,
    });

    expect(missingCalibrationResponse.statusCode).toBe(400);
    expect(parseJson<{ message: string }>(missingCalibrationResponse.body)).toEqual({
      message: 'Mini calibration is required before starting the first study session',
    });
  });

  it('rejects session start when the document knowledge model is missing', async () => {
    const account = await signUpAndAuthenticate('missing-plan-inputs');
    const document = await createOwnedDocument(
      account.userId,
      'missing-plan-inputs.pdf',
    );

    const response = await app.inject({
      headers: buildInjectHeaders(account),
      method: 'POST',
      payload: {
        calibration: createMiniCalibrationInput(),
        documentId: document.id,
      },
      url: SESSION_PATHS.start,
    });

    expect(response.statusCode).toBe(409);
    expect(parseJson<{ message: string }>(response.body)).toEqual({
      message: 'Cannot generate teaching plan: No concepts are available for lesson planning; Coverage ledger has not been initialized for this document',
    });

    const sessions = await prismaClient.studySession.findMany({
      where: {
        documentId: document.id,
        userId: account.userId,
      },
    });

    expect(sessions).toHaveLength(0);
  });
});

async function createOwnedDocument(userId: string, title: string) {
  return prismaClient.document.create({
    data: {
      fileSize: 2048,
      fileType: 'application/pdf',
      fileUrl: `r2://bucket/users/${userId}/documents/${title}`,
      processingStatus: DocumentProcessingStatus.COMPLETE,
      title,
      userId,
    },
  });
}

async function createOwnedSessionDocument(userId: string, title: string) {
  const { document } = await createDocumentWithKnowledgeGraph(prismaClient, {
    concepts: [
      {
        description: 'What a cell is and why it matters',
        sectionContent: 'Cells are the basic unit of life and every organism depends on them.',
        title: 'Cells',
      },
      {
        description: 'How cells divide',
        prerequisiteTitles: ['Cells'],
        sectionContent: 'Mitosis explains how one cell divides into two similar cells.',
        title: 'Mitosis',
      },
    ],
    title,
    userId,
  });

  return document;
}

function createTestEmail(label: string): string {
  return `${testEmailPrefix}-${label}@example.com`;
}

function createMiniCalibrationInput(): MiniCalibrationInput {
  return {
    academicLevel: 'undergraduate',
    explanationStartPreference: 'example_first',
    sessionGoal: 'deep_understanding',
  };
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
    email: createTestEmail(label),
    password: 'password123',
  });
}

async function startStudySession(
  auth: { cookie: string; csrfToken: string },
  documentId: string,
  input: {
    calibration?: MiniCalibrationInput;
  } = {},
): Promise<StudySessionLifecycleResponse> {
  const response = await app.inject({
    headers: buildInjectHeaders(auth),
    method: 'POST',
    payload: {
      ...(input.calibration !== undefined
        ? { calibration: input.calibration }
        : {}),
      documentId,
    },
    url: SESSION_PATHS.start,
  });

  expect(response.statusCode).toBe(201);

  return parseJson<StudySessionLifecycleResponse>(response.body);
}
