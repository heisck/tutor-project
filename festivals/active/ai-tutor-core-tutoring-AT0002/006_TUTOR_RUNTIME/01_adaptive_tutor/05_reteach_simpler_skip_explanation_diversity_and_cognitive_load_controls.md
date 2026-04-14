---
fest_type: task
fest_id: 05_reteach_simpler_skip_explanation_diversity_and_cognitive_load_controls.md
fest_name: reteach simpler skip explanation diversity and cognitive load controls
fest_parent: 01_adaptive_tutor
fest_order: 5
fest_status: completed
fest_autonomy: medium
fest_created: 2026-04-13T17:14:36.184912193Z
fest_tracking: true
---

# Task: reteach simpler skip explanation diversity and cognitive load controls

## Objective

Implement alternate tutoring actions for reteach, simplification, and skip while keeping explanations varied and cognitively appropriate.

## Requirements

- [x] Support explicit reteach, simpler, and skip flows that change tutoring strategy intentionally instead of repeating the same failed explanation.
- [x] Preserve explanation-diversity memory and pacing controls so the tutor does not overwhelm the learner or loop on near-identical responses.

## Implementation

1. Extend tutor action handling with explicit branches for reteach, simpler, and skip decisions tied to persisted session and mastery context.
2. Store the explanation patterns or history needed to avoid repetitive phrasing and to respect cognitive-load constraints across consecutive tutor turns.
3. Ensure skip behavior keeps coverage and unresolved ATU accounting accurate rather than silently discarding learning obligations.
4. Add tests for alternate-strategy selection, explanation-diversity behavior, and safe handling of learner-driven skip or simplification requests.

## Done When

- [x] All requirements met
- [x] Alternate explanation flows are exercised by tests and demonstrably change strategy without breaking session or coverage state
