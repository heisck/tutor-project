# Context

## Product Context
The product is an adaptive AI study platform for students who upload learning materials and receive structured teaching, quizzes, revision support, progress tracking, and exam preparation. The product should feel like a smart private tutor, not a document summarizer.

## Current Phase Context
`001_INGEST` is the foundation for everything that follows. Later systems can only teach, quiz, personalize, or resume sessions accurately if document ingestion first creates safe, structured, traceable content.

## Architectural Context
- Frontend: Next.js, TypeScript, Tailwind, PWA support
- Backend: Node.js, TypeScript, Zod validation
- Database: PostgreSQL with Prisma and pgvector
- Cache and queue: Redis plus BullMQ
- Storage: Cloudflare R2 with signed URLs
- AI stack later depends on retrieved structured document chunks rather than raw file dumps
Source: `FESTIVAL_OVERVIEW.md`

## Domain Context
- Users are students studying from PDFs, slides, docs, and similar course materials.
- The system must preserve per-user isolation and ownership.
- Uploaded files are educational content, not trusted instructions.
- Structured extraction is required for future concept mapping, tutoring, quizzes, flashcards, revision, and analytics.
Source: `FESTIVAL_GOAL.md`, `FESTIVAL_OVERVIEW.md`

## Competitive Context
Existing tools often summarize too shallowly, skip content, or fail to adapt to the learner. This product differentiates by building strong document understanding, evidence-based teaching, and personalization over time.
Source: `FESTIVAL_GOAL.md`, `FESTIVAL_OVERVIEW.md`

## Relevant Downstream Dependencies
- Planning needs structured outputs instead of raw files.
- Foundation implementation will need document records, storage, processing status, and extraction pipelines.
- Tutor and quiz systems later depend on extracted sections, assets, and document traceability.
Source: `TODO.md`, `003_FOUNDATION/01_implementation`, `FESTIVAL_OVERVIEW.md`

## Known Ambiguities to Resolve Later
- Exact supported file extensions beyond the broad categories of PDFs, slides, and documents
- Specific parsing and OCR tool choices
- Malware scanning vendor or strategy
- Exact schema details for extracted text blocks versus sections versus assets
- UX details for document updates and versioning prompts

These are implementation choices, not blockers for the ingest specification.
