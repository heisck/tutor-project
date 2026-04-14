---
fest_type: task
fest_id: 03_learner_response_evaluation_confusion_scoring_and_error_classification.md
fest_name: learner response evaluation confusion scoring and error classification
fest_parent: 01_adaptive_tutor
fest_order: 3
fest_status: completed
fest_autonomy: medium
fest_created: 2026-04-13T17:14:36.108201272Z
fest_tracking: true
---

# Task: learner response evaluation confusion scoring and error classification

## Objective

Evaluate learner responses so the tutor can detect confusion, classify errors, and choose the right follow-up action.

## Requirements

- [x] Implement a typed response-evaluation path that scores confusion or uncertainty and classifies the learner's error pattern.
- [x] Persist or expose the evaluation result in a form that later mastery and reteach logic can consume deterministically.

## Implementation

1. Define shared DTOs and persistence updates for learner-response submissions, evaluation results, confusion scoring, and error classifications.
2. Implement the evaluation service or endpoint so it uses session context and grounded evidence rather than freeform judgment detached from the document.
3. Normalize evaluation outcomes into explicit categories that downstream mastery, simpler, and reteach logic can branch on safely.
4. Add tests covering correct classification flow, malformed input rejection, and representative confusion or misconception scenarios.

## Done When

- [x] All requirements met
- [x] Learner response evaluation returns tested confusion and error classifications that downstream tutor logic can consume without ambiguity
