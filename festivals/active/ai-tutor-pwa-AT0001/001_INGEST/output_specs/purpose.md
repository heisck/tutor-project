# Purpose

## Festival Purpose
Build a production-ready AI tutoring PWA that turns uploaded study materials into structured learning experiences: guided tutoring, quizzes, revision support, progress tracking, and exam preparation.

## Immediate Phase Purpose
Phase `001_INGEST` exists to make uploaded learning materials safe, valid, securely stored, and structurally usable by later systems. This phase ends with machine-readable document structure, not teaching behavior.

## Problem Being Solved
Raw PDFs, slides, and documents are not safe or useful enough to feed directly into an AI tutor. The product needs an ingestion pipeline that can:
- accept supported study files,
- validate and isolate them securely,
- extract sections, text blocks, and visual assets,
- preserve traceability back to the original document,
- and hand off structured output for downstream planning and implementation.

## Why It Matters
- Students need a system that behaves like a tutor, not a shallow summarizer.
- Later engines depend on trustworthy document structure and ownership boundaries.
- Prompt injection defense starts at ingestion because uploaded content is data, never instructions.
- A weak ingestion layer would compromise tutoring quality, security, and traceability across the entire product.

## Success Outcomes
- Students can upload supported study files up to the allowed size limit.
- Files are validated, stored securely, and processed asynchronously.
- The system extracts structured sections, text blocks, and visual assets.
- Processing state is tracked from upload through completion or failure.
- Outputs are usable by later planning, tutoring, quiz, and revision systems without reinterpreting raw files.

## Phase Boundary
This phase does not implement tutor logic, quiz generation, personalization, revision, or voice behavior. It prepares the document substrate those systems will rely on later.

## Source Traceability
- `FESTIVAL_GOAL.md`: primary product goal, success criteria, production readiness bar
- `FESTIVAL_OVERVIEW.md`: product vision, architecture, ingestion expectations, security rules
- `FESTIVAL_RULES.md`: engineering, security, testing, and AI-handling constraints
- `TODO.md`: current focus on `001_INGEST`
- `001_INGEST/PHASE_GOAL.md`: ingest-specific objective, outputs, and constraints
