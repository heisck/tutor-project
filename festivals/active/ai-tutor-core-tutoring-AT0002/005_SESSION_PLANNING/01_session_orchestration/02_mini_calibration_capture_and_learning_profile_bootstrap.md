---
fest_type: task
fest_id: 02_mini_calibration_capture_and_learning_profile_bootstrap.md
fest_name: mini calibration capture and learning profile bootstrap
fest_parent: 01_session_orchestration
fest_order: 2
fest_status: completed
fest_autonomy: medium
fest_created: 2026-04-13T17:14:34.845695165Z
fest_updated: 2026-04-13T22:52:50.958110332Z
fest_tracking: true
---


# Task: mini calibration capture and learning profile bootstrap

## Objective

Capture the learner's initial calibration inputs and persist the learning-profile state that shapes the first tutoring explanations.

## Requirements

- [ ] Persist academic level, session goal, and initial explanation preference for the authenticated learner in a typed, reusable profile model.
- [ ] Attach calibration state to session startup so the generated teaching plan can immediately reflect learner context.

## Implementation

1. Add or extend learning-profile persistence primitives and shared DTOs for the mini-calibration fields required by AT0002.
2. Implement the calibration write path as part of session bootstrap, with Zod validation and ownership checks against the authenticated user.
3. Define how session creation consumes either an existing profile or a first-time calibration payload without duplicating state.
4. Add tests that cover first-session profile bootstrap, reuse of existing profile data, and rejection of malformed calibration input.

## Done When

- [ ] All requirements met
- [ ] Calibration data is persisted and available to downstream teaching-plan generation with tests covering first-time and repeat-session behavior