---
fest_type: task
fest_id: 01_study_session_schema_and_lifecycle_apis.md
fest_name: study session schema and lifecycle apis
fest_parent: 01_session_orchestration
fest_order: 1
fest_status: pending
fest_autonomy: medium
fest_created: 2026-04-13T17:14:34.809118125Z
fest_tracking: true
---

# Task: study session schema and lifecycle apis

## Objective

Create the persisted study-session models and lifecycle endpoints needed to start, pause, resume, and inspect a tutoring session safely.

## Requirements

- [ ] Define the database schema, enums, and API contracts for study-session lifecycle state without breaking prior festival foundations.
- [ ] Implement protected session start, pause, and resume flows with typed validation and explicit lifecycle transition rules.

## Implementation

1. Extend the Prisma schema and shared contracts with `StudySession` and related lifecycle primitives that connect a user to a document and later planning/runtime state.
2. Implement API handlers for session start, pause, and resume in the existing backend structure using Zod-validated payloads and authenticated ownership checks.
3. Centralize lifecycle transition logic so invalid state changes are rejected consistently instead of being reimplemented in handlers.
4. Add integration tests for successful session start and valid lifecycle transitions, plus negative tests for invalid state changes and unauthenticated or cross-user access.

## Done When

- [ ] All requirements met
- [ ] Session creation, pause, and resume work through tested protected endpoints and reject invalid lifecycle transitions
