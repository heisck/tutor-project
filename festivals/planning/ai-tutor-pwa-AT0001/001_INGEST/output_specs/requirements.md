# Requirements

## P0 Requirements

### Secure Upload Intake
- Accept supported study materials including PDFs, slides, and documents.
- Reject unsupported or dangerous file types.
- Enforce a maximum upload size of 100MB.
- Validate both MIME type and file characteristics before processing.
Source: `FESTIVAL_GOAL.md`, `FESTIVAL_OVERVIEW.md`, `FESTIVAL_RULES.md`, `001_INGEST/PHASE_GOAL.md`

### Secure Storage and Ownership
- Store uploaded files securely with per-user isolation.
- Use signed access patterns rather than public buckets.
- Ensure ownership checks exist anywhere document data is accessed.
Source: `FESTIVAL_OVERVIEW.md`, `FESTIVAL_RULES.md`

### Asynchronous Processing Pipeline
- Process uploaded files asynchronously rather than blocking the request path.
- Track document processing state through a defined state machine.
- Support failure and retry states without losing document truth.
Source: `FESTIVAL_OVERVIEW.md`, `001_INGEST/PHASE_GOAL.md`

### Structured Extraction
- Convert raw files into machine-readable sections and text blocks.
- Detect and record visual assets such as images and diagrams.
- Preserve enough structure for downstream planning, teaching, quiz, and revision engines.
Source: `FESTIVAL_OVERVIEW.md`, `001_INGEST/PHASE_GOAL.md`

### Trust and Safety
- Treat uploaded document contents as content, never as instructions.
- Keep database records as the source of truth.
- Sanitize and safely handle extracted content before downstream use.
Source: `FESTIVAL_GOAL.md`, `FESTIVAL_OVERVIEW.md`, `FESTIVAL_RULES.md`

## P1 Requirements

### Traceability
- Preserve traceability from original document content to extracted sections and assets.
- Support downstream mapping from source units into later concepts and lesson structures.
Source: `FESTIVAL_OVERVIEW.md`

### Operational Readiness
- Expose processing status clearly enough for later dashboard and document status views.
- Make the ingestion output usable by the planning phase without revisiting raw inputs.
Source: `FESTIVAL_GOAL.md`, `FESTIVAL_OVERVIEW.md`, `TODO.md`

### Testing and Verification
- Every ingestion module must ship with tests.
- Validation, parsing, and state handling must be verifiable in CI.
Source: `FESTIVAL_GOAL.md`, `FESTIVAL_RULES.md`

## P2 Requirements

### Future Compatibility
- Keep extracted metadata rich enough for later concept extraction, retrieval, lesson planning, and image explanation improvements.
- Preserve room for document versioning and concept carry-over rules defined in the overview.
Source: `FESTIVAL_OVERVIEW.md`

## Explicit Non-Requirements for This Phase
- No tutoring behavior
- No quiz generation
- No personalization engine behavior
- No voice tutor flow
- No mastery or coverage logic beyond preparing the source content they will depend on
Source: `TODO.md`, `001_INGEST/PHASE_GOAL.md`, `FESTIVAL_OVERVIEW.md`
