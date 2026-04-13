---
fest_type: task
fest_id: 04_assistant_question_endpoint_integration_and_in_session_assistant_ui.md
fest_name: assistant question endpoint integration and in session assistant ui
fest_parent: 01_session_experience
fest_order: 4
fest_status: pending
fest_autonomy: medium
fest_created: 2026-04-13T17:14:37.579097488Z
fest_tracking: true
---

# Task: assistant question endpoint integration and in session assistant ui

## Objective

Integrate grounded assistant question handling into the live tutoring session so learners can ask scoped questions without leaving the session flow.

## Requirements

- [ ] Connect the in-session assistant UI to a document-scoped, ownership-safe backend question path.
- [ ] Render assistant responses using the same grounding and streaming expectations established for the tutor runtime where applicable.

## Implementation

1. Add the assistant question UI within the tutoring surface and wire it to the existing or planned grounded assistant runtime endpoint.
2. Reuse session and document identifiers from the authenticated tutoring context instead of allowing arbitrary client-selected scope.
3. Render assistant results, refusal states, and weak-grounding behavior clearly so the learner understands the assistant's limits.
4. Add tests covering successful assistant use, weak-grounding or refusal behavior, and cross-user or cross-document isolation.

## Done When

- [ ] All requirements met
- [ ] The in-session assistant path is tested end to end and remains scoped to the authenticated learner's active tutoring context
