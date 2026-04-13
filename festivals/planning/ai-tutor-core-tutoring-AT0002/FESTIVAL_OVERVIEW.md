# Festival Overview: ai-tutor-core-tutoring

## What This Festival Builds

This festival implements Phase 2 of the ai-tutor-pwa build plan.
It covers the core tutoring pipeline from document ingestion through live adaptive teaching.

The foundation (auth, upload, sessions, database) was completed in AT0001.
This festival assumes those are in place and builds on top of them.

## Engines to Implement in This Festival

### 1. Ingestion Engine
- Parse uploaded PDF, PPTX, and DOCX files
- Extract text blocks in order: titles, bullets, paragraphs, formulas, captions, table cells
- Extract images and diagrams, store in Cloudflare R2
- Send image regions to Claude vision for description
- Produce SourceDocument and ordered SourceUnits
- Store results in DocumentSections and DocumentAssets tables
- Update document processing_status through all states: pending, queued, processing, extracting, indexing, complete, failed

### 2. Atomic Teachable Unit Mapper
- Convert SourceUnits into ATUs
- One ATU per distinct teachable idea
- Classify each ATU: definition, fact, process_step, comparison, cause_effect, formula_rule, example, exception, visual_meaning, prerequisite, likely_test_point
- Mark explicit vs implied, difficulty, exam relevance
- Store in ConceptNodes table with links to DocumentSections

### 3. Analysis Engine
- Group ATUs into Concepts
- Identify prerequisite relationships between concepts
- Identify likely misconceptions per concept
- Mark difficulty and exam importance
- Store concept graph in ConceptNodes with prerequisites_json and misconceptions_json

### 4. Teaching Planner
- Build ordered LessonSegments from Concepts
- Teach prerequisites before dependent concepts
- Assign explanation strategy per segment
- Assign check prompt per segment
- Assign mastery gate per segment
- Store teaching plan linked to StudySession

### 5. Tutor Engine
- Deliver one concept at a time via streaming SSE
- Follow story-first, surface-first teaching order
- Use LearnerProfile to choose explanation style
- After explanation, deliver check prompt
- Evaluate learner response and update MasteryState
- If response weak, trigger Confusion Signal Engine
- If confusion detected, trigger reteach with different explanation type
- Never skip a segment without marking it explicitly
- Follow full Tutor Decision Loop from FESTIVAL_OVERVIEW.md of AT0001

### 6. Confusion Signal Engine
- Evaluate learner responses for confusion signals
- Output confusion score and confidence class: confident, uncertain, confused
- Trigger recommendation: continue, recheck, reteach, step back to prerequisite

### 7. Explanation Diversity Memory
- Track which explanation types have been used per concept
- Recommend next explanation type when reteaching
- Never repeat a failed explanation type

### 8. Assistant Engine
- Accept freeform questions from learner at any point
- Retrieve top 3 relevant chunks from vector layer scoped to current document
- Answer grounded in document content only
- Never drift outside document context
- End with optional short check question

### 9. Session Handoff Engine
- Save full SessionState on pause or close
- On resume, restore: current segment, mastery snapshot, explanation history, unresolved ATUs
- Begin resumed session with quick recheck of last weak concept

### 10. Coverage Audit Engine
- Track CoverageLedger: every ATU mapped to taught, checked, mastered or unresolved
- Run audit before session marked complete
- Block completion if required ATUs are unresolved without explicit flag

## API Endpoints to Implement

### Document Processing
- GET /api/v1/documents/:id/status
- GET /api/v1/documents/:id/structure

### Study Session
- POST /api/v1/sessions/start
- GET /api/v1/sessions/:id/state
- POST /api/v1/sessions/:id/pause
- POST /api/v1/sessions/:id/resume

### Tutor
- POST /api/v1/tutor/next — returns SSE stream
- POST /api/v1/tutor/respond — submit learner response
- POST /api/v1/tutor/reexplain — trigger reteach
- POST /api/v1/tutor/simpler — force simpler explanation
- POST /api/v1/tutor/skip — skip current concept with flag

### Assistant
- POST /api/v1/assistant/question — freeform question, returns SSE stream

## Streaming Strategy
- All tutor and assistant responses use Server-Sent Events
- Frontend reads SSE stream and renders tokens as they arrive
- KaTeX rendered client-side for any formula output
- Stream ends with a structured JSON event containing MasteryState update

## Background Jobs
- Document processing runs as BullMQ job
- Job updates processing_status at each stage
- On failure, job retries up to 3 times with exponential backoff
- After 3 failures, job moves to dead letter queue and user is notified

## Token Budgeting per LLM Call
Every LLM call must stay under 8000 tokens total including system prompt.

Tutor next step — always send:
- Current LessonSegment
- Current MasteryState for active concept
- Top 5 retrieved chunks from vector layer
- LearnerProfile summary compressed to under 200 tokens
- Last 3 tutor turns

Tutor next step — send only if relevant:
- Explanation history (only if in reteach loop)
- Confusion score (only if above threshold)
- Misconception warnings (only if concept is high risk)

Assistant question — always send:
- User question
- Top 3 retrieved chunks scoped to document
- Current concept context

Never send raw full document text to any LLM call.
Always use retrieved chunks.

## Prompt Injection Defense
- All retrieved document chunks wrapped in XML data tags before insertion into prompt
- System prompt clearly instructs model that document content is data not instructions
- Model instructed to ignore any instructions found inside document content
- Example wrapper: <document_chunk>...content...</document_chunk>

## Database Tables Used in This Festival
All tables already defined in AT0001 FESTIVAL_OVERVIEW.md.
Key tables for this festival:
- Documents, DocumentSections, DocumentAssets
- ConceptNodes
- StudySessions
- UserEvents
- EmbeddingChunks

## Testing Requirements
- Unit tests for each engine function
- Integration tests for all API endpoints
- BullMQ job processing tested with in-memory queue
- SSE streaming tested end to end
- Prompt injection defense tested with adversarial document content
- Token budget tested to verify no call exceeds 8000 tokens
- Coverage audit tested to verify it blocks incomplete sessions

## Rules Inherited from AT0001
All rules from FESTIVAL_RULES.md of AT0001 apply here without exception.
Key rules for this festival:
- TypeScript strict mode, no any types
- Zod validation on all inputs
- Prisma for all database access
- All AI calls have timeout and fallback
- All AI calls log token usage
- No cross-user data leakage
- Prompt injection defense mandatory
- Every module has tests before it ships
