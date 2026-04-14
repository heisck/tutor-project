---
fest_type: phase
fest_id: 009_UI_INTEGRATION
fest_name: UI_INTEGRATION
fest_parent: ai-tutor-core-tutoring-AT0002
fest_order: 9
fest_status: pending
fest_phase_type: implementation
fest_tracking: true
---

# Phase Goal: 009_UI_INTEGRATION

**Phase:** 009_UI_INTEGRATION | **Status:** Pending | **Type:** Implementation

## Phase Objective

**Primary Goal:** Connect the existing tutor runtime and existing web tutor primitives into a usable product-facing interface with real routes, dashboard entry points, upload flow, and human-directed UI assembly.

## Required Outcomes

- [ ] Learners can reach the tutor through a real product flow
- [ ] Dashboard, upload, and session entry surfaces exist
- [ ] Existing tutor session UI is wired into real routes and data flow
- [ ] UI work follows mandatory human-in-the-loop design control

## Quality Standards

- [ ] No new tutor runtime logic is invented in this phase
- [ ] UI uses existing backend and session APIs rather than mocks
- [ ] Human-in-the-loop UI rules are followed for all styling and layout decisions
- [ ] All new UI states have loading, empty, and error handling

## Sequence Alignment

| Sequence | Goal | Key Deliverable |
|----------|------|-----------------|
| 01_ui_stitching | Build the visible app shell and connect existing tutor UI into the product | Routed dashboard, upload flow, session shell, and user-approved UI assembly |

## Notes

This phase is for UI integration and stitching only. It must not introduce quiz, flashcard, revision, or other post-AT0002 scope.
