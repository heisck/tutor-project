---
fest_type: task
fest_id: 01_sourceunit_traceability_generation.md
fest_name: sourceunit traceability generation
fest_parent: 01_knowledge_modeling
fest_order: 1
fest_status: completed
fest_autonomy: medium
fest_created: 2026-04-13T17:14:33.474382393Z
fest_updated: 2026-04-13T21:50:59.241655761Z
fest_tracking: true
---


# Task: sourceunit traceability generation

## Objective

Create the source-traceability layer that turns persisted sections and assets into ordered `SourceUnit`-style knowledge inputs.

## Requirements

- [ ] Every meaningful section or asset contribution must remain traceable to document, section, and source position.
- [ ] The resulting structure must be durable enough for chunking, ATU mapping, and audit workflows.

## Implementation

1. Introduce the storage and service layer that materializes ordered source-unit records or equivalent source-mapping structures from persisted sections and assets.
2. Preserve positional metadata, unit categories, and links back to the originating document entities.
3. Reuse existing DB and shared-package patterns rather than inventing parallel models.
4. Add tests that verify deterministic source ordering and complete traceability for representative extracted structures.

## Done When

- [ ] All requirements met
- [ ] Source-unit generation tests prove stable ordering and complete source linkage