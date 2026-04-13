# Festival Structure

## Festival Goal
Build an adaptive AI study platform that turns uploaded learning materials into guided tutoring, intelligent quizzes, personalized revision, and exam-focused support, while staying secure, traceable, and production-ready from day one.

## Hierarchy

- **Festival:** `ai-tutor-pwa-AT0001`
  - **Phase 001:** `001_INGEST` (`ingest`)
    - Review source inputs and festival requirements
    - Extract purpose, requirements, constraints, and context
    - Produce approved `output_specs/` artifacts
  - **Phase 002:** `002_PLAN` (`planning`)
    - Review festival goal, overview, rules, and ingest outputs
    - Decompose the product into implementation phases, sequences, and tasks
    - Record architecture decisions
    - Produce execution-ready planning artifacts
  - **Phase 003:** `003_FOUNDATION` (`implementation`)
    - **Sequence 01:** `01_implementation`
      - Task 01: Repository and app foundation
      - Task 02: Auth and sessions
      - Task 03: Profile and courses
      - Task 04: Upload and storage
      - Task 05: Document records and processing status
      - Gate 06: Testing and verification
      - Gate 07: Code review
      - Gate 08: Review results and iterate
      - Gate 09: Fest commit changes
  - **Phase 004:** `004_INGEST_EXEC` (`implementation`)
    - **Sequence 01:** File retrieval and parser orchestration
      - Fetch stored files from R2
      - Validate processing job inputs and ownership
      - Parse supported study document formats
    - **Sequence 02:** Sectioning and source-unit extraction
      - Normalize extracted text into sections and ordered source units
      - Preserve page, slide, and positional traceability
      - Prepare chunking metadata for later retrieval
    - **Sequence 03:** Asset detection and persistence
      - Detect images, diagrams, tables, and asset metadata
      - Persist `DocumentSections` and `DocumentAssets`
      - Finalize ingestion state transitions and retry handling
  - **Phase 005:** `005_TUTOR` (`implementation`)
    - **Sequence 01:** Session state foundation
      - Study session model
      - Pause, resume, and session lookup
      - Ownership-aware session access
    - **Sequence 02:** Tutor teaching flow
      - Tutor next-step orchestration
      - Grounded explanation flow
      - Simpler and technical re-explanation routes
    - **Sequence 03:** Assistant in context
      - Ask-a-question endpoint
      - Retrieved-context grounding
      - Response sanitization and logging
  - **Phase 006:** `006_QUIZ` (`implementation`)
    - **Sequence 01:** Question generation
      - Multi-type quiz generation
      - Concept and section traceability
    - **Sequence 02:** Answer evaluation
      - Attempt recording
      - Correctness and explanation responses
    - **Sequence 03:** Weak-topic tracking
      - Weak-area persistence
      - Quiz results integration with progress data
  - **Phase 007:** `007_PROFILE` (`implementation`)
    - **Sequence 01:** Learning profile capture
      - General learning preferences
      - Course-specific profile primitives
    - **Sequence 02:** Adaptive delivery controls
      - Explanation-style adaptation
      - Quiz-frequency and pacing adjustments
  - **Phase 008:** `008_REVISION` (`implementation`)
    - **Sequence 01:** Revision scheduling
      - Weak-concept review scheduling
      - Flashcard and spaced-review state
    - **Sequence 02:** Exam planning
      - Exam date storage
      - Exam-driven urgency and prioritization
  - **Phase 009:** `009_VOICE` (`implementation`)
    - **Sequence 01:** Voice transport
      - Speech-to-text integration
      - Text-to-speech integration
    - **Sequence 02:** Voice tutoring controls
      - Pause, resume, repeat, slower, and simpler commands
      - Voice-safe session continuity

## Ordering Rules

- `001_INGEST` is the approved source for planning inputs.
- `003_FOUNDATION` must finish before real ingestion execution starts.
- `004_INGEST_EXEC` must finish before tutor or quiz behavior is implemented.
- `005_TUTOR` and `006_QUIZ` unlock `007_PROFILE` and `008_REVISION`.
- `009_VOICE` depends on stable tutor session state and grounded tutoring flows.
- Every implementation phase must preserve ownership checks, typed validation, database truth, and test coverage for touched modules.

## Dependencies

- `002_PLAN` depends on approved `001_INGEST/output_specs/`
- `003_FOUNDATION` depends on the planning artifacts in `002_PLAN/`
- `004_INGEST_EXEC` depends on foundation storage, auth, queue, and document-status infrastructure
- `005_TUTOR` depends on structured documents from `004_INGEST_EXEC`
- `006_QUIZ` depends on extracted and traceable document structure from the ingestion work
- `007_PROFILE`, `008_REVISION`, and `009_VOICE` depend on the earlier core study flows being stable
