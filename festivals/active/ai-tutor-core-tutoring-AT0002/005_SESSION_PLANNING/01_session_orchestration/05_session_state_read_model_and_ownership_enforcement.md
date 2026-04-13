---
fest_type: task
fest_id: 05_session_state_read_model_and_ownership_enforcement.md
fest_name: session state read model and ownership enforcement
fest_parent: 01_session_orchestration
fest_order: 5
fest_status: pending
fest_autonomy: medium
fest_created: 2026-04-13T17:14:34.970971329Z
fest_tracking: true
---

# Task: session state read model and ownership enforcement

## Objective

Build the ownership-safe session state projection used by tutor startup, runtime recovery, and the learner-facing resume flow.

## Requirements

- [ ] Expose a deterministic session state read model that combines lifecycle, calibration, teaching-plan, and handoff data for the current owner only.
- [ ] Enforce ownership on all session state reads and reject mismatched user or document access without leaking session metadata.

## Implementation

1. Define the session state DTO consumed by tutor-runtime bootstrap and web-session resume flows, combining only the persisted fields they require.
2. Implement the protected read endpoint or service projection that assembles session lifecycle, teaching-plan, profile, and handoff data consistently.
3. Reuse centralized ownership helpers so both direct session lookups and nested document-linked state stay scoped to the authenticated user.
4. Add integration tests for successful state reads, cross-user rejection, and consistency between the session read model and lifecycle transitions.

## Done When

- [ ] All requirements met
- [ ] The session state read model powers tested owner-only session retrieval and stays consistent across start, pause, and resume transitions
