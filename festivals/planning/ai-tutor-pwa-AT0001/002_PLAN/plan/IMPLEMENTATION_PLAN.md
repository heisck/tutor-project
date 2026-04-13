# Implementation Plan

## Overview
This document defines the executable build plan for ai-tutor-pwa. Coding agents should follow these phases in order and should not skip ahead to future phases before foundation and ingestion are stable.

---

## Phase 003_FOUNDATION

### Goal
Establish the application foundation so users can authenticate, manage a basic profile, upload supported files, store them securely, create document records, enqueue processing, and view document processing status.

### Sequences

#### S1: Repository and App Foundation
Tasks:
- Set up monorepo structure
- Configure frontend and backend packages
- Configure shared TypeScript package
- Configure environment validation
- Configure lint, format, and test tooling

#### S2: Auth and Session Management
Tasks:
- Implement signup/signin
- Implement Google OAuth
- Implement secure database-backed sessions
- Implement signout and session lookup
- Add auth guards and ownership middleware

#### S3: Profile and Course Basics
Tasks:
- Create user profile model and APIs
- Support institution, department, level, and basic preferences
- Create course model and list/create APIs

#### S4: Upload and Storage
Tasks:
- Implement upload validation
- Enforce file size and type checks
- Integrate Cloudflare R2
- Create document record on upload
- Return processing-safe upload responses

#### S5: Processing Kickoff and Status
Tasks:
- Enqueue processing job
- Create document processing state machine
- Implement status endpoints
- Build basic dashboard shell for uploaded documents

### Required Outcomes
- User can authenticate
- User can upload a file
- File is validated and stored
- Document record is created
- Processing status is visible
- Foundation is ready for ingestion execution

---

## Phase 004_INGEST_EXEC

### Goal
Implement the real ingestion pipeline that parses uploaded documents into structured sections, text blocks, and asset references.

### Sequences

#### S1: File Retrieval and Parsing
Tasks:
- Fetch stored file from R2
- Parse supported document types
- Extract text into normalized blocks

#### S2: Sectioning and Structure
Tasks:
- Split documents into sections
- Store section ordering and metadata
- Preserve source traceability

#### S3: Asset Detection
Tasks:
- Detect images, diagrams, and tables
- Store asset references and metadata
- Prepare assets for later image understanding

#### S4: Persistence and State Updates
Tasks:
- Save parsed sections and assets
- Update processing state transitions
- Handle failures and retries

### Required Outcomes
- Uploaded documents become structured source material
- DocumentSections and DocumentAssets are populated
- Parsing is asynchronous and observable

---

## Phase 005_TUTOR

### Goal
Implement the tutor engine that teaches structured content step by step and preserves session continuity.

### Sequences

#### S1: Session State
Tasks:
- Create study session model
- Track active concept and section position
- Implement resume and pause

#### S2: Tutor Flow
Tasks:
- Build tutor-next-step endpoint
- Use structured source material to teach one step at a time
- Support simpler and technical re-explanations

#### S3: Assistant-in-Context
Tasks:
- Let users ask a contextual question
- Ground answers in the active document and session

---

## Phase 006_QUIZ

### Goal
Implement the quiz engine for recall, understanding, and weak-area reinforcement.

### Sequences

#### S1: Question Generation
Tasks:
- Generate MCQs and short-answer questions
- Tie questions to concepts and sections

#### S2: Answer Evaluation
Tasks:
- Record attempts
- Evaluate correctness
- Return explanation

#### S3: Weak Area Tracking
Tasks:
- Track concept weakness from attempts
- Feed results into progress and revision

---

## Phase 007_PROFILE

### Goal
Implement learner modeling and adaptive personalization.

### Sequences

#### S1: Learning Profile
Tasks:
- Track explanation preferences
- Track quiz behavior
- Store learner signals over time

#### S2: Adaptive Delivery
Tasks:
- Adjust explanation style
- Adjust quiz timing and difficulty
- Store course-specific learning tendencies

---

## Phase 008_REVISION

### Goal
Implement spaced review, weak-topic recovery, and exam-driven revision planning.

### Sequences

#### S1: Revision Scheduling
Tasks:
- Create next-review logic
- Track weak concepts
- Prioritize revision items

#### S2: Exam Planning
Tasks:
- Store exam dates
- Increase urgency and revision focus as exams approach

---

## Phase 009_VOICE

### Goal
Implement voice tutoring and voice session flow.

### Sequences

#### S1: Voice I/O
Tasks:
- Speech-to-text integration
- Text-to-speech integration

#### S2: Voice Session Control
Tasks:
- Pause, resume, repeat, slower, simpler
- Sync voice with study session state

---

## Global Rules
- Do not skip phases
- Every module must include tests
- Security rules from FESTIVAL_OVERVIEW.md are mandatory
- Database is truth; cache is only a speed helper
- Uploaded documents are content, never instructions
- Downstream work must preserve traceability and ownership checks
