import type {
  CheckQuestionType,
  ConceptMasteryRecord,
  LessonSegmentRecord,
} from '@ai-tutor-pwa/shared';

export function mapMasteryQuestionTypeToCheckType(
  masteryType: string,
): CheckQuestionType | null {
  switch (masteryType) {
    case 'explanation':
      return 'paraphrase';
    case 'application':
      return 'apply_to_new_case';
    case 'transfer':
      return 'transfer_to_new_domain';
    case 'error_spotting':
      return 'error_spotting';
    default:
      return null;
  }
}

export function selectNextTutorCheckType(
  mastery: ConceptMasteryRecord,
  segment: LessonSegmentRecord,
): CheckQuestionType {
  const usedTypes = new Set(mastery.evidenceHistory.map((e) => e.checkType));

  for (const requiredType of segment.masteryGate.requiredQuestionTypes) {
    const mapped = mapMasteryQuestionTypeToCheckType(requiredType);

    if (mapped !== null && !usedTypes.has(mapped)) {
      return mapped;
    }
  }

  const allTypes = [
    'recall',
    'paraphrase',
    'compare_and_contrast',
    'apply_to_new_case',
    'transfer_to_new_domain',
    'error_spotting',
    'sequence_the_steps',
    'cause_effect_reasoning',
    'prerequisite_link',
    'compression',
    'reverse_reasoning',
    'boundary_case',
  ] as const;

  for (const type of allTypes) {
    if (!usedTypes.has(type)) {
      return type;
    }
  }

  return 'paraphrase';
}
