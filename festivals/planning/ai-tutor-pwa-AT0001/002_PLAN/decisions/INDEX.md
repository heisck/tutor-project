# Decisions Index

This index tracks architecture decisions that downstream implementation agents must follow.

## D001: Modular Monolith First
- File: `D001_modular_monolith_first.md`
- Summary: Build as a modular monolith first, not as early microservices.

## D002: Storage Stack
- File: `D002_storage_stack.md`
- Summary: Use Cloudflare R2 for files, PostgreSQL for durable data and pgvector, and Redis for cache plus queues.

## D003: Queueing
- File: `D003_queueing.md`
- Summary: Use BullMQ on Redis for asynchronous processing and retryable background work.

## D004: Auth Strategy
- File: `D004_auth_strategy.md`
- Summary: Use database-backed sessions with httpOnly secure cookies and OAuth support.

## D005: Retrieval Foundation
- File: `D005_retrieval_foundation.md`
- Summary: Use PostgreSQL with pgvector and structured chunk metadata as the early retrieval foundation.

## D006: Security Baseline
- File: `D006_security_baseline.md`
- Summary: Enforce auth, ownership checks, typed validation, upload safety, and prompt-injection defense from day one.

## D007: Testing Baseline
- File: `D007_testing_baseline.md`
- Summary: Require unit, integration, and relevant end-to-end coverage before work is considered complete.
