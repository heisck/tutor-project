# D005: Retrieval Foundation

## Decision
Use PostgreSQL with pgvector and structured chunk metadata as the initial retrieval foundation.

## Why
Later tutor, assistant, and quiz engines must stay grounded in document context. The overview already selects pgvector, and keeping retrieval in PostgreSQL avoids premature complexity while preserving traceability to sections and source units.

## Benefits
- Retrieval stays close to durable document data
- Easier traceability from chunks back to documents, sections, and later concepts
- Lower operational complexity than a separate vector service early on

## Tradeoffs
- Query tuning will matter as scale grows
- Chunk schema design must be correct early to avoid rework later

## Result
Ingestion execution must preserve the metadata needed for later retrieval, but no full retrieval behavior should be implemented before the structured ingestion phase.
