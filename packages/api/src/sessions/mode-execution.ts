import type {
  LessonSegmentSelectionReason,
  MasteryQuestionType,
  StudySessionMode,
} from '@ai-tutor-pwa/shared';

export interface ModeExecutionReviewState {
  difficultyScore: number;
  lapseCount: number;
  nextReviewAt: Date | null;
  reviewCount: number;
  stabilityScore: number;
}

export interface ModeExecutionItem {
  conceptId: string;
  ordinal: number;
  prerequisiteConceptIds: readonly string[];
}

export interface ModeExecutionPlanEntry<TItem extends ModeExecutionItem> {
  checkTypeBias: MasteryQuestionType[];
  item: TItem;
  reviewPriority: number | null;
  selectionReason: LessonSegmentSelectionReason;
}

interface BuildModeExecutionPlanInput<TItem extends ModeExecutionItem> {
  dependentCountByConceptId: ReadonlyMap<string, number>;
  examDate: Date | null;
  items: readonly TItem[];
  mode: StudySessionMode;
  now?: Date;
  reviewStateByConceptId: ReadonlyMap<string, ModeExecutionReviewState>;
}

export function buildModeExecutionPlan<TItem extends ModeExecutionItem>(
  input: BuildModeExecutionPlanInput<TItem>,
): ModeExecutionPlanEntry<TItem>[] {
  const now = input.now ?? new Date();
  const rankedItems = input.items.map((item, index) => {
    const reviewState = input.reviewStateByConceptId.get(item.conceptId) ?? null;
    const reviewPriority = computeReviewPriority(reviewState, now);
    const centrality = normalizeDependentCount(
      input.dependentCountByConceptId.get(item.conceptId) ?? 0,
      input.items.length,
    );
    const examUrgency = computeExamUrgency(input.examDate, now);

    return {
      centrality,
      index,
      item,
      reviewPriority,
      score: computeModeScore(input.mode, {
        centrality,
        examUrgency,
        ordinal: item.ordinal,
        prerequisiteCount: item.prerequisiteConceptIds.length,
        reviewPriority,
      }),
    };
  });

  const sortedRankedItems = [...rankedItems].sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }

    if (left.item.ordinal !== right.item.ordinal) {
      return left.item.ordinal - right.item.ordinal;
    }

    return left.index - right.index;
  });

  const sortedItems = shouldPreserveOriginalOrder(input.mode, input.reviewStateByConceptId)
    ? rankedItems
    : sortedRankedItems;

  return sortedItems.map(({ item, reviewPriority }) => ({
    checkTypeBias: buildModeCheckTypeBias(input.mode),
    item,
    reviewPriority,
    selectionReason: mapModeToSelectionReason(input.mode),
  }));
}

function buildModeCheckTypeBias(
  mode: StudySessionMode,
): MasteryQuestionType[] {
  switch (mode) {
    case 'quiz':
      return ['explanation', 'application', 'error_spotting'];
    case 'exam':
      return ['application', 'transfer', 'error_spotting'];
    case 'revision':
      return ['explanation', 'transfer'];
    case 'difficult_parts':
      return ['explanation', 'transfer', 'error_spotting'];
    case 'flashcards':
      return ['explanation'];
    case 'summary':
      return ['explanation'];
    case 'images':
      return ['explanation', 'application'];
    case 'voice':
      return ['explanation', 'application'];
    case 'full':
      return ['explanation', 'transfer'];
  }
}

function computeModeScore(
  mode: StudySessionMode,
  input: {
    centrality: number;
    examUrgency: number;
    ordinal: number;
    prerequisiteCount: number;
    reviewPriority: number | null;
  },
): number {
  const ordinalBias = 1 - Math.min(input.ordinal / 100, 1);
  const reviewPriority = input.reviewPriority ?? 0;

  switch (mode) {
    case 'quiz':
      return ordinalBias + input.centrality * 0.1 + reviewPriority * 0.15;
    case 'exam':
      return (
        reviewPriority * 0.45 +
        input.centrality * 0.25 +
        input.examUrgency * 0.2 +
        ordinalBias * 0.1
      );
    case 'revision':
      return reviewPriority * 0.7 + ordinalBias * 0.2 + input.centrality * 0.1;
    case 'difficult_parts':
      return reviewPriority * 0.75 + input.centrality * 0.15 + ordinalBias * 0.1;
    case 'flashcards':
      return ordinalBias;
    case 'summary':
      return ordinalBias;
    case 'images':
      return ordinalBias + input.prerequisiteCount * 0.05;
    case 'voice':
      return ordinalBias + input.centrality * 0.1;
    case 'full':
      return ordinalBias;
  }
}

function mapModeToSelectionReason(
  mode: StudySessionMode,
): LessonSegmentSelectionReason {
  switch (mode) {
    case 'quiz':
      return 'question_first';
    case 'exam':
      return 'exam_priority';
    case 'revision':
      return 'review_due';
    case 'difficult_parts':
      return 'difficult_part_focus';
    case 'flashcards':
      return 'flashcard_seed';
    case 'summary':
      return 'summary_pass';
    case 'images':
      return 'image_focus';
    case 'voice':
      return 'voice_guided';
    case 'full':
      return 'prerequisite_order';
  }
}

function shouldPreserveOriginalOrder(
  mode: StudySessionMode,
  reviewStateByConceptId: ReadonlyMap<string, ModeExecutionReviewState>,
): boolean {
  if (mode === 'full' || mode === 'voice' || mode === 'summary' || mode === 'flashcards' || mode === 'images' || mode === 'quiz') {
    return true;
  }

  return reviewStateByConceptId.size === 0;
}

function computeReviewPriority(
  reviewState: ModeExecutionReviewState | null,
  now: Date,
): number | null {
  if (reviewState === null) {
    return null;
  }

  const dueBoost =
    reviewState.nextReviewAt !== null && reviewState.nextReviewAt.getTime() <= now.getTime()
      ? 0.35
      : 0;
  const difficulty = clamp(reviewState.difficultyScore, 0, 1) * 0.3;
  const instability = clamp(1 - reviewState.stabilityScore, 0, 1) * 0.2;
  const lapseFactor = clamp(reviewState.lapseCount / 5, 0, 1) * 0.1;
  const reviewDepth = clamp(reviewState.reviewCount / 10, 0, 1) * 0.05;

  return Number(
    clamp(dueBoost + difficulty + instability + lapseFactor + reviewDepth, 0, 1).toFixed(2),
  );
}

function computeExamUrgency(examDate: Date | null, now: Date): number {
  if (examDate === null) {
    return 0;
  }

  const msUntilExam = examDate.getTime() - now.getTime();
  const daysUntilExam = msUntilExam / (24 * 60 * 60 * 1000);

  if (daysUntilExam <= 0) {
    return 1;
  }

  if (daysUntilExam >= 30) {
    return 0;
  }

  return Number((1 - daysUntilExam / 30).toFixed(2));
}

function normalizeDependentCount(value: number, totalItems: number): number {
  if (totalItems <= 1) {
    return 0;
  }

  return clamp(value / (totalItems - 1), 0, 1);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
