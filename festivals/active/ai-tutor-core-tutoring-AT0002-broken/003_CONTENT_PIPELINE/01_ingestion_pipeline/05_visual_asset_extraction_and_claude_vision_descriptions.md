---
fest_type: task
fest_id: 05_visual_asset_extraction_and_claude_vision_descriptions.md
fest_name: visual asset extraction and claude vision descriptions
fest_parent: 01_ingestion_pipeline
fest_order: 5
fest_status: completed
fest_autonomy: medium
fest_created: 2026-04-13T17:14:32.077014473Z
fest_tracking: true
---

# Task: visual asset extraction and claude vision descriptions

## Objective

Extract visual assets from supported documents, store them safely, and create instructional descriptions through the configured Claude vision path.

## Requirements

- [ ] Visual assets must be stored with document ownership and metadata that link them back to the right document and section.
- [ ] Vision descriptions must be safe, bounded, and suitable for later grounded tutoring rather than generic captioning.

## Implementation

1. Add extraction hooks that capture image or visual regions during parsing and persist them to the configured private storage location.
2. Build the minimal Claude vision client path for asset description, with typed payloads, timeout handling, and explicit prompt-injection-safe wrappers.
3. Store asset metadata and descriptions in the new persistence model so later tutoring can reference them by section and document.
4. Add tests that cover asset persistence, mocked vision calls, and failure handling when asset description is unavailable.

## Done When

- [ ] All requirements met
- [ ] Asset extraction and mocked vision-description tests pass, including failure and timeout handling
