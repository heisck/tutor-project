---
fest_type: task
fest_id: 01_ai_timeout_fallback_and_token_budget_enforcement.md
fest_name: ai timeout fallback and token budget enforcement
fest_parent: 01_guardrails_and_verification
fest_order: 1
fest_status: pending
fest_autonomy: medium
fest_created: 2026-04-13T17:14:38.896239156Z
fest_tracking: true
---

# Task: ai timeout fallback and token budget enforcement

## Objective

Apply explicit timeouts, fallback handling, and token-budget limits to every AI-dependent tutoring and assistant path.

## Requirements

- [ ] Define and enforce bounded timeout and token-budget rules for tutor, analysis, and assistant calls.
- [ ] Provide safe fallback behavior when upstream AI calls time out, fail, or exceed budget without corrupting session state.

## Implementation

1. Add centralized AI-runtime configuration or helpers for timeout, retry, and token-budget enforcement in the backend packages that call model providers.
2. Apply those safeguards consistently across tutor next-step, response evaluation, teaching-plan generation where still relevant, and assistant question flows.
3. Define fallback behavior that preserves session integrity and surfaces bounded failure states to the caller instead of hanging or fabricating output.
4. Add tests for timeout handling, budget rejection, and safe fallback behavior across representative AI-touching endpoints.

## Done When

- [ ] All requirements met
- [ ] AI runtime calls honor tested timeout and token-budget limits and degrade safely when the model path fails
