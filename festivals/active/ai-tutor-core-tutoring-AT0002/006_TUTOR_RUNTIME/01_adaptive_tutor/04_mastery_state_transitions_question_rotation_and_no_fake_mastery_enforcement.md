---
fest_type: task
fest_id: 04_mastery_state_transitions_question_rotation_and_no_fake_mastery_enforcement.md
fest_name: mastery state transitions question rotation and no fake mastery enforcement
fest_parent: 01_adaptive_tutor
fest_order: 4
fest_status: pending
fest_autonomy: medium
fest_created: 2026-04-13T17:14:36.14976787Z
fest_tracking: true
---

# Task: mastery state transitions question rotation and no fake mastery enforcement

## Objective

Enforce mastery-state transitions only after sufficient varied evidence so sessions cannot appear complete without real learner understanding.

## Requirements

- [ ] Update mastery state only after required checks succeed, including varied question forms or transfer-style evidence where the plan requires it.
- [ ] Prevent repeated question patterns or optimistic AI responses from marking concepts as mastered prematurely.

## Implementation

1. Model or extend persisted mastery-state structures so they record evidence type, transition reason, and the concept or ATUs affected.
2. Implement the mastery transition service that consumes learner-response evaluation results and enforces the required evidence thresholds and rotation rules.
3. Reuse session and coverage state so unresolved ATUs remain open until the required mastery conditions are actually met.
4. Add tests for valid mastery progression, blocked premature completion, and question-rotation behavior across repeated tutoring attempts.

## Done When

- [ ] All requirements met
- [ ] Mastery transitions are persisted with auditable evidence and tests prove that fake or repeated shallow success cannot complete a concept
