---
fest_type: task
fest_id: 07_document_structure_read_endpoint.md
fest_name: document structure read endpoint
fest_parent: 01_ingestion_pipeline
fest_order: 7
fest_status: completed
fest_autonomy: medium
fest_created: 2026-04-13T17:14:32.189201248Z
fest_updated: 2026-04-13T21:50:25.553036393Z
fest_tracking: true
---


# Task: document structure read endpoint

## Objective

Expose a protected document-structure API that returns persisted sections and assets only to the owning user.

## Requirements

- [ ] `GET /api/v1/documents/:id/structure` must return the persisted structure required by downstream tutoring flows.
- [ ] The endpoint must reject unauthenticated access and cross-user access cleanly.

## Implementation

1. Add the API route, Zod-validated request handling, and response mapping for document structure reads.
2. Query persisted sections and assets through document-owner-aware database filters.
3. Return a stable response shape that later planning and tutor phases can consume without exposing unrelated internal fields.
4. Add integration tests for success, missing document handling, and cross-user rejection.

## Done When

- [ ] All requirements met
- [ ] Structure-endpoint integration tests verify valid owner access and cross-user isolation