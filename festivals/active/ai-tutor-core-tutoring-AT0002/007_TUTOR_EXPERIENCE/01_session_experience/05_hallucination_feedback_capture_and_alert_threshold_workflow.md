---
fest_type: task
fest_id: 05_hallucination_feedback_capture_and_alert_threshold_workflow.md
fest_name: hallucination feedback capture and alert threshold workflow
fest_parent: 01_session_experience
fest_order: 5
fest_status: pending
fest_autonomy: medium
fest_created: 2026-04-13T17:14:37.633877843Z
fest_tracking: true
---

# Task: hallucination feedback capture and alert threshold workflow

## Objective

Capture learner feedback about suspected hallucinations or poor explanations and trigger the thresholded alert workflow required by AT0002.

## Requirements

- [ ] Persist explanation-level or concept-level learner feedback in a form that can be traced back to the relevant tutoring context.
- [ ] Trigger the festival-defined alert or review threshold when repeated hallucination-style feedback accumulates for the same concept or explanation path.

## Implementation

1. Add the UI affordance for reporting hallucination or quality concerns from tutor explanations and assistant answers where AT0002 requires it.
2. Implement the protected backend submission path and persistence model for `UserFeedback` or the equivalent feedback primitive.
3. Add the threshold evaluation logic that records when repeated feedback should trigger the downstream alert or operator-review workflow.
4. Add tests for feedback submission, threshold crossing behavior, and ownership-safe linkage to the originating learner and session context.

## Done When

- [ ] All requirements met
- [ ] Feedback persistence and threshold behavior are covered by tests and tied back to the correct tutoring context without cross-user leakage
