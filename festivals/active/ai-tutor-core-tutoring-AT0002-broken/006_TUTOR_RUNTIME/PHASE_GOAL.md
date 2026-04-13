---
fest_type: phase
fest_id: 006_TUTOR_RUNTIME
fest_name: TUTOR_RUNTIME
fest_parent: ai-tutor-core-tutoring-AT0002
fest_order: 6
fest_status: pending
fest_created: 2026-04-13T17:14:22.265620308Z
fest_phase_type: implementation
fest_tracking: true
---

# Phase Goal: 006_TUTOR_RUNTIME

**Phase:** 006_TUTOR_RUNTIME | **Status:** Pending | **Type:** Implementation

## Phase Objective

**Primary Goal:** Deliver the adaptive tutor runtime that teaches, checks, reteaches, updates mastery, and completes only after coverage and mastery rules pass.

**Context:** This phase builds on the durable session, calibration, teaching-plan, retrieval, and coverage state created in earlier phases. It is the first phase that turns those persisted inputs into a live tutoring loop, and it must remain grounded, auditable, and ownership-safe before any learner-facing experience work proceeds.

## Required Outcomes

Deliverables this phase must produce:

- [ ] Tutor turns stream over SSE with a stable event contract and stay grounded in retrieved document evidence.
- [ ] Learner responses produce explicit confusion, error-classification, and mastery decisions rather than implicit heuristics.
- [ ] Reteach, simpler, and skip paths change strategy intentionally while preserving session continuity and coverage rules.
- [ ] Sessions only complete after required ATUs, mastery transitions, and coverage audits succeed.

## Quality Standards

Quality criteria for all work in this phase:

- [ ] All tutor-runtime state transitions are persisted and explainable through durable session and mastery records.
- [ ] Every AI-facing runtime call uses scoped retrieval, typed validation, and prompt assembly that treats document content as data rather than instructions.
- [ ] Tests cover stream transport, decision branching, mastery enforcement, and failure or retry behavior for tutor progression.

## Sequence Alignment

| Sequence | Goal | Key Deliverable |
|----------|------|-----------------|
| 01_adaptive_tutor | Implement the adaptive tutor decision loop and grounded SSE delivery | A production-ready tutor runtime with mastery, reteach, and coverage controls |

## Pre-Phase Checklist

Before starting implementation:

- [ ] Planning phase complete
- [ ] Architecture/design decisions documented
- [ ] Dependencies resolved
- [ ] Development environment ready

## Phase Progress

### Sequence Completion

- [ ] 01_adaptive_tutor

## Notes

This phase must remain inside tutoring-engine v1 scope. Use persisted session state as the source of truth, retrieve only owner-scoped document evidence, and keep all runtime completions tied to explicit mastery and coverage checks rather than optimistic AI output.

---

*Implementation phases use numbered sequences. Create sequences with `fest create sequence`.*
