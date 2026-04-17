# Tutor System Gap Plan — Implementation Progress

**Branch:** `master` (feature work merged into master)
**Base:** `master` at `76b8943`
**Started:** 2026-04-16
**Completed:** 2026-04-17

## Phase Overview

| Phase | Area | Status |
|-------|------|--------|
| 1 | Knowledge Traceability & Hard Mastery Gating | DONE |
| 2 | Tutor Runtime Contract & Error Intelligence | DONE |
| 3 | Mode Execution & Learner Calibration | DONE |
| 4 | Provider Integrity & No Incomplete Behavior | DONE |
| 5 | UI Orchestration Contract | DONE |

All 332 API tests pass. Repo-wide typecheck clean.

## Phase 1: Knowledge Traceability & Hard Mastery Gating

### Files
- `packages/api/src/knowledge/traceability.ts` — NEW: validates `sourceUnit → ATU → concept → lessonSegment` chain. Returns `TraceabilityReport` with `LESSON_READY` / `NOT_LESSON_READY` verdict. `checkAtuResolution()` drives the mastery gate's ATU-resolution rule.
- `packages/api/src/knowledge/coverage-ledger.ts` — MODIFIED: `validateKnowledgeGraphIntegrity` now also rejects orphaned ATUs (no conceptId) and uncovered source units; `initializeCoverageLedger` calls the validator before creating entries.
- `packages/api/src/sessions/planner.ts` — MODIFIED: calls `validateLessonReadiness()` before planning; blocks tutoring when the teaching graph is incomplete.
- `packages/api/src/tutor/mastery.ts` — MODIFIED: `validateMasteryGate()` enforces `evidence_count >= 2`, distinct required evidence types, confusion < threshold, illusion flag blocks mastery even for correct-looking answers, and all linked ATUs must be resolved.

### Tests
- `packages/api/tests/traceability.test.ts` — NEW
- `packages/api/tests/coverage-ledger.test.ts` — extended for orphaned ATUs, uncovered source units, integrity-blocking
- `packages/api/tests/tutor-mastery.test.ts` — extended for illusion blocking, ATU resolution gating

## Phase 2: Tutor Runtime Contract & Error Intelligence

### Files
- `packages/api/src/tutor/step-validator.ts` — NEW: validates each tutor step against the micro-teach contract (teach → check → feedback → next). Rejects steps with multiple new ideas, no learner response, or progression without check.
- `packages/api/src/tutor/error-action-map.ts` — NEW: hard mapping from `ErrorClassification` to `TutorAction`. `misconception → reteach`, `partial → refine`, `memorization → transfer probe`, `vocabulary_block → simpler wording`, etc.
- `packages/api/src/tutor/orchestrator.ts` — MODIFIED: integrates error-to-action discipline into `decideTutorAction`. Validates steps before returning.

### Tests
- `packages/api/tests/step-validator.test.ts` — NEW
- `packages/api/tests/error-action-map.test.ts` — NEW
- `packages/api/tests/tutor-orchestrator.test.ts` — extended

## Phase 3: Mode Execution & Learner Calibration

### Files
- `packages/api/src/tutor/mode-enforcement.ts` — NEW: per-mode runtime behavior (prompt rules, question focus, explanation length, difficulty progression, error tolerance). `validateActionForMode` rejects mode-incompatible actions (e.g. `teach` in `quiz` mode on a `not_taught` concept).
- `packages/api/src/tutor/calibration.ts` — NEW: `shouldTriggerCalibration()` detects new-learner / weak-profile / repeated-confusion conditions.
- `packages/api/src/tutor/prompt-assembly.ts` — MODIFIED: injects `buildModePromptRules(activeMode)` into the system prompt.

### Tests
- `packages/api/tests/mode-enforcement.test.ts` — NEW
- `packages/api/tests/calibration.test.ts` — NEW
- `packages/api/tests/tutor-prompt-assembly.test.ts` — extended for mode-rule injection

## Phase 4: Provider Integrity & No Incomplete Behavior

### Files
- `packages/api/src/lib/provider-integrity.ts` — NEW: declares the set of `CORE_LEARNING_PATHS` that must be Claude-backed (`tutorGeneration`, `tutorEvaluation`, `tutorAssistant`, `atuExtraction`, `conceptAnalysis`). `applyDegradedEvaluationGuard()` refuses to award mastery when the evaluation ran in heuristic fallback mode.
- `packages/api/src/tutor/mastery.ts` — MODIFIED: clamps mastery to `checked` (not `mastered`) when the evaluation was degraded.

### Tests
- `packages/api/tests/provider-integrity.test.ts` — NEW

## Phase 5: UI Orchestration Contract

### Files
- `packages/shared/src/ui-contract.ts` — NEW: zod contract + helpers enforcing "one primary action, one cognitive task, human-language progress." Rejects raw mastery states (e.g. `Status: not_taught`) in learner-visible progress strings.
- `packages/shared/src/index.ts` — MODIFIED: re-exports UI contract.

### Tests
- `packages/api/tests/ui-contract.test.ts` — NEW

## Incidental repairs (not originally scoped)

- Test DB required `prisma db push` to pick up the new `resolutionStatus` column (was the root cause of the first 33 failing tests).
- `packages/api/src/tutor/routes.ts`: evaluate route now auto-seeds `taught` mastery for any mode when the segment is still `not_taught`, not just quiz/exam/revision/difficult_parts. Required for the in-session evaluate flow to transition a fresh concept to `checked`.
- `packages/api/src/tutor/evaluation.ts`: tightened the `correct_words_weak_reasoning` confusion signal (previously fired on any ≥6-word response without causal connectors — too many false positives on clear multi-sentence answers). Now requires 6–12 word range and a broader set of connectors.
- Tests updated for wording drift in assistant fallback ("Grounded answer from …"), prompt assembly ("Wait for the learner's response"), stream ("Let's work through"), and session-state confusionScore (heuristic now returns 0, not hardcoded 0.1, for long coherent answers).

## Unrelated changes bundled in this commit

- `packages/web/src/app/(app)/upload/page.tsx`: polling optimization (8s interval, pauses while tab hidden, extracted boolean memos to avoid recomputation on every render).
- `packages/api/src/dev-storage.ts`: dev R2 stub migrated from in-memory `Map` to tmpdir-backed file storage so dev uploads survive a server restart.
