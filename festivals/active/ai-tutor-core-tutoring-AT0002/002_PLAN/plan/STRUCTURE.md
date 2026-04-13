# Festival Structure

## Festival Goal
Build the v1 core tutoring system on top of the AT0001 foundation so a learner can upload a document, have it parsed into teachable structure, study concept by concept through an adaptive SSE tutor, ask grounded questions, pause and resume cleanly, and finish with mastery-aware coverage tracking.

## Hierarchy

- **Festival:** `ai-tutor-core-tutoring-AT0002`
  - **Phase 001:** `001_INGEST` (`ingest`)
    - Review source materials and prior foundation context
    - Extract purpose, requirements, constraints, and context
    - Produce approved `output_specs/` artifacts for planning
  - **Phase 002:** `002_PLAN` (`planning`)
    - Review ingest outputs and festival requirements
    - Decompose the tutoring system into executable implementation phases
    - Produce FEST planning artifacts for downstream execution
  - **Phase 003:** `003_CONTENT_PIPELINE` (`implementation`)
    - **Sequence 01:** `01_ingestion_pipeline`
      - Task 01: Tutoring data schema and shared contracts
      - Task 02: Background worker retrieval and parser orchestration
      - Task 03: PDF normalized extraction
      - Task 04: PPTX and DOCX normalized extraction
      - Task 05: Visual asset extraction and Claude vision descriptions
      - Task 06: Section and asset persistence plus processing-state transitions
      - Task 07: Document structure read endpoint
      - Gate 08: Testing and verification
      - Gate 09: Code review
      - Gate 10: Review results and iterate
      - Gate 11: Fest commit changes
  - **Phase 004:** `004_KNOWLEDGE_GRAPH` (`implementation`)
    - **Sequence 01:** `01_knowledge_modeling`
      - Task 01: SourceUnit traceability generation
      - Task 02: Chunking and embedding persistence
      - Task 03: Retrieval service scoped to user and document
      - Task 04: Atomic Teachable Unit mapping pipeline
      - Task 05: Concept graph, prerequisite, and misconception analysis
      - Task 06: Coverage ledger initialization and integrity checks
      - Gate 07: Testing and verification
      - Gate 08: Code review
      - Gate 09: Review results and iterate
      - Gate 10: Fest commit changes
  - **Phase 005:** `005_SESSION_PLANNING` (`implementation`)
    - **Sequence 01:** `01_session_orchestration`
      - Task 01: Study session schema and lifecycle APIs
      - Task 02: Mini calibration capture and learning-profile bootstrap
      - Task 03: Lesson segment generation and teaching-plan persistence
      - Task 04: Session handoff snapshot and resume restoration
      - Task 05: Session state read model and ownership enforcement
      - Gate 06: Testing and verification
      - Gate 07: Code review
      - Gate 08: Review results and iterate
      - Gate 09: Fest commit changes
  - **Phase 006:** `006_TUTOR_RUNTIME` (`implementation`)
    - **Sequence 01:** `01_adaptive_tutor`
      - Task 01: Tutor SSE event contract and stream transport
      - Task 02: Tutor next-step orchestration and grounded prompt assembly
      - Task 03: Learner response evaluation, confusion scoring, and error classification
      - Task 04: Mastery state transitions, question rotation, and no-fake-mastery enforcement
      - Task 05: Reteach, simpler, skip, explanation diversity, and cognitive-load controls
      - Task 06: Coverage audit, cross-concept linking, and memory-compression rules
      - Gate 07: Testing and verification
      - Gate 08: Code review
      - Gate 09: Review results and iterate
      - Gate 10: Fest commit changes
  - **Phase 007:** `007_TUTOR_EXPERIENCE` (`implementation`)
    - **Sequence 01:** `01_session_experience`
      - Task 01: Tutor session shell and SSE rendering
      - Task 02: Calibration, response submission, and KaTeX-capable explanation UI
      - Task 03: Pause, resume, session continuity, and session summary UI
      - Task 04: Assistant question endpoint integration and in-session assistant UI
      - Task 05: Hallucination feedback capture and alert-threshold workflow
      - Gate 06: Testing and verification
      - Gate 07: Code review
      - Gate 08: Review results and iterate
      - Gate 09: Fest commit changes
  - **Phase 008:** `008_RUNTIME_HARDENING` (`implementation`)
    - **Sequence 01:** `01_guardrails_and_verification`
      - Task 01: AI timeout, fallback, and token-budget enforcement
      - Task 02: AI usage logging, rate limiting, and ownership-safe runtime guardrails
      - Task 03: Prompt-injection defense and weak-grounding refusal paths
      - Task 04: SSE stability, reconnect behavior, and end-to-end verification
      - Gate 05: Testing and verification
      - Gate 06: Code review
      - Gate 07: Review results and iterate
      - Gate 08: Fest commit changes

## Ordering Rules

- `001_INGEST` is the approved input source for planning.
- `003_CONTENT_PIPELINE` must complete before any ATU, concept, or tutoring work begins.
- `004_KNOWLEDGE_GRAPH` depends on persisted sections, assets, and processing outputs from `003_CONTENT_PIPELINE`.
- `005_SESSION_PLANNING` depends on the concept graph, coverage primitives, and retrieval structures from `004_KNOWLEDGE_GRAPH`.
- `006_TUTOR_RUNTIME` depends on lesson segments, session state, and retrieval from `005_SESSION_PLANNING`.
- `007_TUTOR_EXPERIENCE` depends on stable tutor and assistant runtime behavior from `006_TUTOR_RUNTIME`.
- `008_RUNTIME_HARDENING` is last because it verifies and hardens the end-to-end tutoring system rather than inventing new product scope.
- No phase may introduce quiz, revision, voice, or post-v1 analytics features.

## Dependency Summary

- `AT0001` foundation is a hard prerequisite for all AT0002 implementation phases.
- `DocumentSections`, `DocumentAssets`, `ConceptNodes`, `StudySessions`, `EmbeddingChunks`, `CoverageLedger`, `MasteryState`, `LearningProfiles`, and `UserFeedback` primitives must be introduced before dependent runtime behavior.
- Retrieval must be ownership-scoped before tutor or assistant endpoints are exposed.
- Session lifecycle and lesson planning must exist before SSE tutor delivery is implemented.
- Tutor runtime must be stable before web-session experience and hallucination feedback surfaces are added.
- Final hardening must verify prompt-injection defense, token budgets, timeouts, rate limits, SSE stability, and end-to-end continuity.
