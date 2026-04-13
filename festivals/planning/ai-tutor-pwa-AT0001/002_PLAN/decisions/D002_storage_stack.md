# D002: Storage Stack

## Decision
Use Cloudflare R2 for uploaded files, PostgreSQL for durable application data and pgvector, and Redis for cache plus queue infrastructure.

## Why
The overview requires secure object storage, durable relational data, retrieval support, and background processing. This stack separates concerns cleanly while keeping the system a modular monolith.

## Benefits
- Secure non-public file storage with signed access patterns
- Durable relational truth for users, documents, sessions, and progress
- Native vector support through pgvector without adding a separate vector database early
- Fast cache, rate limiting, and queue infrastructure through Redis

## Tradeoffs
- Multiple infrastructure services must be configured and validated
- File storage and relational data consistency require careful orchestration

## Result
Foundation and ingestion tasks should treat PostgreSQL as truth, Redis as a helper, and R2 as the only file storage target.
