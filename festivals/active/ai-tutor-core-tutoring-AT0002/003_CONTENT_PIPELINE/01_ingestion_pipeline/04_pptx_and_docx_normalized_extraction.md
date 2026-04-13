---
fest_type: task
fest_id: 04_pptx_and_docx_normalized_extraction.md
fest_name: pptx and docx normalized extraction
fest_parent: 01_ingestion_pipeline
fest_order: 4
fest_status: completed
fest_autonomy: medium
fest_created: 2026-04-13T17:14:32.000412715Z
fest_updated: 2026-04-13T21:50:04.368217356Z
fest_tracking: true
---


# Task: pptx and docx normalized extraction

## Objective

Add PPTX and DOCX extraction that produces the same tutoring-oriented normalized structure used by the PDF pipeline.

## Requirements

- [ ] PPTX and DOCX extraction must preserve ordered content, basic document structure, and meaningful labels needed for later tutoring.
- [ ] Output shape must stay consistent with the shared normalized extraction contract so downstream logic does not branch by format unnecessarily.

## Implementation

1. Add parser adapters for PPTX and DOCX that emit the same normalized block structure established by the PDF task.
2. Preserve slide or document location metadata, section titles, bullet ordering, and table-like content where available.
3. Reuse shared normalization utilities instead of format-specific persistence logic.
4. Add format-specific tests with representative fixtures and malformed-file failure cases.

## Done When

- [ ] All requirements met
- [ ] PPTX and DOCX extraction tests show consistent normalized output and safe error handling