---
fest_type: task
fest_id: 03_prompt_injection_defense_and_weak_grounding_refusal_paths.md
fest_name: prompt injection defense and weak grounding refusal paths
fest_parent: 01_guardrails_and_verification
fest_order: 3
fest_status: pending
fest_autonomy: medium
fest_created: 2026-04-13T17:14:38.971516993Z
fest_tracking: true
---

# Task: prompt injection defense and weak grounding refusal paths

## Objective

Verify that prompt-injection defense and weak-grounding refusal behavior are enforced consistently across the tutoring stack.

## Requirements

- [ ] Ensure document content is always wrapped or structured as untrusted data in AI-facing prompts.
- [ ] Refuse, narrow, or otherwise constrain tutor and assistant behavior when retrieval grounding is weak instead of hallucinating answers.

## Implementation

1. Audit the prompt-assembly paths used by tutor and assistant flows and standardize trusted wrappers or equivalent document-as-data boundaries where needed.
2. Implement or tighten the weak-grounding policy so low-confidence retrieval or missing evidence produces refusal or narrowing behavior explicitly.
3. Add adversarial tests that simulate prompt-injection attempts in uploaded content and verify the runtime preserves scope and refusal behavior.
4. Add tests for weak-grounding scenarios so assistant and tutor responses remain bounded to available document evidence.

## Done When

- [ ] All requirements met
- [ ] Adversarial tests prove prompt-injection attempts and weak-grounding cases lead to bounded, document-safe behavior instead of hallucinated output
