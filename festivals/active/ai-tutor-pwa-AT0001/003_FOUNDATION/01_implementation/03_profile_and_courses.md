---
fest_type: task
fest_id: 003_FOUNDATION-S01-T03
fest_name: profile_and_courses
fest_parent: 003_FOUNDATION-S01
fest_order: 3
fest_status: completed
fest_created: 0001-01-01T00:00:00Z
fest_updated: 2026-04-13T07:24:02.12582647Z
fest_tracking: true
---


# Task: Profile and Courses

## Objective

Implement the basic user profile and course management layer so authenticated users can store foundational identity and study-context data needed by later tutoring and personalization systems.

## Scope

This task includes:
- profile data model and API
- profile read/update flow
- basic course create/list flow
- institution/department/level fields as needed for the foundation phase

This task does not include:
- full personalization engine
- calibration lesson logic
- revision or exam planning logic

## Implementation Requirements

- Create or finalize database models for user profile basics
- Implement get profile endpoint
- Implement update profile endpoint
- Implement create course endpoint
- Implement list courses endpoint
- Enforce authentication for all profile and course operations
- Enforce ownership so users only access their own profile and courses
- Validate all request bodies with Zod or equivalent typed validation
- Keep structure compatible with later learning profile and course profile work

## Acceptance Criteria

- Authenticated user can fetch their profile
- Authenticated user can update their profile
- Authenticated user can create a course
- Authenticated user can list only their own courses
- Invalid profile/course payloads are rejected cleanly
- Unauthenticated access is rejected

## Required Tests

- Get profile integration test
- Update profile integration test
- Create course integration test
- List courses integration test
- Invalid payload validation test
- Cross-user access rejection test

## Notes

Keep the implementation minimal but clean. This task exists to support upload ownership, dashboard grouping, and future personalization without overbuilding.