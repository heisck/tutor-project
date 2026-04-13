---
fest_type: task
fest_id: 03_pdf_normalized_extraction.md
fest_name: pdf normalized extraction
fest_parent: 01_ingestion_pipeline
fest_order: 3
fest_status: completed
fest_autonomy: medium
fest_created: 2026-04-13T17:14:31.931208191Z
fest_updated: 2026-04-13T18:36:32.328303978Z
fest_tracking: true
---


# Task: pdf normalized extraction

## Objective

Extract ordered tutoring-relevant content from PDF files into a normalized intermediate structure with positional traceability.

## Requirements

- [ ] PDF extraction must preserve reading order, section boundaries, and meaningful content such as formulas, captions, tables, and diagram labels when available.
- [ ] Extraction must produce deterministic structured output that later persistence and ATU mapping tasks can consume directly.

## Implementation

1. Add or wire the PDF parser dependency using repo patterns that fit the existing Node and TypeScript toolchain.
2. Normalize parser output into a shared intermediate model for text blocks, tables, captions, formulas, and source positions.
3. Explicitly mark low-confidence or missing extraction cases instead of silently discarding them.
4. Add unit and fixture-based tests covering ordered extraction, formula or caption handling, and malformed PDF failure behavior.

## Done When

- [ ] All requirements met
- [ ] PDF fixtures produce stable normalized extraction output with test coverage for both success and failure paths