import {
  FeedbackContentType as PrismaFeedbackContentType,
  FeedbackReason as PrismaFeedbackReason,
  type DatabaseClient,
  type Prisma,
  type UserFeedback,
} from '@ai-tutor-pwa/db';
import type {
  FeedbackContentType,
  FeedbackReason,
  FeedbackSubmissionResponse,
} from '@ai-tutor-pwa/shared';

const HALLUCINATION_ALERT_THRESHOLD = 4;

const prismaContentTypeByValue: Record<
  FeedbackContentType,
  PrismaFeedbackContentType
> = {
  assistant_answer: PrismaFeedbackContentType.ASSISTANT_ANSWER,
  tutor_explanation: PrismaFeedbackContentType.TUTOR_EXPLANATION,
};

const prismaReasonByValue: Record<FeedbackReason, PrismaFeedbackReason> = {
  hallucination: PrismaFeedbackReason.HALLUCINATION,
  poor_explanation: PrismaFeedbackReason.POOR_EXPLANATION,
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

export class FeedbackSubmissionError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'FeedbackSubmissionError';
  }
}

type FeedbackTransactionClient = Pick<
  Prisma.TransactionClient,
  'feedbackAlert' | 'lessonSegment' | 'studySession' | 'userFeedback'
>;

export async function submitOwnedUserFeedback(
  prisma: Pick<DatabaseClient, '$transaction'>,
  input: {
    contentType: FeedbackContentType;
    lessonSegmentId: string;
    messageId: string | null;
    reason: FeedbackReason;
    sessionId: string;
    userId: string;
  },
): Promise<FeedbackSubmissionResponse | null> {
  return prisma.$transaction<FeedbackSubmissionResponse | null>(
    async (transaction: FeedbackTransactionClient) => {
    const session = await transaction.studySession.findFirst({
      select: {
        documentId: true,
        id: true,
      },
      where: {
        id: input.sessionId,
        userId: input.userId,
      },
    });

    if (session === null) {
      return null;
    }

    const segment = await transaction.lessonSegment.findFirst({
      select: {
        conceptId: true,
        documentId: true,
        id: true,
      },
      where: {
        documentId: session.documentId,
        id: input.lessonSegmentId,
        studySessionId: session.id,
        userId: input.userId,
      },
    });

    if (segment === null) {
      throw new FeedbackSubmissionError('Tutoring context not found');
    }

    const scopeKey = buildScopeKey(input.contentType, segment.conceptId);
    const feedback = await transaction.userFeedback.create({
      data: {
        conceptId: segment.conceptId,
        contentType: getPrismaEnumValue(
          prismaContentTypeByValue,
          input.contentType,
        ),
        documentId: session.documentId,
        lessonSegmentId: segment.id,
        messageId:
          input.contentType === 'tutor_explanation' ? input.messageId : null,
        reason: getPrismaEnumValue(prismaReasonByValue, input.reason),
        scopeKey,
        studySessionId: session.id,
        userId: input.userId,
      },
    });
    const feedbackCount = await countScopedFeedback(
      transaction,
      input.reason,
      scopeKey,
    );

    const threshold: FeedbackSubmissionResponse['threshold'] = {
      feedbackCount,
      requiresReview: false,
      status: 'recorded',
      threshold: HALLUCINATION_ALERT_THRESHOLD,
    };

    if (input.reason !== 'hallucination') {
      return buildFeedbackSubmissionResponse(feedback, threshold);
    }

    const existingAlert = await transaction.feedbackAlert.findUnique({
      where: {
        scopeKey,
      },
    });

    if (existingAlert !== null) {
      return buildFeedbackSubmissionResponse(feedback, {
        ...threshold,
        requiresReview: true,
        status: 'already_triggered',
      });
    }

    if (feedbackCount < HALLUCINATION_ALERT_THRESHOLD) {
      return buildFeedbackSubmissionResponse(feedback, threshold);
    }

    await transaction.feedbackAlert.create({
      data: {
        conceptId: segment.conceptId,
        contentType: getPrismaEnumValue(
          prismaContentTypeByValue,
          input.contentType,
        ),
        documentId: session.documentId,
        feedbackCount,
        lessonSegmentId: segment.id,
        reason: PrismaFeedbackReason.HALLUCINATION,
        scopeKey,
        threshold: HALLUCINATION_ALERT_THRESHOLD,
      },
    });

    return buildFeedbackSubmissionResponse(feedback, {
        ...threshold,
        requiresReview: true,
        status: 'threshold_triggered',
      });
    },
  );
}

async function countScopedFeedback(
  prisma: Pick<FeedbackTransactionClient, 'userFeedback'>,
  reason: FeedbackReason,
  scopeKey: string,
): Promise<number> {
  return prisma.userFeedback.count({
    where: {
      reason: getPrismaEnumValue(prismaReasonByValue, reason),
      scopeKey,
    },
  });
}

function buildScopeKey(
  contentType: FeedbackContentType,
  conceptId: string,
): string {
  return `${contentType}:${conceptId}`;
}

function buildFeedbackSubmissionResponse(
  feedback: UserFeedback,
  threshold: FeedbackSubmissionResponse['threshold'],
): FeedbackSubmissionResponse {
  return {
    feedback: toFeedbackRecord(feedback),
    threshold,
  };
}

function toFeedbackRecord(
  feedback: UserFeedback,
): FeedbackSubmissionResponse['feedback'] {
  return {
    conceptId: feedback.conceptId,
    contentType: toFeedbackContentType(feedback.contentType),
    createdAt: feedback.createdAt.toISOString(),
    documentId: feedback.documentId,
    id: feedback.id,
    lessonSegmentId: feedback.lessonSegmentId,
    messageId: feedback.messageId,
    reason: toFeedbackReason(feedback.reason),
    scopeKey: feedback.scopeKey,
    sessionId: feedback.studySessionId,
  };
}

function toFeedbackContentType(
  contentType: PrismaFeedbackContentType,
): FeedbackContentType {
  switch (contentType) {
    case PrismaFeedbackContentType.ASSISTANT_ANSWER:
      return 'assistant_answer';
    case PrismaFeedbackContentType.TUTOR_EXPLANATION:
      return 'tutor_explanation';
  }
}

function toFeedbackReason(reason: PrismaFeedbackReason): FeedbackReason {
  switch (reason) {
    case PrismaFeedbackReason.HALLUCINATION:
      return 'hallucination';
    case PrismaFeedbackReason.POOR_EXPLANATION:
      return 'poor_explanation';
  }
}
