import type { DatabaseClient } from '@ai-tutor-pwa/db';
import type {
  GroundedChunk,
  TutorAssistantQuestionResponse,
} from '@ai-tutor-pwa/shared';

import { getOwnedStudySessionState } from '../sessions/state.js';

const ANSWERED_MATCH_THRESHOLD = 2;
const ANSWERED_SCORE_THRESHOLD = 0.55;
const CURRENT_SEGMENT_BOOST = 0.1;
const MAX_GROUNDED_CHUNKS = 3;
const MAX_SUMMARY_LENGTH = 180;
const MIN_TOKEN_LENGTH = 3;
const WEAK_GROUNDING_SCORE_THRESHOLD = 0.25;
const STOPWORDS = new Set([
  'about',
  'after',
  'also',
  'because',
  'before',
  'could',
  'does',
  'from',
  'have',
  'how',
  'into',
  'just',
  'like',
  'that',
  'their',
  'them',
  'then',
  'there',
  'these',
  'they',
  'this',
  'what',
  'when',
  'where',
  'which',
  'while',
  'with',
  'would',
  'why',
  'your',
]);

interface RankedGroundedChunk extends GroundedChunk {
  matchCount: number;
  supportScore: number;
}

export class TutorAssistantQuestionError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'TutorAssistantQuestionError';
  }
}

export async function answerOwnedTutorQuestion(
  prisma: Pick<
    DatabaseClient,
    | 'coverageLedger'
    | 'documentChunk'
    | 'lessonSegment'
    | 'sessionHandoffSnapshot'
    | 'studySession'
  >,
  input: {
    question: string;
    sessionId: string;
    userId: string;
  },
): Promise<TutorAssistantQuestionResponse | null> {
  const sessionState = await getOwnedStudySessionState(prisma, {
    sessionId: input.sessionId,
    userId: input.userId,
  });

  if (sessionState === null) {
    return null;
  }

  if (sessionState.session.status !== 'active') {
    throw new TutorAssistantQuestionError(
      'Assistant questions require an active study session',
    );
  }

  const currentSegment =
    sessionState.teachingPlan.segments.find(
      (segment) => segment.id === sessionState.session.currentSegmentId,
    ) ??
    sessionState.teachingPlan.segments.find(
      (segment) => segment.id === sessionState.teachingPlan.currentSegmentId,
    ) ??
    null;

  const rankedEvidence = await loadRankedGroundedEvidence(prisma, {
    currentSegmentChunkIds: currentSegment?.chunkIds ?? [],
    documentId: sessionState.session.documentId,
    question: input.question,
    userId: input.userId,
  });
  const groundedEvidence = rankedEvidence.map(stripRankingMetadata);
  const strongestGrounding = rankedEvidence[0] ?? null;

  if (
    strongestGrounding === null ||
    strongestGrounding.matchCount === 0 ||
    strongestGrounding.supportScore < WEAK_GROUNDING_SCORE_THRESHOLD
  ) {
    return {
      answer: buildRefusalAnswer(currentSegment?.conceptTitle ?? null),
      currentSegmentId: currentSegment?.id ?? null,
      documentId: sessionState.session.documentId,
      groundedEvidence: [],
      outcome: 'refused',
      understandingCheck: null,
    };
  }

  if (
    strongestGrounding.matchCount < ANSWERED_MATCH_THRESHOLD ||
    strongestGrounding.supportScore < ANSWERED_SCORE_THRESHOLD
  ) {
    return {
      answer: buildWeakGroundingAnswer(
        groundedEvidence,
        currentSegment?.conceptTitle ?? null,
      ),
      currentSegmentId: currentSegment?.id ?? null,
      documentId: sessionState.session.documentId,
      groundedEvidence,
      outcome: 'weak_grounding',
      understandingCheck: buildUnderstandingCheck(currentSegment?.conceptTitle ?? null),
    };
  }

  return {
    answer: buildAnsweredResponse(groundedEvidence, currentSegment?.conceptTitle ?? null),
    currentSegmentId: currentSegment?.id ?? null,
    documentId: sessionState.session.documentId,
    groundedEvidence,
    outcome: 'answered',
    understandingCheck: buildUnderstandingCheck(currentSegment?.conceptTitle ?? null),
  };
}

async function loadRankedGroundedEvidence(
  prisma: Pick<DatabaseClient, 'documentChunk'>,
  input: {
    currentSegmentChunkIds: readonly string[];
    documentId: string;
    question: string;
    userId: string;
  },
): Promise<RankedGroundedChunk[]> {
  const chunks = await prisma.documentChunk.findMany({
    orderBy: {
      ordinal: 'asc',
    },
    select: {
      content: true,
      id: true,
      ordinal: true,
    },
    where: {
      documentId: input.documentId,
      userId: input.userId,
    },
  });
  const questionTerms = tokenize(input.question);
  const currentSegmentChunkIds = new Set(input.currentSegmentChunkIds);

  return chunks
    .map((chunk) => {
      const chunkTerms = new Set(tokenize(chunk.content));
      const matchCount = countMatches(questionTerms, chunkTerms);
      const supportScore =
        questionTerms.length === 0 ? 0 : matchCount / questionTerms.length;
      const rankScore =
        supportScore +
        (currentSegmentChunkIds.has(chunk.id) ? CURRENT_SEGMENT_BOOST : 0);

      return {
        content: summarizeChunk(chunk.content),
        id: chunk.id,
        matchCount,
        score: Number(rankScore.toFixed(2)),
        supportScore,
      } satisfies RankedGroundedChunk;
    })
    .filter((chunk) => chunk.matchCount > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return right.matchCount - left.matchCount;
    })
    .slice(0, MAX_GROUNDED_CHUNKS);
}

function countMatches(
  questionTerms: readonly string[],
  chunkTerms: ReadonlySet<string>,
): number {
  return questionTerms.reduce(
    (total, term) => total + (chunkTerms.has(term) ? 1 : 0),
    0,
  );
}

function stripRankingMetadata(chunk: RankedGroundedChunk): GroundedChunk {
  return {
    content: chunk.content,
    id: chunk.id,
    score: chunk.score,
  };
}

function buildAnsweredResponse(
  groundedEvidence: readonly GroundedChunk[],
  conceptTitle: string | null,
): string {
  const heading =
    conceptTitle === null
      ? 'Based on your document, here is the best grounded answer.'
      : `Based on your document's ${conceptTitle} material, here is the best grounded answer.`;

  return [
    heading,
    '',
    `Short answer: ${groundedEvidence[0]?.content ?? 'No grounded answer available.'}`,
    '',
    'Grounding from your material:',
    ...groundedEvidence.map((chunk) => `- ${chunk.content}`),
  ].join('\n');
}

function buildWeakGroundingAnswer(
  groundedEvidence: readonly GroundedChunk[],
  conceptTitle: string | null,
): string {
  const scopeHint =
    conceptTitle === null
      ? 'your current document'
      : `the ${conceptTitle} part of your current document`;

  return [
    'I found only partial support in your document, so treat this as a cautious answer.',
    '',
    `Closest grounding I found in ${scopeHint}:`,
    ...groundedEvidence.map((chunk) => `- ${chunk.content}`),
    '',
    'Ask about a more specific phrase or concept if you want a stronger answer.',
  ].join('\n');
}

function buildRefusalAnswer(conceptTitle: string | null): string {
  const suggestion =
    conceptTitle === null
      ? 'Try asking about a specific idea or phrase from the study material.'
      : `Try asking about a specific point from ${conceptTitle} or quote a line from your material.`;

  return [
    'I could not find enough grounded context in your document to answer that without guessing.',
    '',
    suggestion,
  ].join('\n');
}

function buildUnderstandingCheck(conceptTitle: string | null): string {
  if (conceptTitle === null) {
    return 'How would you restate that answer in one sentence using your own words?';
  }

  return `How would you explain that back in one sentence using the idea of ${conceptTitle}?`;
}

function summarizeChunk(content: string): string {
  const compact = content.replace(/\s+/g, ' ').trim();

  if (compact.length <= MAX_SUMMARY_LENGTH) {
    return compact;
  }

  return `${compact.slice(0, MAX_SUMMARY_LENGTH - 3).trimEnd()}...`;
}

function tokenize(value: string): string[] {
  const tokens = value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= MIN_TOKEN_LENGTH)
    .filter((token) => !STOPWORDS.has(token));

  if (tokens.length > 0) {
    return [...new Set(tokens)];
  }

  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 2);
}
