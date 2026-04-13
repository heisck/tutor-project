# Extraction Notes

## Purpose
- Build an adaptive AI tutoring system for uploaded learning materials
- The product teaches, checks understanding, adapts, and resumes
- Success means the learner can upload, learn concept by concept, be checked, resume later, and ask grounded questions

## Requirements
- Parse PDF, PPTX, and DOCX into structured units
- Extract text, visuals, tables, formulas, captions, and meaningful labels
- Build SourceUnits, ATUs, Concepts, prerequisites, and teaching plan
- Support tutor flow, confusion handling, mastery updates, session resume, and grounded assistant answers
- Keep retrieval scoped to the owning user and document

## Constraints
- TypeScript strict mode, Fastify, Prisma, PostgreSQL, pgvector
- BullMQ for background processing
- Cloudflare R2 for storage
- Claude for LLM and vision, OpenAI text-embedding-3-small for embeddings
- LLM calls under 8000 total tokens
- No cross-user leakage
- Prompt injection defense required
- v1 only, no post-v1 features

## Context
- AT0001 already built auth, upload, sessions, and base schema
- AT0002 builds the tutoring engine on top of that foundation
- The system is a tutor, not a summarizer or generic chatbot
- Key engines include ingestion, ATU mapping, analysis, planning, tutoring, confusion detection, assistant, handoff, and coverage audit
