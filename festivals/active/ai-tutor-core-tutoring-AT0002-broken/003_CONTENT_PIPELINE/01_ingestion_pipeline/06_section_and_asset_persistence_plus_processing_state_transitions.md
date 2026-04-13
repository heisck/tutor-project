---
fest_type: task
fest_id: 06_section_and_asset_persistence_plus_processing_state_transitions.md
fest_name: section and asset persistence plus processing state transitions
fest_parent: 01_ingestion_pipeline
fest_order: 6
fest_status: pending
fest_autonomy: medium
fest_created: 2026-04-13T17:14:32.133995474Z
fest_tracking: true
---

# Task: section and asset persistence plus processing state transitions

## Objective

Persist normalized sections and assets to the database and drive document processing through the required ingestion lifecycle states.

## Requirements

- [ ] Persisted structure must remain traceable to the source document, page or slide position, and asset ownership.
- [ ] Processing state transitions must match the FEST specification and behave correctly across retries and terminal failures.

## Implementation

1. Add persistence services that write normalized sections and assets in a transactional way where appropriate.
2. Update the worker flow so status moves through `processing`, `extracting`, `indexing`, `complete`, `failed`, and `retrying` in the correct order.
3. Make retry paths safe by preventing duplicate persistence or orphaned state when jobs rerun.
4. Add integration tests for successful persistence, duplicate-run safety, and failure-state behavior.

## Done When

- [ ] All requirements met
- [ ] Persistence and processing-state integration tests prove correct lifecycle behavior and durable structure storage
