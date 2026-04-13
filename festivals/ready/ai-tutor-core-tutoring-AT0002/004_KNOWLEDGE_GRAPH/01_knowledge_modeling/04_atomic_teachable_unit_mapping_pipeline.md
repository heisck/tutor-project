---
fest_type: task
fest_id: 04_atomic_teachable_unit_mapping_pipeline.md
fest_name: atomic teachable unit mapping pipeline
fest_parent: 01_knowledge_modeling
fest_order: 4
fest_status: pending
fest_autonomy: medium
fest_created: 2026-04-13T17:14:33.603197705Z
fest_tracking: true
---

# Task: atomic teachable unit mapping pipeline

## Objective

Map persisted source units into Atomic Teachable Units with the metadata and categories required by the tutoring system.

## Requirements

- [ ] Every meaningful source unit must produce at least one ATU or a controlled failure that can be diagnosed.
- [ ] ATU outputs must include category, difficulty, exam relevance, and explicit-versus-implied metadata.

## Implementation

1. Implement the ATU mapping service using deterministic pre-processing plus structured LLM assistance where needed.
2. Constrain model output through typed schemas and source-mapping validation so malformed ATUs are rejected.
3. Persist ATUs with direct links back to source units and document sections.
4. Add tests for schema validation, orphan rejection, and representative category assignment.

## Done When

- [ ] All requirements met
- [ ] ATU mapping tests prove every persisted output is source-linked and schema-valid
