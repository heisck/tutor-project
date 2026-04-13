---
fest_type: phase
fest_id: 007_TUTOR_EXPERIENCE
fest_name: TUTOR_EXPERIENCE
fest_parent: ai-tutor-core-tutoring-AT0002
fest_order: 7
fest_status: pending
fest_created: 2026-04-13T17:14:23.2538077Z
fest_phase_type: implementation
fest_tracking: true
---

# Phase Goal: 007_TUTOR_EXPERIENCE

**Phase:** 007_TUTOR_EXPERIENCE | **Status:** Pending | **Type:** Implementation

## Phase Objective

**Primary Goal:** Expose the tutor and assistant behavior through a usable session interface that supports streaming, learner interaction, continuity, and feedback capture.

**Context:** This phase builds on the stable tutor-runtime contracts from `006_TUTOR_RUNTIME`. It turns the backend tutoring engine into an actual learner experience while preserving session continuity, grounding, and ownership constraints needed before final hardening.

## Required Outcomes

Deliverables this phase must produce:

- [ ] Learners can start or resume a tutor session and watch ordered SSE tutor output inside the product UI.
- [ ] Calibration, learner response submission, and formula-safe explanation rendering work within the session experience.
- [ ] Pause, resume, and summary views reflect persisted session state rather than local-only UI assumptions.
- [ ] In-session assistant questions and hallucination feedback submission are available with document-scoped context.

## Quality Standards

Quality criteria for all work in this phase:

- [ ] The UI stays synchronized with persisted session and tutor state, including reconnect and resume behavior.
- [ ] All learner-facing endpoints and data fetches enforce authenticated ownership and never reveal other users' session or document data.
- [ ] Tests cover streamed rendering, interactive tutor actions, session continuity, and feedback persistence paths.

## Sequence Alignment

| Sequence | Goal | Key Deliverable |
|----------|------|-----------------|
| 01_session_experience | Build the learner-facing tutoring surface on top of the stable tutor runtime | A production-ready session UI with streaming, continuity, assistant, and feedback flows |

## Pre-Phase Checklist

Before starting implementation:

- [ ] Planning phase complete
- [ ] Architecture/design decisions documented
- [ ] Dependencies resolved
- [ ] Development environment ready

## Phase Progress

### Sequence Completion

- [ ] 01_session_experience

## Notes

This phase must stay inside AT0002 v1 scope only. Preserve the existing product patterns where available, keep session truth on the server, and render streamed tutor or assistant output using the runtime contracts rather than inventing new client-only behavior.

---

*Implementation phases use numbered sequences. Create sequences with `fest create sequence`.*
