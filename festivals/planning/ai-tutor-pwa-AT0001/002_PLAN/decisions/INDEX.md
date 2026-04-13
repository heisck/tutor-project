# Decisions Index

## D001: Modular Monolith First
The platform will be built as a modular monolith before any microservice split.

## D002: Storage Stack
Cloudflare R2 for uploaded files, PostgreSQL for structured data, Redis for cache and queues.

## D003: Queueing
BullMQ on Redis will handle asynchronous document processing and other background jobs.

## D004: Auth Strategy
Use secure database-backed sessions with httpOnly cookies and OAuth support.

## D005: Retrieval Foundation
Use PostgreSQL with pgvector for embeddings and retrieval during early development.

## D006: Security Baseline
All protected endpoints require ownership checks, validation, and rate limiting from day one.

## D007: Testing Baseline
Every implemented module requires tests before it is considered complete.
