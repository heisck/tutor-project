---
fest_type: task
fest_id: 01_tutoring_data_schema_and_shared_contracts.md
fest_name: tutoring data schema and shared contracts
fest_parent: 01_ingestion_pipeline
fest_order: 1
fest_status: completed
fest_autonomy: medium
fest_created: 2026-04-13T17:14:31.820499643Z
fest_updated: 2026-04-13T18:09:50.825350405Z
fest_tracking: true
---


# Task: tutoring data schema and shared contracts

## Objective

Add the database models, shared contracts, and internal types required to persist tutoring-ready document sections, assets, and parser output safely.

## Requirements

- [ ] Define the persistence primitives needed for `DocumentSections`, `DocumentAssets`, and source-trace metadata without breaking the AT0001 foundation.
- [ ] Export shared contracts that later ingestion, retrieval, and tutor phases can consume without duplicating types.

## Implementation

1. Extend the Prisma schema and shared package with the tables, enums, and DTOs needed for persisted sections, assets, and source mappings.
2. Add database-access helpers and exported shared types in the existing package structure rather than introducing parallel type systems.
3. Keep naming and ownership fields aligned with the document model introduced in AT0001.
4. Add model-level tests that verify the new schema can persist and retrieve valid tutoring structure primitives.

## Done When

- [ ] All requirements met
- [ ] Prisma schema, shared exports, and model tests pass without breaking existing foundation modules