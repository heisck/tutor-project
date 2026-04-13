---
fest_type: task
fest_id: 06_coverage_ledger_initialization_and_integrity_checks.md
fest_name: coverage ledger initialization and integrity checks
fest_parent: 01_knowledge_modeling
fest_order: 6
fest_status: pending
fest_autonomy: medium
fest_created: 2026-04-13T17:14:33.685070833Z
fest_tracking: true
---

# Task: coverage ledger initialization and integrity checks

## Objective

Initialize the coverage ledger and integrity checks that guarantee every source and ATU is represented before tutoring starts.

## Requirements

- [ ] Coverage tracking must include every ATU with an auditable initial not-taught state.
- [ ] Integrity checks must block incomplete or orphaned knowledge graphs from moving into session planning.

## Implementation

1. Add the coverage-ledger initialization path that runs after ATU and concept persistence completes.
2. Build integrity checks for missing source mappings, orphan ATUs, orphan concepts, and incomplete prerequisite references.
3. Fail fast when integrity checks fail instead of allowing later tutor phases to run on partial data.
4. Add tests covering correct initialization and expected failures for malformed graphs.

## Done When

- [ ] All requirements met
- [ ] Coverage-ledger tests prove complete initialization and integrity-check enforcement
