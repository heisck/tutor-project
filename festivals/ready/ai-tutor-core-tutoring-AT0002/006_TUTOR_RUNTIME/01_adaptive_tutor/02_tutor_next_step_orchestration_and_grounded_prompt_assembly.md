---
fest_type: task
fest_id: 02_tutor_next_step_orchestration_and_grounded_prompt_assembly.md
fest_name: tutor next step orchestration and grounded prompt assembly
fest_parent: 01_adaptive_tutor
fest_order: 2
fest_status: pending
fest_autonomy: medium
fest_created: 2026-04-13T17:14:36.074258173Z
fest_tracking: true
---

# Task: tutor next step orchestration and grounded prompt assembly

## Objective

Implement the tutor next-step orchestration path that selects the next teaching action and assembles a grounded prompt from retrieved evidence and persisted session state.

## Requirements

- [ ] Build the runtime service or endpoint that uses session plan, calibration, mastery state, and top-k retrieval to decide the next tutor step.
- [ ] Assemble tutor prompts from scoped retrieved evidence with trusted wrappers or equivalent safeguards so document content is treated as data rather than instructions.

## Implementation

1. Implement the next-step orchestration service or endpoint using the persisted session plan, current handoff snapshot, and retrieval service from earlier phases.
2. Build a prompt-assembly module that compresses learner context, includes only the required retrieved evidence, and applies the festival's prompt-injection defense rules.
3. Return a structured tutor-step result that can be streamed over the SSE contract rather than letting the model define transport semantics implicitly.
4. Add tests that verify correct retrieval scoping, expected prompt inputs, deterministic branching for key session states, and safe behavior when grounding is weak.

## Done When

- [ ] All requirements met
- [ ] The tutor next-step path produces grounded, session-aware decisions under test and never reads evidence outside the authenticated document scope
