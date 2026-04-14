---
fest_type: task
fest_id: 03_pause_resume_session_continuity_and_session_summary_ui.md
fest_name: pause resume session continuity and session summary ui
fest_parent: 01_session_experience
fest_order: 3
fest_status: completed
fest_autonomy: medium
fest_created: 2026-04-13T17:14:37.541262323Z
fest_updated: 2026-04-14T07:36:45.01987564Z
fest_tracking: true
---


# Task: pause resume session continuity and session summary ui

## Objective

Expose pause, resume, continuity, and summary behavior so learners can trust that their tutoring progress is preserved.

## Requirements

- [ ] Show the learner the real persisted session continuity state, including resume points and interruptions.
- [ ] Present a session summary view derived from completed tutoring state rather than speculative client-side reconstruction.

## Implementation

1. Add pause and resume actions to the session UI and connect them to the session lifecycle APIs introduced in `005_SESSION_PLANNING`.
2. Render continuity indicators and restored tutor state using the server-backed session read model so interrupted sessions resume accurately.
3. Add the end-of-session summary UI based on persisted coverage, mastery, and completion outputs rather than client-only calculations.
4. Add integration or end-to-end tests for pause, reload, resume, and summary rendering behavior.

## Done When

- [ ] All requirements met
- [ ] Session continuity and summary UI are covered by tests and reflect the persisted session state across interruption and resume flows