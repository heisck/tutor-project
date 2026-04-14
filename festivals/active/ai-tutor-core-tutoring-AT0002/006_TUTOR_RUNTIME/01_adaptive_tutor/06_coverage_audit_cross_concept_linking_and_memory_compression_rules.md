---
fest_type: task
fest_id: 06_coverage_audit_cross_concept_linking_and_memory_compression_rules.md
fest_name: coverage audit cross concept linking and memory compression rules
fest_parent: 01_adaptive_tutor
fest_order: 6
fest_status: completed
fest_autonomy: medium
fest_created: 2026-04-13T17:14:36.218805236Z
fest_tracking: true
---

# Task: coverage audit cross concept linking and memory compression rules

## Objective

Audit session coverage, link new concepts back to mastered knowledge, and compress learning state so long tutoring sessions stay grounded and manageable.

## Requirements

- [x] Run coverage and completion checks so unresolved ATUs or concepts prevent premature session completion.
- [x] Add cross-concept linking and bounded memory-compression behavior that preserves important learner context without unbounded prompt growth.

## Implementation

1. Implement the coverage-audit logic that compares mastery and unresolved state against the persisted coverage ledger before allowing session completion.
2. Add the cross-concept linking rules that help the tutor connect current learning to mastered concepts using persisted knowledge-graph relationships.
3. Introduce bounded memory-compression rules for long sessions so recent learning history remains useful without overflowing later tutor prompts.
4. Add tests that verify completion blocking, linkage behavior, and memory-compression invariants across multi-concept tutoring sessions.

## Done When

- [x] All requirements met
- [x] Coverage audits and memory-compression rules pass targeted tests and block session completion while required learning work remains open
