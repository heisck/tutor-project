---
fest_type: task
fest_id: 02_background_worker_retrieval_and_parser_orchestration.md
fest_name: background worker retrieval and parser orchestration
fest_parent: 01_ingestion_pipeline
fest_order: 2
fest_status: completed
fest_autonomy: medium
fest_created: 2026-04-13T17:14:31.868666891Z
fest_updated: 2026-04-13T18:21:07.959736688Z
fest_tracking: true
---


# Task: background worker retrieval and parser orchestration

## Objective

Implement the BullMQ processing worker that validates job inputs, retrieves the correct stored file from R2, and routes the file to the appropriate parser.

## Requirements

- [ ] Worker jobs must be ownership-safe, idempotent enough for retries, and compatible with the existing document processing lifecycle.
- [ ] Parser orchestration must dispatch by file type and surface unsupported or malformed input as controlled failures.

## Implementation

1. Add the worker runtime and queue-consumer entrypoint using the existing Redis and BullMQ patterns from the codebase.
2. Validate job payloads with typed schemas before any storage or parsing work begins.
3. Fetch the source file from R2 using owner-scoped document data rather than trusting queue payload fields alone.
4. Route validated inputs to parser adapters and map failures into deterministic processing-state updates and retry behavior.
5. Add integration tests for successful dispatch, invalid payload rejection, and retry-safe failure paths.

## Done When

- [ ] All requirements met
- [ ] Worker orchestration tests prove valid jobs dispatch correctly and invalid jobs fail safely without cross-user leakage