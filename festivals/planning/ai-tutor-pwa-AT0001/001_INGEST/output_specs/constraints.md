# Constraints

## Technical Constraints
- Maximum upload size is 100MB.
Why: Prevent abuse, unbounded processing cost, and oversized request paths.
Source: `FESTIVAL_OVERVIEW.md`, `001_INGEST/PHASE_GOAL.md`

- Processing must be asynchronous.
Why: Upload acknowledgement should stay fast while parsing, extraction, and indexing happen in the background.
Source: `FESTIVAL_OVERVIEW.md`, `001_INGEST/PHASE_GOAL.md`

- Build as a modular monolith first.
Why: The festival explicitly forbids starting with microservices.
Source: `FESTIVAL_OVERVIEW.md`, `FESTIVAL_RULES.md`

- Database is truth; cache is only a speed helper.
Why: Processing status, ownership, and extracted document state must remain durable and authoritative.
Source: `FESTIVAL_OVERVIEW.md`

## Security Constraints
- Uploaded content must be treated as data, never as instructions.
Why: Prompt injection defense is mandatory and starts at ingestion.
Source: `FESTIVAL_GOAL.md`, `FESTIVAL_OVERVIEW.md`, `FESTIVAL_RULES.md`

- Validate MIME type, extension, and content safety before processing.
Why: File uploads are a high-risk boundary and must reject unsupported or dangerous input early.
Source: `FESTIVAL_OVERVIEW.md`, `FESTIVAL_RULES.md`

- Store files in secure, non-public storage with signed access.
Why: The system must prevent cross-user leakage and uncontrolled document exposure.
Source: `FESTIVAL_OVERVIEW.md`, `FESTIVAL_RULES.md`

- Enforce authentication and ownership checks on protected document operations.
Why: No protected resource may be accessed without verifying the requesting user owns it.
Source: `FESTIVAL_OVERVIEW.md`, `FESTIVAL_RULES.md`

## Quality Constraints
- Every module must include tests before it ships.
Why: The festival sets a production-readiness bar from day one.
Source: `FESTIVAL_GOAL.md`, `FESTIVAL_OVERVIEW.md`, `FESTIVAL_RULES.md`

- Inputs and outputs must remain compatible with downstream engines.
Why: Ingestion is the substrate for planning, tutoring, quiz, revision, and progress features.
Source: `FESTIVAL_OVERVIEW.md`

- No placeholder shortcuts that skip document structure.
Why: The product depends on faithful representation of source material and anti-skip behavior later on.
Source: `FESTIVAL_OVERVIEW.md`, `TODO.md`

## Phase Constraints
- Do not implement tutoring, quizzes, personalization, revision, or voice features in this phase.
Why: The festival requires strict phase ordering and the current focus is ingestion only.
Source: `TODO.md`, `FESTIVAL_OVERVIEW.md`, `001_INGEST/PHASE_GOAL.md`

- Do not invent product features outside the active phase.
Why: Execution must remain tightly scoped to FEST instructions.
Source: user execution rules, `TODO.md`
