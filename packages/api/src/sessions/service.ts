import {
  AcademicLevel as PrismaAcademicLevel,
  ExplanationStartPreference as PrismaExplanationStartPreference,
  StudyGoalPreference as PrismaStudyGoalPreference,
  type LearningProfile,
  MotivationState as PrismaMotivationState,
  StudySessionMode as PrismaStudySessionMode,
  StudySessionStatus as PrismaStudySessionStatus,
  type Prisma,
} from '@ai-tutor-pwa/db';
import type { DatabaseClient } from '@ai-tutor-pwa/db';
import type {
  AcademicLevel,
  ExplanationStartPreference,
  LearningProfileSummary,
  MiniCalibrationInput,
  MotivationState,
  StudyGoalPreference,
  StudySessionLifecycleResponse,
  StudySessionMode,
  StudySessionRecord,
  StudySessionStatus,
} from '@ai-tutor-pwa/shared';

import { persistTeachingPlanForSession, StudySessionPlanningError } from './planner.js';

export class StudySessionTransitionError extends Error {
  public readonly currentStatus: PrismaStudySessionStatus;
  public readonly nextStatus: PrismaStudySessionStatus;

  public constructor(
    currentStatus: PrismaStudySessionStatus,
    nextStatus: PrismaStudySessionStatus,
  ) {
    super(
      `Invalid study session transition from ${toStudySessionStatus(currentStatus)} to ${toStudySessionStatus(nextStatus)}`,
    );
    this.currentStatus = currentStatus;
    this.name = 'StudySessionTransitionError';
    this.nextStatus = nextStatus;
  }
}

export class LearningProfileRequiredError extends Error {
  public constructor() {
    super(
      'Mini calibration is required before starting the first study session',
    );
    this.name = 'LearningProfileRequiredError';
  }
}

export { StudySessionPlanningError };

export type StudySessionModel = Prisma.StudySessionGetPayload<{
  include: {
    currentSection: true;
    learningProfile: true;
  };
}>;

const prismaAcademicLevelByValue: Record<AcademicLevel, PrismaAcademicLevel> = {
  'high school': PrismaAcademicLevel.HIGH_SCHOOL,
  postgraduate: PrismaAcademicLevel.POSTGRADUATE,
  professional: PrismaAcademicLevel.PROFESSIONAL,
  undergraduate: PrismaAcademicLevel.UNDERGRADUATE,
};

const prismaExplanationStartPreferenceByValue: Record<
  ExplanationStartPreference,
  PrismaExplanationStartPreference
> = {
  direct: PrismaExplanationStartPreference.DIRECT,
  example_first: PrismaExplanationStartPreference.EXAMPLE_FIRST,
  why_first: PrismaExplanationStartPreference.WHY_FIRST,
};

const prismaModeByValue: Record<StudySessionMode, PrismaStudySessionMode> = {
  difficult_parts: PrismaStudySessionMode.DIFFICULT_PARTS,
  exam: PrismaStudySessionMode.EXAM,
  flashcards: PrismaStudySessionMode.FLASHCARDS,
  full: PrismaStudySessionMode.FULL,
  images: PrismaStudySessionMode.IMAGES,
  quiz: PrismaStudySessionMode.QUIZ,
  revision: PrismaStudySessionMode.REVISION,
  summary: PrismaStudySessionMode.SUMMARY,
  voice: PrismaStudySessionMode.VOICE,
};

const prismaStudyGoalPreferenceByValue: Record<
  StudyGoalPreference,
  PrismaStudyGoalPreference
> = {
  build_project: PrismaStudyGoalPreference.BUILD_PROJECT,
  deep_understanding: PrismaStudyGoalPreference.DEEP_UNDERSTANDING,
  pass_exam: PrismaStudyGoalPreference.PASS_EXAM,
  quick_overview: PrismaStudyGoalPreference.QUICK_OVERVIEW,
};

function getPrismaEnumValue<T extends string, U>(
  map: Record<T, U>,
  key: T,
): U {
  const value = map[key];
  if (value === undefined) {
    throw new Error(`Unsupported enum value: ${key}`);
  }
  return value;
}

const allowedTransitions: Record<
  PrismaStudySessionStatus,
  readonly PrismaStudySessionStatus[]
> = {
  [PrismaStudySessionStatus.ABANDONED]: [],
  [PrismaStudySessionStatus.ACTIVE]: [
    PrismaStudySessionStatus.PAUSED,
    PrismaStudySessionStatus.ABANDONED,
    PrismaStudySessionStatus.COMPLETED,
    PrismaStudySessionStatus.INCOMPLETE,
  ],
  [PrismaStudySessionStatus.COMPLETED]: [],
  [PrismaStudySessionStatus.CREATED]: [
    PrismaStudySessionStatus.ACTIVE,
    PrismaStudySessionStatus.ABANDONED,
  ],
  [PrismaStudySessionStatus.INCOMPLETE]: [],
  [PrismaStudySessionStatus.PAUSED]: [
    PrismaStudySessionStatus.ACTIVE,
    PrismaStudySessionStatus.ABANDONED,
    PrismaStudySessionStatus.INCOMPLETE,
  ],
};

export async function createStudySessionForOwnedDocument(
  prisma: DatabaseClient,
  input: {
    calibration?: MiniCalibrationInput;
    documentId: string;
    mode: StudySessionMode;
    now?: Date;
    userId: string;
  },
): Promise<StudySessionModel | null> {
  const now = input.now ?? new Date();

  return prisma.$transaction(async (transaction) => {
    const document = await transaction.document.findFirst({
      select: {
        id: true,
      },
      where: {
        id: input.documentId,
        userId: input.userId,
      },
    });

    if (document === null) {
      return null;
    }

    const learningProfile = await resolveLearningProfileForSession(transaction, {
      now,
      userId: input.userId,
      ...(input.calibration !== undefined
        ? { calibration: input.calibration }
        : {}),
    });

    const createdSession = await transaction.studySession.create({
      data: {
        documentId: document.id,
        learningProfileId: learningProfile.id,
        mode: getPrismaEnumValue(prismaModeByValue, input.mode),
        userId: input.userId,
      },
      include: {
        currentSection: true,
        learningProfile: true,
      },
    });

    const teachingPlan = await persistTeachingPlanForSession(transaction, {
      documentId: document.id,
      learningProfile,
      sessionId: createdSession.id,
      userId: input.userId,
    });

    return transitionOwnedStudySessionRecord(transaction, {
      data: {
        currentSectionId:
          teachingPlan.segments[0]?.sectionId ?? createdSession.currentSectionId,
        currentSegmentId: teachingPlan.currentSegmentId,
      },
      nextStatus: PrismaStudySessionStatus.ACTIVE,
      now,
      sessionId: createdSession.id,
      userId: input.userId,
    });
  });
}

export async function transitionOwnedStudySession(
  prisma: DatabaseClient,
  input: {
    nextStatus: PrismaStudySessionStatus;
    now?: Date;
    sessionId: string;
    userId: string;
  },
): Promise<StudySessionModel | null> {
  const now = input.now ?? new Date();

  return prisma.$transaction(async (transaction) => {
    return transitionOwnedStudySessionRecord(transaction, {
      ...input,
      now,
    });
  });
}

export function toStudySessionLifecycleResponse(
  session: StudySessionModel,
): StudySessionLifecycleResponse {
  return {
    learningProfile: toLearningProfileSummary(session.learningProfile),
    session: toStudySessionRecord(session),
  };
}

function assertValidStudySessionTransition(
  currentStatus: PrismaStudySessionStatus,
  nextStatus: PrismaStudySessionStatus,
): void {
  if (!allowedTransitions[currentStatus].includes(nextStatus)) {
    throw new StudySessionTransitionError(currentStatus, nextStatus);
  }
}

export async function transitionOwnedStudySessionRecord(
  prisma: Pick<DatabaseClient, 'studySession'>,
  input: {
    data?: Prisma.StudySessionUncheckedUpdateInput;
    nextStatus: PrismaStudySessionStatus;
    now: Date;
    sessionId: string;
    userId: string;
  },
): Promise<StudySessionModel | null> {
  const existingSession = await prisma.studySession.findFirst({
    include: {
      currentSection: true,
      learningProfile: true,
    },
    where: {
      id: input.sessionId,
      userId: input.userId,
    },
  });

  if (existingSession === null) {
    return null;
  }

  assertValidStudySessionTransition(existingSession.status, input.nextStatus);

  return prisma.studySession.update({
    data: buildTransitionUpdate(
      existingSession,
      input.nextStatus,
      input.now,
      input.data,
    ),
    include: {
      currentSection: true,
      learningProfile: true,
    },
    where: {
      id: existingSession.id,
    },
  });
}

async function resolveLearningProfileForSession(
  prisma: Pick<DatabaseClient, 'learningProfile'>,
  input: {
    calibration?: MiniCalibrationInput;
    now: Date;
    userId: string;
  },
): Promise<LearningProfile> {
  const existingLearningProfile = await prisma.learningProfile.findUnique({
    where: {
      userId: input.userId,
    },
  });

  if (input.calibration === undefined) {
    if (existingLearningProfile !== null) {
      return existingLearningProfile;
    }

    throw new LearningProfileRequiredError();
  }

  const learningProfileData = {
    academicLevel: getPrismaEnumValue(
      prismaAcademicLevelByValue,
      input.calibration.academicLevel,
    ),
    explanationStartPreference: getPrismaEnumValue(
      prismaExplanationStartPreferenceByValue,
      input.calibration.explanationStartPreference,
    ),
    lastCalibratedAt: input.now,
    studyGoalPreference: getPrismaEnumValue(
      prismaStudyGoalPreferenceByValue,
      input.calibration.sessionGoal,
    ),
  } satisfies Omit<
    Prisma.LearningProfileUncheckedCreateInput,
    'id' | 'userId'
  >;

  if (existingLearningProfile !== null) {
    return prisma.learningProfile.update({
      data: learningProfileData,
      where: {
        id: existingLearningProfile.id,
      },
    });
  }

  return prisma.learningProfile.create({
    data: {
      ...learningProfileData,
      userId: input.userId,
    },
  });
}

function buildTransitionUpdate(
  session: StudySessionModel,
  nextStatus: PrismaStudySessionStatus,
  now: Date,
  additionalData?: Prisma.StudySessionUncheckedUpdateInput,
): Prisma.StudySessionUncheckedUpdateInput {
  const data: Prisma.StudySessionUncheckedUpdateInput = {
    ...(additionalData ?? {}),
    status: nextStatus,
  };

  if (nextStatus === PrismaStudySessionStatus.ACTIVE) {
    data.lastActiveAt = now;
    data.startedAt = session.startedAt ?? now;
  }

  if (nextStatus === PrismaStudySessionStatus.PAUSED) {
    data.lastActiveAt = now;
  }

  return data;
}

function toMotivationState(
  motivationState: PrismaMotivationState,
): MotivationState {
  switch (motivationState) {
    case PrismaMotivationState.CHALLENGED:
      return 'challenged';
    case PrismaMotivationState.ENCOURAGED:
      return 'encouraged';
    case PrismaMotivationState.FRUSTRATED:
      return 'frustrated';
    case PrismaMotivationState.NEUTRAL:
      return 'neutral';
  }
}

function toAcademicLevel(academicLevel: PrismaAcademicLevel): AcademicLevel {
  switch (academicLevel) {
    case PrismaAcademicLevel.HIGH_SCHOOL:
      return 'high school';
    case PrismaAcademicLevel.POSTGRADUATE:
      return 'postgraduate';
    case PrismaAcademicLevel.PROFESSIONAL:
      return 'professional';
    case PrismaAcademicLevel.UNDERGRADUATE:
      return 'undergraduate';
  }
}

function toExplanationStartPreference(
  explanationStartPreference: PrismaExplanationStartPreference,
): ExplanationStartPreference {
  switch (explanationStartPreference) {
    case PrismaExplanationStartPreference.DIRECT:
      return 'direct';
    case PrismaExplanationStartPreference.EXAMPLE_FIRST:
      return 'example_first';
    case PrismaExplanationStartPreference.WHY_FIRST:
      return 'why_first';
  }
}

function toLearningProfileSummary(
  learningProfile: LearningProfile | null,
): LearningProfileSummary | null {
  if (learningProfile === null) {
    return null;
  }

  return {
    academicLevel: toAcademicLevel(learningProfile.academicLevel),
    explanationStartPreference: toExplanationStartPreference(
      learningProfile.explanationStartPreference,
    ),
    lastCalibratedAt: learningProfile.lastCalibratedAt?.toISOString() ?? null,
    sessionGoal: toStudyGoalPreference(learningProfile.studyGoalPreference),
  };
}

function toStudySessionMode(mode: PrismaStudySessionMode): StudySessionMode {
  switch (mode) {
    case PrismaStudySessionMode.DIFFICULT_PARTS:
      return 'difficult_parts';
    case PrismaStudySessionMode.EXAM:
      return 'exam';
    case PrismaStudySessionMode.FLASHCARDS:
      return 'flashcards';
    case PrismaStudySessionMode.FULL:
      return 'full';
    case PrismaStudySessionMode.IMAGES:
      return 'images';
    case PrismaStudySessionMode.QUIZ:
      return 'quiz';
    case PrismaStudySessionMode.REVISION:
      return 'revision';
    case PrismaStudySessionMode.SUMMARY:
      return 'summary';
    case PrismaStudySessionMode.VOICE:
      return 'voice';
  }
}

function toStudyGoalPreference(
  studyGoalPreference: PrismaStudyGoalPreference,
): StudyGoalPreference {
  switch (studyGoalPreference) {
    case PrismaStudyGoalPreference.BUILD_PROJECT:
      return 'build_project';
    case PrismaStudyGoalPreference.DEEP_UNDERSTANDING:
      return 'deep_understanding';
    case PrismaStudyGoalPreference.PASS_EXAM:
      return 'pass_exam';
    case PrismaStudyGoalPreference.QUICK_OVERVIEW:
      return 'quick_overview';
  }
}

function toStudySessionRecord(session: StudySessionModel): StudySessionRecord {
  return {
    createdAt: session.createdAt.toISOString(),
    currentSectionId: session.currentSectionId,
    currentSegmentId: session.currentSegmentId,
    currentStep: session.currentStep,
    documentId: session.documentId,
    frustrationFlagCount: session.frustrationFlagCount,
    id: session.id,
    lastActiveAt: session.lastActiveAt?.toISOString() ?? null,
    mode: toStudySessionMode(session.mode),
    motivationState: toMotivationState(session.motivationState),
    startedAt: session.startedAt?.toISOString() ?? null,
    status: toStudySessionStatus(session.status),
    updatedAt: session.updatedAt.toISOString(),
  };
}

function toStudySessionStatus(
  status: PrismaStudySessionStatus,
): StudySessionStatus {
  switch (status) {
    case PrismaStudySessionStatus.ABANDONED:
      return 'abandoned';
    case PrismaStudySessionStatus.ACTIVE:
      return 'active';
    case PrismaStudySessionStatus.COMPLETED:
      return 'completed';
    case PrismaStudySessionStatus.CREATED:
      return 'created';
    case PrismaStudySessionStatus.INCOMPLETE:
      return 'incomplete';
    case PrismaStudySessionStatus.PAUSED:
      return 'paused';
  }
}
