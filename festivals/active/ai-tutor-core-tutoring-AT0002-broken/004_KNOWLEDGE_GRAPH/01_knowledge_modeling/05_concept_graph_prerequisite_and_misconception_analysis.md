---
fest_type: task
fest_id: 05_concept_graph_prerequisite_and_misconception_analysis.md
fest_name: concept graph prerequisite and misconception analysis
fest_parent: 01_knowledge_modeling
fest_order: 5
fest_status: pending
fest_autonomy: medium
fest_created: 2026-04-13T17:14:33.643803656Z
fest_tracking: true
---

# Task: concept graph prerequisite and misconception analysis

## Objective

Analyze ATUs into concepts, prerequisite relationships, misconceptions, and concept-level metadata that the teaching planner can use directly.

## Requirements

- [ ] Every ATU must belong to a concept and no concept graph edge may point to non-existent objects.
- [ ] Misconception and prerequisite metadata must be persisted in a form that later tutor logic can consume without re-analysis.

## Implementation

1. Implement the concept-analysis service that groups ATUs into concepts and derives prerequisite and misconception metadata.
2. Persist concept graph information in the existing concept storage model with explicit validation of edges and references.
3. Ensure the output shape supports predicted misconception warnings before teaching begins.
4. Add tests for graph integrity, missing-reference rejection, and representative misconception persistence.

## Done When

- [ ] All requirements met
- [ ] Concept-analysis tests verify complete ATU coverage and graph integrity
