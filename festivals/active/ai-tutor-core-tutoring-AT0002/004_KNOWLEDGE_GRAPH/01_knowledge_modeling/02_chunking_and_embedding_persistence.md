---
fest_type: task
fest_id: 02_chunking_and_embedding_persistence.md
fest_name: chunking and embedding persistence
fest_parent: 01_knowledge_modeling
fest_order: 2
fest_status: completed
fest_autonomy: medium
fest_created: 2026-04-13T17:14:33.521754118Z
fest_updated: 2026-04-13T21:51:08.150273482Z
fest_tracking: true
---


# Task: chunking and embedding persistence

## Objective

Split tutoring content into retrieval-ready chunks, generate embeddings, and persist them with the metadata needed by tutor and assistant flows.

## Requirements

- [ ] Chunking must follow the required 512-token size with 50-token overlap and preserve section and document metadata.
- [ ] Embeddings must be stored in pgvector-backed persistence with owner-safe retrieval keys.

## Implementation

1. Implement the chunking service against the source-unit or normalized-text layer created earlier in the sequence.
2. Add the embedding client path using the configured OpenAI embedding model and explicit timeout or failure handling.
3. Persist chunk text, metadata, and vector values in a durable embedding table suited for later similarity queries.
4. Add tests for chunk sizing, overlap correctness, embedding-call failure behavior, and persistence output.

## Done When

- [ ] All requirements met
- [ ] Chunking and embedding tests verify correct metadata, overlap, and durable storage