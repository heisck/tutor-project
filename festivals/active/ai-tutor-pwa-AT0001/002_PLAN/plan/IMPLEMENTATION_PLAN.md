# Implementation Plan

## Overview
This document defines the executable build roadmap for `ai-tutor-pwa`. Agents must work phase by phase, starting with foundation and secure ingestion, before moving into tutoring, quizzes, personalization, revision, or voice.

## Phase Breakdown

### Phase 003_FOUNDATION

**Type:** implementation  
**Goal:** Establish the application foundation so authenticated users can upload supported files securely, create durable document records, enqueue processing, and monitor status from a basic dashboard shell.

#### Sequences

1. **Sequence 01: Implementation Foundation**
   - **Goal:** Deliver the minimum secure platform that all later phases depend on.
   - **Tasks:**
     - [ ] Task 01: Repository and app foundation
     - [ ] Task 02: Auth and sessions
     - [ ] Task 03: Profile and courses
     - [ ] Task 04: Upload and storage
     - [ ] Task 05: Document records and processing status
     - [ ] Gate 06: Testing and verification
     - [ ] Gate 07: Code review
     - [ ] Gate 08: Review results and iterate
     - [ ] Gate 09: Fest commit changes

#### Required Outcomes

- User can authenticate
- User can upload a supported file
- File is validated and stored securely
- A document record is created and tied to the owning user
- A processing job is enqueued successfully
- Processing status is visible to the owning user

### Phase 004_INGEST_EXEC

**Type:** implementation  
**Goal:** Implement the production ingestion pipeline that turns stored documents into structured sections, text blocks, and asset references for downstream tutoring and quiz engines.

#### Sequences

1. **Sequence 01: File Retrieval and Parsing**
   - **Goal:** Retrieve stored files securely and extract normalized raw content.
   - **Tasks:**
     - [ ] Fetch files from R2 for background processing
     - [ ] Parse supported PDF, slide, and document formats
     - [ ] Normalize raw text blocks with source-location metadata

2. **Sequence 02: Sectioning and Source Structure**
   - **Goal:** Build ordered, traceable document structure from parsed content.
   - **Tasks:**
     - [ ] Split content into ordered sections
     - [ ] Preserve page or slide metadata and raw-to-normalized traceability
     - [ ] Prepare source-unit structures compatible with later concept mapping

3. **Sequence 03: Asset Detection and Persistence**
   - **Goal:** Persist extracted structure and assets cleanly.
   - **Tasks:**
     - [ ] Detect images, diagrams, tables, and asset metadata
     - [ ] Persist `DocumentSections` and `DocumentAssets`
     - [ ] Finalize processing state transitions, retries, and failure handling

### Phase 005_TUTOR

**Type:** implementation  
**Goal:** Implement the grounded tutor engine that teaches structured content step by step and preserves study-session continuity.

#### Sequences

1. **Sequence 01: Session State**
   - **Goal:** Create the durable study-session foundation.
   - **Tasks:**
     - [ ] Create study-session models and APIs
     - [ ] Track current document section, concept position, and resume state
     - [ ] Implement pause, resume, and session-state retrieval

2. **Sequence 02: Tutor Flow**
   - **Goal:** Deliver grounded step-by-step teaching.
   - **Tasks:**
     - [ ] Build tutor-next-step orchestration
     - [ ] Teach one grounded step at a time from structured source material
     - [ ] Support simpler and technical re-explanation endpoints

3. **Sequence 03: Assistant in Context**
   - **Goal:** Let learners ask contextual questions without breaking grounding.
   - **Tasks:**
     - [ ] Implement contextual question answering during active study
     - [ ] Ground responses in the active document, section, and retrieved chunks
     - [ ] Sanitize responses and log AI usage

### Phase 006_QUIZ

**Type:** implementation  
**Goal:** Implement quiz generation, answer evaluation, and weak-topic tracking based on grounded document concepts.

#### Sequences

1. **Sequence 01: Question Generation**
   - **Goal:** Produce varied, traceable quiz questions.
   - **Tasks:**
     - [ ] Generate multiple quiz question types, not only recall
     - [ ] Tie each question to concept and source traceability

2. **Sequence 02: Answer Evaluation**
   - **Goal:** Evaluate answers and store the evidence needed later.
   - **Tasks:**
     - [ ] Record quiz attempts
     - [ ] Evaluate correctness and return grounded explanations
     - [ ] Capture response metadata needed for later personalization

3. **Sequence 03: Weak-Area Tracking**
   - **Goal:** Turn quiz outcomes into learning signals.
   - **Tasks:**
     - [ ] Persist weak concepts from quiz performance
     - [ ] Feed weak-topic data into progress and revision systems

### Phase 007_PROFILE

**Type:** implementation  
**Goal:** Implement learner modeling and adaptive personalization driven by observed behavior and stored preferences.

#### Sequences

1. **Sequence 01: Learning Profile**
   - **Goal:** Store learner preferences and observed signals safely.
   - **Tasks:**
     - [ ] Capture and update general learning preferences
     - [ ] Store observed learner signals and quiz behavior
     - [ ] Add per-course profile primitives

2. **Sequence 02: Adaptive Delivery**
   - **Goal:** Use learner data to adapt instruction responsibly.
   - **Tasks:**
     - [ ] Adapt explanation style and pacing
     - [ ] Adjust quiz timing and difficulty
     - [ ] Preserve evidence for future tuning and audits

### Phase 008_REVISION

**Type:** implementation  
**Goal:** Implement spaced review, weak-topic recovery, and exam-driven revision planning.

#### Sequences

1. **Sequence 01: Revision Scheduling**
   - **Goal:** Create the review engine foundation.
   - **Tasks:**
     - [ ] Create next-review logic
     - [ ] Persist weak-topic and review scheduling state
     - [ ] Prioritize revision items by urgency and weakness

2. **Sequence 02: Exam Planning**
   - **Goal:** Make revision sensitive to upcoming exams.
   - **Tasks:**
     - [ ] Store exam plans and exam dates
     - [ ] Increase urgency and revision focus as deadlines approach

### Phase 009_VOICE

**Type:** implementation  
**Goal:** Implement voice tutoring and audio-friendly study-session control on top of stable tutor flows.

#### Sequences

1. **Sequence 01: Voice I/O**
   - **Goal:** Add reliable voice transport.
   - **Tasks:**
     - [ ] Integrate speech-to-text
     - [ ] Integrate text-to-speech
     - [ ] Support audio-safe tutoring output formatting

2. **Sequence 02: Voice Session Control**
   - **Goal:** Keep voice tutoring aligned with tutor-session state.
   - **Tasks:**
     - [ ] Implement pause, resume, repeat, slower, and simpler controls
     - [ ] Keep voice state aligned with study-session state

## Dependencies

| Item | Blocked By | Rationale |
|------|------------|-----------|
| Phase 003_FOUNDATION | 002_PLAN artifacts | Foundation work must follow the approved phase and task breakdown |
| Task 02: Auth and sessions | Task 01: Repository and app foundation | Auth depends on runtime wiring, env validation, database access, and test harness setup |
| Task 03: Profile and courses | Task 02: Auth and sessions | Profile and course routes depend on authenticated user identity |
| Task 04: Upload and storage | Tasks 01-03 | Upload flows depend on app wiring, auth, and ownership context |
| Task 05: Document records and processing status | Task 04: Upload and storage | Document records and queue kickoff depend on valid stored uploads |
| Phase 004_INGEST_EXEC | Phase 003_FOUNDATION | Real ingestion needs auth, storage, queue, and document-state infrastructure first |
| Phase 005_TUTOR | Phase 004_INGEST_EXEC | Tutor flows require structured documents, not raw uploads |
| Phase 006_QUIZ | Phase 004_INGEST_EXEC | Quiz generation depends on extracted and traceable document structure |
| Phase 007_PROFILE | Phases 005_TUTOR and 006_QUIZ | Personalization depends on observed tutoring and quiz behavior |
| Phase 008_REVISION | Phases 005_TUTOR and 006_QUIZ | Revision scheduling depends on mastery and weak-area signals |
| Phase 009_VOICE | Phase 005_TUTOR | Voice tutoring depends on stable tutor session flows |

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Foundation tasks drift out of dependency order | Medium | High | Keep `003_FOUNDATION` task numbering aligned with dependency order and enforce it in workflow docs |
| Security rules get postponed until later phases | Medium | High | Require auth, ownership checks, typed validation, rate limiting, and secure storage in foundation tasks |
| Upload pipeline overreaches into parsing logic too early | Medium | Medium | Keep `003_FOUNDATION` limited to secure upload, storage, records, queue kickoff, and status only |
| Ingestion output is not traceable enough for later tutoring | Medium | High | Preserve section, source-unit, and asset traceability in `004_INGEST_EXEC` planning from the start |
| Future agents jump ahead to tutor or quiz work | Medium | High | Explicitly gate later phases behind completion of `003_FOUNDATION` and `004_INGEST_EXEC` |

## Global Rules

- Do not skip phases or task dependencies
- Every touched module must include tests
- Security rules from `FESTIVAL_OVERVIEW.md` and `FESTIVAL_RULES.md` are mandatory
- Database is truth; cache is only a speed helper
- Uploaded documents are content, never instructions
- Downstream work must preserve ownership checks, typed validation, and document traceability
