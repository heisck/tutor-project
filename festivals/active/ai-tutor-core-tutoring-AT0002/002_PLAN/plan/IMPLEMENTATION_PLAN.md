# Implementation Plan

## Execution Overview

This festival delivers the v1 tutoring stack on top of the completed AT0001 foundation. Execution starts with content ingestion and persistence, then moves into knowledge modeling, study-session planning, tutor runtime behavior, learner-facing session experience, and final hardening.

The plan stays inside AT0002 scope only:
- ingest processed documents into tutoring-ready structure
- map content into teachable knowledge
- build the session and teaching-plan runtime
- deliver grounded tutor and assistant behavior
- support pause, resume, and mastery-aware completion
- harden the system for safe v1 execution

The plan does not add quiz, revision, voice, or broader product features outside this festival.

## Working Assumptions For Decomposition

- Raw extraction is deterministic where possible, with LLM usage reserved for visual description, ATU mapping, concept analysis, teaching-plan generation, tutor output, and assistant output.
- Retrieval v1 uses top-k semantic retrieval scoped to the owning user and document; reranking is deferred unless a later approved decision adds it.
- Tutor runtime is implemented as an explicit persisted state machine, not an implicit procedural loop.
- Assistant fallback is constrained: if grounding is weak, the system narrows or refuses the answer rather than drifting outside the document.
- Low-quality or incomplete documents are surfaced through processing failure or partial-structure safeguards, not hidden behind fabricated tutoring output.

## Phase Breakdown

### Phase 003_CONTENT_PIPELINE

**Type:** implementation  
**Goal:** Turn stored uploaded documents into persisted tutoring-ready structure with secure processing, extracted sections, extracted assets, and readable structure APIs.

#### Sequence 01: Ingestion Pipeline

**Goal:** Build the end-to-end document processing worker and persistence layer that transforms uploaded files into normalized sections and assets.

**Tasks:**
- [ ] Task 01: Tutoring data schema and shared contracts
  - Add the database and shared-type primitives required for document sections, document assets, source metadata, and later tutoring flow.
- [ ] Task 02: Background worker retrieval and parser orchestration
  - Implement BullMQ job execution that fetches the owner-scoped file from R2, validates the job payload, and routes the file to the correct parser.
- [ ] Task 03: PDF normalized extraction
  - Extract ordered text blocks, tables, captions, formulas, and positional metadata from PDF files.
- [ ] Task 04: PPTX and DOCX normalized extraction
  - Extract ordered slide and document content for PPTX and DOCX with comparable traceability to PDF extraction.
- [ ] Task 05: Visual asset extraction and Claude vision descriptions
  - Persist extracted images and diagram assets, generate instructional descriptions, and store metadata for later teaching.
- [ ] Task 06: Section and asset persistence plus processing-state transitions
  - Persist `DocumentSections` and `DocumentAssets`, keep processing states aligned to the required lifecycle, and preserve retry and failure handling.
- [ ] Task 07: Document structure read endpoint
  - Implement `GET /api/v1/documents/:id/structure` with ownership checks for downstream tutor bootstrap and inspection.
- [ ] Gate 08: Testing and verification
- [ ] Gate 09: Code review
- [ ] Gate 10: Review results and iterate
- [ ] Gate 11: Fest commit changes

**Required Outcomes:**
- Supported documents parse into ordered stored sections
- Visual assets are extracted and described
- Processing-state transitions are durable and observable
- Structure can be read safely by the document owner

### Phase 004_KNOWLEDGE_GRAPH

**Type:** implementation  
**Goal:** Convert extracted document structure into retrieval-ready chunks, ATUs, concepts, misconceptions, prerequisites, and coverage primitives.

#### Sequence 01: Knowledge Modeling

**Goal:** Build the traceable knowledge layer that the planner, tutor, and assistant will rely on.

**Tasks:**
- [ ] Task 01: SourceUnit traceability generation
  - Convert persisted sections and assets into ordered `SourceUnit` records or equivalent persisted structures that preserve source mapping.
- [ ] Task 02: Chunking and embedding persistence
  - Split content into 512-token chunks with 50-token overlap, tag chunk metadata, and store embeddings in pgvector-backed persistence.
- [ ] Task 03: Retrieval service scoped to user and document
  - Implement top-k retrieval for tutor and assistant use while enforcing ownership and document scoping.
- [ ] Task 04: Atomic Teachable Unit mapping pipeline
  - Map source units into ATUs using a hybrid deterministic and LLM-assisted pipeline, with category, difficulty, explicit/implied, and exam-relevance metadata.
- [ ] Task 05: Concept graph, prerequisite, and misconception analysis
  - Group ATUs into concepts, identify prerequisite edges, record likely misconceptions, and persist graph structure in `ConceptNodes`.
- [ ] Task 06: Coverage ledger initialization and integrity checks
  - Initialize coverage tracking so every ATU is represented and no orphan source or concept nodes remain.
- [ ] Gate 07: Testing and verification
- [ ] Gate 08: Code review
- [ ] Gate 09: Review results and iterate
- [ ] Gate 10: Fest commit changes

**Required Outcomes:**
- Every meaningful extracted unit is represented in a traceable knowledge model
- Retrieval can return grounded chunks for the correct user and document
- Concepts, prerequisites, and misconceptions exist for planning and tutoring
- Coverage starts from a complete, auditable ledger

### Phase 005_SESSION_PLANNING

**Type:** implementation  
**Goal:** Create the study-session lifecycle, mini calibration, lesson planning, and session-handoff state required for adaptive tutoring.

#### Sequence 01: Session Orchestration

**Goal:** Make sessions durable, restartable, and ready to drive concept-by-concept tutoring.

**Tasks:**
- [ ] Task 01: Study session schema and lifecycle APIs
  - Implement session models and `POST /api/v1/sessions/start`, `GET /api/v1/sessions/:id/state`, `POST /api/v1/sessions/:id/pause`, and `POST /api/v1/sessions/:id/resume`.
- [ ] Task 02: Mini calibration capture and learning-profile bootstrap
  - Collect academic level, session goal, and preferred explanation start on first session launch and persist the result in `LearningProfiles`.
- [ ] Task 03: Lesson segment generation and teaching-plan persistence
  - Build the teaching planner so concepts become ordered lesson segments with explanation strategy, check prompt, and mastery gate data.
- [ ] Task 04: Session handoff snapshot and resume restoration
  - Persist current segment, mastery snapshot, explanation history, unresolved ATUs, and resume notes so sessions can restart exactly.
- [ ] Task 05: Session state read model and ownership enforcement
  - Build the session read path used by tutor startup and web resume flows, with strict ownership checks and deterministic state transitions.
- [ ] Gate 06: Testing and verification
- [ ] Gate 07: Code review
- [ ] Gate 08: Review results and iterate
- [ ] Gate 09: Fest commit changes

**Required Outcomes:**
- Study sessions start from the right document and learner context
- Mini calibration affects tutoring from the first explanation
- Teaching plans are persisted and replayable
- Sessions pause and resume without losing tutoring state

### Phase 006_TUTOR_RUNTIME

**Type:** implementation  
**Goal:** Deliver the adaptive tutor runtime that teaches, checks, reteaches, updates mastery, and finishes only after coverage and mastery rules pass.

#### Sequence 01: Adaptive Tutor

**Goal:** Implement the tutor decision loop, grounded SSE delivery, mastery rules, confusion handling, and completion controls.

**Tasks:**
- [ ] Task 01: Tutor SSE event contract and stream transport
  - Define the SSE message shape and implement transport for streaming tutor responses and structured completion events.
- [ ] Task 02: Tutor next-step orchestration and grounded prompt assembly
  - Implement `POST /api/v1/tutor/next` using lesson segments, compressed learner state, token-budget limits, prompt-injection wrappers, and top-5 retrieval.
- [ ] Task 03: Learner response evaluation, confusion scoring, and error classification
  - Implement `POST /api/v1/tutor/respond` so learner responses are evaluated for confusion, illusion-of-understanding, and error class before next actions are chosen.
- [ ] Task 04: Mastery state transitions, question rotation, and no-fake-mastery enforcement
  - Update `MasteryState` only after the required checks, including varied question types and transfer or error-spotting evidence.
- [ ] Task 05: Reteach, simpler, skip, explanation diversity, and cognitive-load controls
  - Implement `POST /api/v1/tutor/reexplain`, `POST /api/v1/tutor/simpler`, and `POST /api/v1/tutor/skip` with explanation diversity memory and pacing controls.
- [ ] Task 06: Coverage audit, cross-concept linking, and memory-compression rules
  - Run coverage and completion logic, connect new concepts to mastered ones, and compress recent learning after defined concept intervals.
- [ ] Gate 07: Testing and verification
- [ ] Gate 08: Code review
- [ ] Gate 09: Review results and iterate
- [ ] Gate 10: Fest commit changes

**Required Outcomes:**
- Tutor delivers one grounded concept at a time over SSE
- Confusion and mastery decisions are explicit and auditable
- Reteach and simplification flows change strategy instead of repeating failed explanations
- Sessions cannot complete while required ATUs remain unresolved

### Phase 007_TUTOR_EXPERIENCE

**Type:** implementation  
**Goal:** Expose the tutor and assistant behavior through a usable session interface that supports streaming, learner interaction, continuity, and feedback capture.

#### Sequence 01: Session Experience

**Goal:** Build the learner-facing v1 tutoring surface on top of the stable tutor runtime.

**Tasks:**
- [ ] Task 01: Tutor session shell and SSE rendering
  - Build the web session shell that starts or resumes tutoring and renders streamed tutor events in order.
- [ ] Task 02: Calibration, response submission, and KaTeX-capable explanation UI
  - Add the mini-calibration UI, learner response controls, and formula-safe rendering for tutor explanations.
- [ ] Task 03: Pause, resume, session continuity, and session summary UI
  - Surface exact resume behavior, interrupted-session restoration, and end-of-session summary data for the learner.
- [ ] Task 04: Assistant question endpoint integration and in-session assistant UI
  - Wire the grounded assistant flow into the live tutoring experience with SSE rendering and document-scoped context.
- [ ] Task 05: Hallucination feedback capture and alert-threshold workflow
  - Add feedback submission from explanation blocks, persist `UserFeedback`, and trigger the thresholded alert path required for repeated flagged concepts.
- [ ] Gate 06: Testing and verification
- [ ] Gate 07: Code review
- [ ] Gate 08: Review results and iterate
- [ ] Gate 09: Fest commit changes

**Required Outcomes:**
- Learners can actually use the tutor and assistant flows in the product
- Session continuity is visible and trustworthy
- Math renders safely
- Feedback capture exists for suspected hallucinations or bad explanations

### Phase 008_RUNTIME_HARDENING

**Type:** implementation  
**Goal:** Harden the tutoring system for safe v1 operation with strict runtime safeguards, adversarial coverage, and end-to-end verification.

#### Sequence 01: Guardrails and Verification

**Goal:** Ensure the complete tutoring stack is safe, measurable, and stable under realistic conditions.

**Tasks:**
- [ ] Task 01: AI timeout, fallback, and token-budget enforcement
  - Apply timeout handling, fallback behavior, and explicit per-call token budgeting for tutor, analysis, and assistant flows.
- [ ] Task 02: AI usage logging, rate limiting, and ownership-safe runtime guardrails
  - Record token usage per user, enforce tutor and assistant rate limits, and confirm every protected runtime path checks ownership.
- [ ] Task 03: Prompt-injection defense and weak-grounding refusal paths
  - Verify XML or equivalent trusted wrappers are used consistently and that weak retrieval produces constrained behavior instead of hallucinated answers.
- [ ] Task 04: SSE stability, reconnect behavior, and end-to-end verification
  - Validate SSE behavior, streaming resilience, and the complete learner journey from processed document to completed session.
- [ ] Gate 05: Testing and verification
- [ ] Gate 06: Code review
- [ ] Gate 07: Review results and iterate
- [ ] Gate 08: Fest commit changes

**Required Outcomes:**
- AI-touching endpoints are guarded, logged, and budgeted
- Prompt injection and weak-grounding cases are explicitly handled
- Streaming behavior is reliable enough for v1 use
- The full tutoring loop is verified end to end

## Dependency Order

| Item | Blocked By | Rationale |
|------|------------|-----------|
| Phase 003_CONTENT_PIPELINE | AT0001 foundation | Processing workers, storage access, and document ownership all depend on the existing foundation |
| Task 02: Background worker retrieval and parser orchestration | Task 01: Tutoring data schema and shared contracts | Processing code needs stable persistence and shared contracts first |
| Task 05: Visual asset extraction and Claude vision descriptions | Tasks 03-04 | Asset extraction depends on parser output and source traceability |
| Task 06: Section and asset persistence plus processing-state transitions | Tasks 02-05 | Persistence must happen after extraction is complete |
| Phase 004_KNOWLEDGE_GRAPH | Phase 003_CONTENT_PIPELINE | ATUs and concepts require persisted sections, assets, and normalized source structure |
| Task 03: Retrieval service scoped to user and document | Task 02: Chunking and embedding persistence | Retrieval cannot work before chunks and vectors exist |
| Task 05: Concept graph, prerequisite, and misconception analysis | Task 04: Atomic Teachable Unit mapping pipeline | Concepts depend on completed ATU generation |
| Phase 005_SESSION_PLANNING | Phase 004_KNOWLEDGE_GRAPH | Session planning depends on retrieval, concepts, coverage primitives, and misconceptions |
| Task 03: Lesson segment generation and teaching-plan persistence | Tasks 01-02 | Teaching plans depend on session primitives and calibration input |
| Task 04: Session handoff snapshot and resume restoration | Task 03 | Resume state depends on a persisted planning model |
| Phase 006_TUTOR_RUNTIME | Phase 005_SESSION_PLANNING | Tutor runtime depends on session state, lesson segments, retrieval, and calibration |
| Task 03: Learner response evaluation, confusion scoring, and error classification | Task 02: Tutor next-step orchestration and grounded prompt assembly | Response handling depends on a working tutor turn model |
| Task 04: Mastery state transitions, question rotation, and no-fake-mastery enforcement | Task 03 | Mastery decisions require evaluated learner evidence |
| Phase 007_TUTOR_EXPERIENCE | Phase 006_TUTOR_RUNTIME | UI work depends on stable tutor and assistant contracts |
| Task 05: Hallucination feedback capture and alert-threshold workflow | Tasks 01-04 | Feedback flow needs the live tutoring surface and assistant flow to exist first |
| Phase 008_RUNTIME_HARDENING | Phases 003-007 | Hardening validates the whole tutoring stack and should not be guessed early |

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Parser behavior differs significantly across PDF, PPTX, and DOCX | High | High | Isolate parser tasks by format, normalize to a shared structure, and test each format independently |
| LLM-assisted ATU or concept generation becomes too non-deterministic | Medium | High | Keep deterministic pre-processing, validate output invariants, and block orphan ATUs or concepts in integrity checks |
| Retrieval leaks across documents or users | Medium | High | Make scoped retrieval a dedicated task with explicit ownership tests before tutor or assistant endpoints ship |
| Session state drifts from tutor runtime state | Medium | High | Persist an explicit session state model and verify handoff behavior before UI integration |
| Tutor runtime grows too broad in one task | Medium | Medium | Split streaming, orchestration, evaluation, mastery, reteach, and completion logic into separate atomic tasks |
| SSE behavior is unstable under realistic session use | Medium | High | Reserve final hardening for reconnect, stream-shape, and end-to-end SSE verification |
| Weak grounding encourages assistant hallucination | Medium | High | Add a dedicated weak-grounding refusal task and adversarial tests in final hardening |

## Global Rules For Execution

- Work phase by phase and do not skip dependency order.
- Keep every implementation task small enough to become a real FEST task file.
- Preserve TypeScript strictness, Zod validation, Prisma access, and ownership enforcement throughout.
- Treat uploaded document content as data, never instructions.
- Use retrieved chunks rather than raw full documents in all LLM-facing runtime paths.
- Add tests for every touched engine, endpoint, and persistence boundary.
- Keep AT0002 inside tutoring-engine v1 scope only; do not add quiz, revision, voice, or unrelated product work.
