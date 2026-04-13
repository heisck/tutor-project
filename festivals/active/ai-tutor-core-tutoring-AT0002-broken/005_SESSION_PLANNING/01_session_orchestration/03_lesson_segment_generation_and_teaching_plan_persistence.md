---
fest_type: task
fest_id: 03_lesson_segment_generation_and_teaching_plan_persistence.md
fest_name: lesson segment generation and teaching plan persistence
fest_parent: 01_session_orchestration
fest_order: 3
fest_status: pending
fest_autonomy: medium
fest_created: 2026-04-13T17:14:34.885547801Z
fest_tracking: true
---

# Task: lesson segment generation and teaching plan persistence

## Objective

Generate ordered lesson segments from the document knowledge model and persist the teaching plan each study session will follow.

## Requirements

- [ ] Build a planning pipeline that turns concepts, prerequisites, coverage state, and calibration into ordered lesson segments.
- [ ] Persist teaching-plan data with enough structure for tutor runtime replay, mastery checks, and later resume restoration.

## Implementation

1. Create the persistence models and shared contracts required for lesson segments, plan ordering, explanation strategy, and mastery-gate metadata.
2. Implement the session-planning service that consumes retrieval and concept outputs from `004_KNOWLEDGE_GRAPH` plus learner calibration to produce the initial ordered plan.
3. Persist the generated teaching plan as part of session initialization rather than recomputing it ad hoc during tutor runtime.
4. Add tests that verify prerequisite-aware ordering, deterministic persistence shape, and failure behavior when required knowledge-model inputs are missing.

## Done When

- [ ] All requirements met
- [ ] A persisted teaching plan exists for each started session and can be inspected or replayed by later runtime code under test
