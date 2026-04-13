---
fest_type: sequence
fest_id: 01_adaptive_tutor
fest_name: adaptive tutor
fest_parent: 006_TUTOR_RUNTIME
fest_order: 1
fest_status: pending
fest_created: 2026-04-13T17:14:28.363765208Z
fest_tracking: true
fest_working_dir: .
---

# Sequence Goal: 01_adaptive_tutor

**Sequence:** 01_adaptive_tutor | **Phase:** 006_TUTOR_RUNTIME | **Status:** Pending | **Created:** 2026-04-13T17:14:27Z

## Sequence Objective

**Primary Goal:** Implement the live tutor decision loop that streams grounded teaching, evaluates learner responses, and enforces mastery and coverage rules.

**Contribution to Phase Goal:** This sequence turns the persisted planning state into a real tutoring runtime, including stream delivery, grounded prompt assembly, evaluation, reteach controls, and completion safeguards.

## Success Criteria

The sequence goal is achieved when:

### Required Deliverables

- [ ] **Grounded streaming tutor**: Tutor output is delivered over a typed SSE contract backed by scoped retrieval and session state.
- [ ] **Mastery and confusion engine**: Learner responses drive explicit error classification, confusion scoring, and mastery-state transitions.
- [ ] **Coverage-safe completion logic**: Sessions can reteach, simplify, skip intentionally, and finish only when required coverage conditions pass.

### Quality Standards

- [ ] **Grounding discipline**: Tutor and assistant prompts always use retrieved evidence and preserve prompt-injection wrappers or equivalent trusted boundaries.
- [ ] **State-machine integrity**: Tutor progression, mastery updates, and completion rules are auditable and reject invalid transitions.

### Completion Criteria

- [ ] All tasks in sequence completed successfully
- [ ] Quality verification tasks passed
- [ ] Code review completed and issues addressed
- [ ] Documentation updated

## Task Alignment

> **Note:** This table should be populated AFTER creating task files.
> SEQUENCE_GOAL.md defines WHAT to accomplish. Task files define HOW.
> Run `fest create task` to create tasks, then update this table.

| Task | Task Objective | Contribution to Sequence Goal |
|------|----------------|-------------------------------|
| 01_tutor_sse_event_contract_and_stream_transport.md | Define tutor stream events and transport behavior | Establishes the live delivery channel for the tutor |
| 02_tutor_next_step_orchestration_and_grounded_prompt_assembly.md | Build next-step orchestration with grounded prompt assembly | Produces the core tutor turn logic |
| 03_learner_response_evaluation_confusion_scoring_and_error_classification.md | Evaluate learner responses and classify confusion or error type | Enables adaptive branching based on learner evidence |
| 04_mastery_state_transitions_question_rotation_and_no_fake_mastery_enforcement.md | Enforce mastery updates and varied evidence requirements | Prevents shallow or fabricated completion |
| 05_reteach_simpler_skip_explanation_diversity_and_cognitive_load_controls.md | Add alternate explanation and pacing controls | Makes tutoring adapt when the first explanation fails |
| 06_coverage_audit_cross_concept_linking_and_memory_compression_rules.md | Audit coverage and compress learning state safely | Ensures end-of-session behavior is grounded and efficient |

## Dependencies

### Prerequisites (from other sequences)

- [ ] 005_SESSION_PLANNING/01_session_orchestration: Durable session lifecycle, plan, calibration, and handoff state must already exist.

### Provides (to other sequences)

- [ ] Stable tutor runtime behavior: Used by `007_TUTOR_EXPERIENCE/01_session_experience`.

## Working Directory

Target project: `.` (relative to campaign root)

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Tutor orchestration grows too implicit or broad | Medium | High | Keep transport, orchestration, evaluation, mastery, alternate-explanation, and coverage logic split into separate tested tasks |

## Progress Tracking

### Milestones

- [ ] **Milestone 1**: SSE contract and next-step orchestration complete
- [ ] **Milestone 2**: Learner evaluation and mastery enforcement complete
- [ ] **Milestone 3**: Reteach and coverage completion controls complete

## Quality Gates

### Testing and Verification

- [ ] All unit tests pass
- [ ] Integration tests complete
- [ ] Performance benchmarks met

### Code Review

- [ ] Code review conducted
- [ ] Review feedback addressed
- [ ] Standards compliance verified

### Iteration Decision

- [ ] Need another iteration? No
- [ ] If yes, new tasks created: None initially
