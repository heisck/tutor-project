---
fest_type: task
fest_id: 02_calibration_response_submission_and_katex_capable_explanation_ui.md
fest_name: calibration response submission and katex capable explanation ui
fest_parent: 01_session_experience
fest_order: 2
fest_status: pending
fest_autonomy: medium
fest_created: 2026-04-13T17:14:37.499696424Z
fest_tracking: true
---

# Task: calibration response submission and katex capable explanation ui

## Objective

Add the learner controls for calibration and response submission, and render tutor explanations with safe math support.

## Requirements

- [ ] Surface the mini-calibration inputs and learner response actions required by the tutoring runtime.
- [ ] Render formulas and structured explanations safely so STEM-oriented tutoring content remains readable without unsafe HTML behavior.

## Implementation

1. Build the UI controls for calibration submission and learner-response actions using the session and tutor endpoints defined in earlier phases.
2. Add the explanation-rendering components needed for formatted text and KaTeX-capable formula output while preserving the project's safety and styling conventions.
3. Connect submitted responses to the tutor evaluation path and reflect loading, success, and validation-error states clearly.
4. Add frontend and integration tests for calibration submission, learner response handling, and formula-capable rendering behavior.

## Done When

- [ ] All requirements met
- [ ] Calibration and learner response controls work under test and formula-bearing tutor explanations render safely in the session UI
