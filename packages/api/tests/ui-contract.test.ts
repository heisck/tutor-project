import { describe, expect, it } from 'vitest';

import {
  validateSinglePrimaryAction,
  validateSingleCognitiveTask,
  validateHumanLanguageProgress,
  buildHumanProgress,
  getDashboardPrimaryAction,
  getSessionCognitiveTask,
} from '@ai-tutor-pwa/shared';

describe('validateSinglePrimaryAction', () => {
  it('passes with zero actions', () => {
    expect(validateSinglePrimaryAction([])).toBeNull();
  });

  it('passes with exactly one action', () => {
    expect(
      validateSinglePrimaryAction([
        { actionId: 'a', label: 'Go', targetRoute: '/go' },
      ]),
    ).toBeNull();
  });

  it('fails with multiple actions', () => {
    const result = validateSinglePrimaryAction([
      { actionId: 'a', label: 'Go', targetRoute: '/go' },
      { actionId: 'b', label: 'Also Go', targetRoute: '/also' },
    ]);
    expect(result).not.toBeNull();
    expect(result!.rule).toBe('single_primary_action');
  });
});

describe('validateSingleCognitiveTask', () => {
  it('passes with one task', () => {
    expect(
      validateSingleCognitiveTask([
        { conceptTitle: 'Cells', humanProgress: 'Learning...', taskType: 'learning' },
      ]),
    ).toBeNull();
  });

  it('fails with multiple tasks', () => {
    const result = validateSingleCognitiveTask([
      { conceptTitle: 'Cells', humanProgress: 'Learning...', taskType: 'learning' },
      { conceptTitle: 'DNA', humanProgress: 'Checking...', taskType: 'checking' },
    ]);
    expect(result).not.toBeNull();
    expect(result!.rule).toBe('single_cognitive_task');
  });
});

describe('validateHumanLanguageProgress', () => {
  it('passes for human-readable text', () => {
    expect(validateHumanLanguageProgress('Making good progress — studying "Cells"')).toBeNull();
    expect(validateHumanLanguageProgress('You have covered everything!')).toBeNull();
  });

  it('fails for raw mastery states', () => {
    expect(validateHumanLanguageProgress('Status: not_taught')).not.toBeNull();
    expect(validateHumanLanguageProgress('Status: mastered')).not.toBeNull();
  });

  it('fails for raw coverage states', () => {
    expect(validateHumanLanguageProgress('ASSESSED: 3')).not.toBeNull();
    expect(validateHumanLanguageProgress('NOT_TAUGHT items remaining')).not.toBeNull();
  });

  it('fails for JSON-like content', () => {
    expect(validateHumanLanguageProgress('{"confusionScore": 0.5}')).not.toBeNull();
  });

  it('fails for internal field names', () => {
    expect(validateHumanLanguageProgress('atuId: atu-123')).not.toBeNull();
    expect(validateHumanLanguageProgress('coverageLedger entry')).not.toBeNull();
  });
});

describe('buildHumanProgress', () => {
  it('returns getting ready for zero concepts', () => {
    const result = buildHumanProgress({
      masteredCount: 0,
      totalConcepts: 0,
      mode: 'full',
      currentConceptTitle: null,
    });
    expect(result).toContain('Getting your lesson ready');
  });

  it('returns completed for all mastered', () => {
    const result = buildHumanProgress({
      masteredCount: 5,
      totalConcepts: 5,
      mode: 'full',
      currentConceptTitle: null,
    });
    expect(result).toContain('covered everything');
  });

  it('includes concept title when provided', () => {
    const result = buildHumanProgress({
      masteredCount: 2,
      totalConcepts: 5,
      mode: 'full',
      currentConceptTitle: 'Cells',
    });
    expect(result).toContain('Cells');
    expect(result).toContain('studying');
  });

  it('adjusts language for different modes', () => {
    const quiz = buildHumanProgress({
      masteredCount: 1,
      totalConcepts: 5,
      mode: 'quiz',
      currentConceptTitle: 'DNA',
    });
    expect(quiz).toContain('quizzing');

    const revision = buildHumanProgress({
      masteredCount: 3,
      totalConcepts: 5,
      mode: 'revision',
      currentConceptTitle: 'RNA',
    });
    expect(revision).toContain('reviewing');
  });

  it('never produces technical state labels', () => {
    const cases = [
      { masteredCount: 0, totalConcepts: 5, mode: 'full', currentConceptTitle: 'X' },
      { masteredCount: 3, totalConcepts: 5, mode: 'exam', currentConceptTitle: null },
      { masteredCount: 5, totalConcepts: 5, mode: 'revision', currentConceptTitle: null },
    ];

    for (const input of cases) {
      const result = buildHumanProgress(input);
      expect(validateHumanLanguageProgress(result)).toBeNull();
    }
  });
});

describe('getDashboardPrimaryAction', () => {
  it('returns continue learning when documents exist', () => {
    const action = getDashboardPrimaryAction({
      hasReadyDocuments: true,
      mostRecentDocumentId: 'doc-1',
    });
    expect(action.actionId).toBe('continue_learning');
    expect(action.targetRoute).toContain('doc-1');
  });

  it('returns upload when no documents exist', () => {
    const action = getDashboardPrimaryAction({
      hasReadyDocuments: false,
      mostRecentDocumentId: null,
    });
    expect(action.actionId).toBe('upload_first');
    expect(action.targetRoute).toBe('/upload');
  });
});

describe('getSessionCognitiveTask', () => {
  it('returns exactly one task', () => {
    const task = getSessionCognitiveTask({
      conceptTitle: 'Cells',
      masteredCount: 2,
      mode: 'full',
      totalConcepts: 5,
      tutorAction: 'teach',
    });
    expect(task.conceptTitle).toBe('Cells');
    expect(task.taskType).toBe('learning');
    expect(validateHumanLanguageProgress(task.humanProgress)).toBeNull();
  });

  it('uses checking task type for check actions', () => {
    const task = getSessionCognitiveTask({
      conceptTitle: 'DNA',
      masteredCount: 3,
      mode: 'quiz',
      totalConcepts: 5,
      tutorAction: 'check',
    });
    expect(task.taskType).toBe('checking');
  });

  it('uses completing task type for advance actions', () => {
    const task = getSessionCognitiveTask({
      conceptTitle: 'RNA',
      masteredCount: 4,
      mode: 'full',
      totalConcepts: 5,
      tutorAction: 'advance',
    });
    expect(task.taskType).toBe('completing');
  });

  it('uses reviewing task type for revision mode', () => {
    const task = getSessionCognitiveTask({
      conceptTitle: 'Mitosis',
      masteredCount: 1,
      mode: 'revision',
      totalConcepts: 5,
      tutorAction: 'teach',
    });
    expect(task.taskType).toBe('reviewing');
  });
});
