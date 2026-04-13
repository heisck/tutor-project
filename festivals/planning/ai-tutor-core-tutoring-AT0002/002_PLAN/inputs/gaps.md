# Gaps and Open Questions

## Ambiguities

- Exact structure of ingestion pipeline steps (PDF vs PPTX differences)
- How ATUs are generated deterministically vs LLM-assisted
- Exact tutor decision loop implementation boundaries
- Confusion signal thresholds and scoring logic
- Mastery evaluation criteria thresholds

## Decisions Needed

- Chunking strategy implementation (where + when)
- ATU mapping: rule-based vs LLM hybrid
- Concept graph storage format
- Tutor engine orchestration (state machine vs procedural)
- SSE streaming structure and message format
- Retrieval ranking strategy (top-k vs reranking)

## Questions

- Should ingestion be fully deterministic or partially LLM-driven?
- How strict should mastery enforcement be in v1?
- How do we handle incomplete or low-quality documents?
- Should assistant fallback be allowed if retrieval is weak?

## Notes

No blockers. System is well-defined but requires design decisions before implementation.
