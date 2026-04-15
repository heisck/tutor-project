import type { DatabaseClient, Prisma } from '@ai-tutor-pwa/db';
import type {
  TutorAssistantQuestionResponse,
  TutorStreamEvent,
} from '@ai-tutor-pwa/shared';

import { countTokens } from '../knowledge/chunking.js';
import { writeStructuredLog } from '../lib/structured-log.js';

export type TutorRuntimeRoute =
  | 'assistant_question'
  | 'tutor_evaluate'
  | 'tutor_next';

export interface RecordTutorRuntimeUsageInput {
  documentId: string;
  inputText: readonly string[];
  metadata?: Prisma.InputJsonValue;
  outcome: string;
  outputText: readonly string[];
  providerCallCount?: number;
  route: TutorRuntimeRoute;
  sessionId: string;
  userId: string;
}

export async function recordTutorRuntimeUsage(
  prisma: Pick<DatabaseClient, 'aiRuntimeUsage'>,
  input: RecordTutorRuntimeUsageInput,
): Promise<void> {
  const providerCallCount = input.providerCallCount ?? 0;
  const inputTokenCount = sumTokenCounts(input.inputText);
  const outputTokenCount = sumTokenCounts(input.outputText);

  await prisma.aiRuntimeUsage.create({
    data: {
      documentId: input.documentId,
      inputTokenCount,
      ...(input.metadata === undefined ? {} : { metadata: input.metadata }),
      outcome: input.outcome,
      outputTokenCount,
      providerCallCount,
      route: input.route,
      studySessionId: input.sessionId,
      userId: input.userId,
    },
  });

  writeStructuredLog('info', 'tutor_runtime_usage', {
    documentId: input.documentId,
    inputTokenCount,
    outcome: input.outcome,
    outputTokenCount,
    providerCallCount,
    route: input.route,
    sessionId: input.sessionId,
    userId: input.userId,
  });
}

export function collectTutorStreamOutputText(
  events: readonly TutorStreamEvent[],
): string[] {
  return events.flatMap((event) =>
    event.type === 'message' && event.data.role === 'tutor'
      ? [event.data.content]
      : [],
  );
}

export function collectAssistantOutputText(
  response: TutorAssistantQuestionResponse,
): string[] {
  return [
    response.answer,
    response.understandingCheck ?? '',
    ...response.groundedEvidence.map((chunk) => chunk.content),
  ];
}

function sumTokenCounts(texts: readonly string[]): number {
  return texts.reduce((total, text) => {
    const normalized = text.trim();

    if (normalized.length === 0) {
      return total;
    }

    return total + countTokens(normalized);
  }, 0);
}
