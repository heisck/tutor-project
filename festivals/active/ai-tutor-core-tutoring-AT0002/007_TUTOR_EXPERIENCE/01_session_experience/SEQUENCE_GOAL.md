---
fest_type: sequence
fest_id: 01_session_experience
fest_name: session experience
fest_parent: 007_TUTOR_EXPERIENCE
fest_order: 1
fest_status: pending
fest_created: 2026-04-13T17:14:29.415541831Z
fest_tracking: true
fest_working_dir: .
---

# Sequence Goal: 01_session_experience

**Sequence:** 01_session_experience | **Phase:** 007_TUTOR_EXPERIENCE | **Status:** Pending | **Created:** 2026-04-13T17:14:28Z

## Sequence Objective

**Primary Goal:** Build the learner-facing tutoring surface that renders live tutor activity, collects learner actions, and preserves session continuity.

**Contribution to Phase Goal:** This sequence turns the stable tutor and assistant runtime into a usable product experience with session shell, streaming UI, continuity controls, and feedback capture.

## Success Criteria

The sequence goal is achieved when:

### Required Deliverables

- [ ] **Session tutoring shell**: Learners can enter a session and receive tutor events rendered in order from the live SSE stream.
- [ ] **Interactive tutoring controls**: Calibration, response submission, pause, resume, and assistant-question flows work from the session UI.
- [ ] **Feedback and continuity surfaces**: Session summaries, restored state, and hallucination feedback are persisted and visible in the product.

### Quality Standards

- [ ] **Stream fidelity**: Client rendering preserves event ordering and handles reconnect or interruption states safely.
- [ ] **Ownership-safe UX**: All session and assistant UI flows operate only on the authenticated learner's data.

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
| 01_tutor_session_shell_and_sse_rendering.md | Build the tutoring session shell and stream renderer | Creates the main learner session surface |
| 02_calibration_response_submission_and_katex_capable_explanation_ui.md | Add calibration and response controls with formula-safe rendering | Makes tutoring interactive and readable |
| 03_pause_resume_session_continuity_and_session_summary_ui.md | Surface continuity and summary behavior in the UI | Makes session state trustworthy to learners |
| 04_assistant_question_endpoint_integration_and_in_session_assistant_ui.md | Integrate grounded assistant questions into the session experience | Extends the learner surface with scoped document Q&A |
| 05_hallucination_feedback_capture_and_alert_threshold_workflow.md | Capture explanation feedback and thresholded alerts | Creates the v1 corrective feedback loop |

## Dependencies

### Prerequisites (from other sequences)

- [ ] 006_TUTOR_RUNTIME/01_adaptive_tutor: Stable tutor and assistant runtime contracts must already exist.

### Provides (to other sequences)

- [ ] Learner-facing tutoring experience: Used by `008_RUNTIME_HARDENING/01_guardrails_and_verification`.

## Working Directory

Target project: `.` (relative to campaign root)

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| UI state diverges from persisted tutor session state | Medium | High | Drive resume, summary, and stream rendering from server-backed session projections and verify continuity with integration and end-to-end tests |

## Progress Tracking

### Milestones

- [ ] **Milestone 1**: Session shell and SSE rendering complete
- [ ] **Milestone 2**: Calibration, response, and continuity UI complete
- [ ] **Milestone 3**: Assistant and feedback workflow complete

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
