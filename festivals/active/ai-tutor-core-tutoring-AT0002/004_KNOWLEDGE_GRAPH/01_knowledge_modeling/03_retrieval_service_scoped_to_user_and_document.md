---
fest_type: task
fest_id: 03_retrieval_service_scoped_to_user_and_document.md
fest_name: retrieval service scoped to user and document
fest_parent: 01_knowledge_modeling
fest_order: 3
fest_status: completed
fest_autonomy: medium
fest_created: 2026-04-13T17:14:33.562212152Z
fest_updated: 2026-04-13T21:51:14.296022099Z
fest_tracking: true
---


# Task: retrieval service scoped to user and document

## Objective

Implement the retrieval service that returns only document-owner-scoped chunks for tutor and assistant grounding.

## Requirements

- [ ] Retrieval must enforce owner and document isolation before ranking or returning results.
- [ ] The service must support the top-k patterns required later by tutor and assistant endpoints.

## Implementation

1. Add a retrieval service that accepts validated user, document, and query input and performs scoped vector search.
2. Keep filtering and ownership checks in the database query path rather than relying on upstream callers.
3. Return a stable, typed response shape that includes chunk text and metadata needed by LLM prompt assembly.
4. Add integration tests covering successful retrieval, cross-user rejection, and empty-result behavior.

## Done When

- [ ] All requirements met
- [ ] Retrieval tests verify correct top-k behavior with strict user and document isolation