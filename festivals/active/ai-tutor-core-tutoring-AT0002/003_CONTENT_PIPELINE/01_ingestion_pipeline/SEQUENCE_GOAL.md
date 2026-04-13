---
fest_type: sequence
fest_id: 01_ingestion_pipeline
fest_name: ingestion pipeline
fest_parent: 003_CONTENT_PIPELINE
fest_order: 1
fest_status: completed
fest_created: 2026-04-13T17:14:25.314619295Z
fest_updated: 2026-04-13T21:50:53.615245161Z
fest_tracking: true
fest_working_dir: .
---


# Sequence Goal: 01_ingestion_pipeline

**Sequence:** 01_ingestion_pipeline | **Phase:** 003_CONTENT_PIPELINE | **Status:** Pending | **Created:** 2026-04-13T17:14:24Z

## Sequence Objective

**Primary Goal:** Implement the end-to-end ingestion worker, parser, persistence, and read-model flow that converts uploaded files into tutoring-ready structure.

**Contribution to Phase Goal:** This sequence produces the normalized sections, assets, status transitions, and structure endpoint that every later ATU, concept, retrieval, and tutor workflow depends on.

## Success Criteria

The sequence goal is achieved when:

### Required Deliverables

- [ ] **Worker and parser orchestration**: BullMQ processing jobs retrieve owner-scoped files from R2 and route them to the correct parser.
- [ ] **Normalized tutoring structure**: Parsed output is persisted as `DocumentSections` and `DocumentAssets` with source ordering and positional traceability.
- [ ] **Protected structure access**: The owner can read document structure through a secured API endpoint.

### Quality Standards

- [ ] **Processing integrity**: Processing states, retries, and failures are durable and observable.
- [ ] **Security and isolation**: All worker and API paths enforce document ownership and reject invalid or unsafe inputs.

### Completion Criteria

- [ ] All tasks in sequence completed successfully
- [ ] Quality verification tasks passed
- [ ] Code review completed and issues addressed
- [ ] Documentation updated

## Task Alignment

> **Note:** This table should be populated AFTER creating task files.
> SEQUENCE_GOAL.md defines WHAT to accomplish. Task files define HOW.
> Run `fest create task` to create tasks, then update this table.

| Task | Task Objective | Contribution to Sequence Goal |
|------|----------------|-------------------------------|
| 01_tutoring_data_schema_and_shared_contracts.md | Add the persistence and shared contracts required by ingestion | Establishes the schema and type foundation for the rest of the sequence |
| 02_background_worker_retrieval_and_parser_orchestration.md | Run owner-scoped processing jobs and route files to parsers | Creates the runtime entrypoint for ingestion |
| 03_pdf_normalized_extraction.md | Extract ordered tutoring data from PDF files | Covers the highest-priority supported document format |
| 04_pptx_and_docx_normalized_extraction.md | Extract ordered tutoring data from PPTX and DOCX files | Completes v1 format support |
| 05_visual_asset_extraction_and_claude_vision_descriptions.md | Persist assets and create instructional visual descriptions | Adds the visual context later tutoring needs |
| 06_section_and_asset_persistence_plus_processing_state_transitions.md | Save normalized outputs and final processing states | Makes ingestion durable and trackable |
| 07_document_structure_read_endpoint.md | Expose protected document structure retrieval | Makes downstream consumers and verification possible |

## Dependencies

### Prerequisites (from other sequences)

- [ ] AT0001 foundation: authenticated uploads, secure storage, sessions, and document status records already exist.

### Provides (to other sequences)

- [ ] Persisted document structure and assets: Used by `004_KNOWLEDGE_GRAPH/01_knowledge_modeling`.

## Working Directory

Target project: `.` (relative to campaign root)

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Parser output differs across supported formats | High | High | Normalize all parser outputs to one persisted structure and verify each format independently |

## Progress Tracking

### Milestones

- [ ] **Milestone 1**: Schema, worker entrypoint, and parser contracts exist
- [ ] **Milestone 2**: Supported formats and assets persist into tutoring-ready tables
- [ ] **Milestone 3**: Protected structure endpoint and verification pass

## Quality Gates

### Testing and Verification

- [ ] All unit tests pass
- [ ] Integration tests complete
- [ ] Performance benchmarks met

### Code Review

- [ ] Code review conducted
- [ ] Review feedback addressed
- [ ] Standards compliance verified

### Iteration Decision

- [ ] Need another iteration? No
- [ ] If yes, new tasks created: None initially