---
fest_type: task
fest_id: 003_FOUNDATION-S01-T05
fest_name: repo_and_app_foundation
fest_parent: 003_FOUNDATION-S01
fest_order: 5
fest_status: pending
fest_tracking: true
---

# Task: Repository and App Foundation

## Objective

Set up the core project structure and development environment for ai-tutor-pwa so later foundation tasks can be implemented on a stable base.

## Scope

This task includes:
- monorepo/package structure
- frontend and backend app setup
- shared TypeScript configuration
- environment variable loading and validation
- Prisma setup
- PostgreSQL connection setup
- Redis connection setup
- linting, formatting, and testing setup
- basic health check endpoint

This task does not include:
- auth business logic
- upload business logic
- tutor or quiz features

## Implementation Requirements

- Create or confirm the monorepo structure used by the project
- Set up the frontend application with Next.js and TypeScript
- Set up the backend/API layer according to the chosen project structure
- Configure shared TypeScript settings and path aliases if needed
- Add environment variable validation so startup fails fast when required variables are missing
- Configure Prisma with initial database connection
- Configure Redis client for cache/queue connectivity
- Add linting and formatting configuration
- Add unit/integration test runner configuration
- Add a minimal health endpoint to verify app boot and service wiring

## Acceptance Criteria

- Project installs and runs locally without structural errors
- Frontend and backend boot successfully
- Prisma is configured and can connect to PostgreSQL
- Redis client is configured and can connect
- Environment validation works and fails on missing required variables
- A basic health endpoint responds successfully
- Lint, typecheck, and test commands are present and runnable

## Required Tests

- Environment validation test
- Database connectivity smoke test
- Redis connectivity smoke test
- Health endpoint integration test

## Notes

This task must be completed before auth, upload, and processing tasks proceed.
