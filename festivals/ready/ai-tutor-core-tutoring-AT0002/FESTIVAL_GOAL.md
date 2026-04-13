---
fest_type: festival
fest_id: AT0002
fest_name: ai-tutor-core-tutoring
fest_status: planning
fest_created: 2026-04-13
fest_tracking: true
---
# ai-tutor-core-tutoring

**Status:** Planned | **Created:** 2026-04-13

## Festival Objective

**Primary Goal:** Build the complete core tutoring engine that ingests a processed document, analyzes it like a teacher, builds a teaching plan, and delivers a fully adaptive guided tutoring session with mastery tracking, confusion detection, session continuity, and assistant question answering.

**Vision:** A student uploads a document and the system does not just summarize it. It extracts every teachable idea, builds a concept graph, plans a teaching sequence, and delivers explanations one concept at a time using story-first and surface-first logic. The tutor watches how the student responds, detects confusion early, varies explanation types, tracks mastery with evidence, and resumes cleanly across sessions. Every AI response is grounded in the document. Nothing is skipped silently.

## Success Criteria

### Ingestion and Extraction
- [ ] PDF and slide documents parsed into SourceUnits covering all text, bullets, tables, formulas, captions, and diagram labels
- [ ] Every visible meaningful element becomes at least one SourceUnit, nothing dropped silently
- [ ] Images and visual regions extracted and passed to vision model for instructional description
- [ ] Extracted visuals stored as DocumentAssets with description and metadata
- [ ] All extracted content stored in DocumentSections and DocumentAssets tables

### Chunking and Embedding
- [ ] Document split into 512-token chunks with 50-token overlap
- [ ] Each chunk tagged with section, page, and concept metadata
- [ ] Chunk embeddings generated using OpenAI text-embedding-3-small
- [ ] Embeddings stored in EmbeddingChunks table using pgvector
- [ ] Retrieval returns top 5 most relevant chunks per tutor or assistant request
- [ ] Retrieval strictly scoped to document owner, no cross-user leakage

### ATU Mapping and Analysis
- [ ] Every SourceUnit mapped to at least one Atomic Teachable Unit
- [ ] ATU categories assigned: definition, fact, process_step, comparison, cause_effect, formula_rule, example, exception, visual_meaning, prerequisite, likely_test_point
- [ ] Analysis engine identifies key concepts, prerequisite links, difficulty scores, and likely misconceptions per concept
- [ ] Predicted misconceptions stored per concept for use by tutor before teaching
- [ ] Concept graph built linking concepts to ATUs and prerequisites
- [ ] Every ATU assigned to a Concept, no orphan ATUs allowed
- [ ] Coverage ledger initialized with all ATUs marked not_taught

### Teaching Planner
- [ ] Teaching planner builds lesson sequence from analyzed concepts
- [ ] Prerequisites taught before dependent concepts
- [ ] Every segment includes explanation strategy, analogy, check prompt, and mastery gate
- [ ] Source order preserved alongside pedagogical order
- [ ] Every segment mapped back to its source ATUs and SourceUnits

### Mini Calibration
- [ ] On first session with a document, system collects mini calibration before teaching begins
- [ ] Collects: academic level, study goal for this session, preferred explanation start
- [ ] Takes under 60 seconds, stored in LearningProfiles table
- [ ] Tutor uses calibration result from the very first explanation

### Tutor Engine
- [ ] Tutor delivers explanations one concept at a time
- [ ] Story-first rule enforced: real-world picture or story before formal definition
- [ ] Surface-first rule enforced: what it does, simple example, real meaning, technical version, edge cases
- [ ] Safe-start rule enforced: never opens with technical definition before grounding idea in plain language
- [ ] No-block rule enforced: never uses unknown word without immediately explaining it in simple terms
- [ ] Tutor decision loop executed at every step in exact defined order
- [ ] Abstraction ladder used: moves between concrete, example, concept, system, and abstract levels
- [ ] Transition intelligence: every concept connected to previous before moving on
- [ ] Session narrative maintained: learner always knows where they are in the journey
- [ ] Prediction rule applied: common misconceptions warned before teaching high-risk concepts
- [ ] Proactive misconception prevention, not just reactive correction
- [ ] All tutor output voice-friendly: no slide references, visuals described in words, short turns
- [ ] KaTeX syntax used for all math and formula output
- [ ] All tutor responses streamed via Server-Sent Events

### Confusion and Mastery
- [ ] Confusion Signal Engine detects: long pauses, vague answers, filler phrases, repeated paraphrasing, correct words with weak reasoning
- [ ] Confusion score tracked per concept per session
- [ ] Illusion of Understanding Detector flags: correct answer with weak explanation, keyword matching without reasoning, fast correct answers followed by failed transfer
- [ ] Error Classification applied before reteaching: misconception, partial understanding, surface memorization, careless mistake, guessing, vocabulary block
- [ ] Explanation Diversity Memory tracks which explanation types used per concept, never repeats failed type
- [ ] Failure Recovery Ladder applied in order when learner keeps struggling: clearer explanation, different type, prerequisite, concrete example, contrast, shrink task, diagnose
- [ ] Mastery state tracked per concept: not_taught, taught, checked, weak, partial, mastered
- [ ] No-Fake-Mastery Gate enforced: concept only mastered after taught, checked twice in different ways, one check requiring explanation or application, one check requiring transfer or error spotting, no high illusion flag, confusion below threshold
- [ ] Cognitive Load Regulator adjusts pacing and chunk size based on confusion and error rate
- [ ] Cross-Concept Linking Engine connects new concepts to previously mastered ones
- [ ] Memory Compression run after every 3 to 5 concepts: compress into simple mental model

### Question Types
- [ ] Quiz and check questions rotate across all 12 types: recall, paraphrase, compare and contrast, apply to new case, transfer to new domain, error spotting, sequence the steps, cause-effect reasoning, prerequisite link, compression, reverse reasoning, boundary case
- [ ] Never only recall questions
- [ ] Loop Closure Rule enforced: usage-level question asked before marking concept complete

### Assistant Engine
- [ ] Student can ask freeform questions at any time during session
- [ ] Assistant answers grounded in document chunks only
- [ ] Top 3 most relevant chunks retrieved per assistant question
- [ ] Assistant stays within document context, does not drift to unrelated topics
- [ ] Prompt injection defense enforced: document text cannot override system instructions
- [ ] Assistant ends answer with short understanding check when appropriate

### Session Continuity
- [ ] Session state saved after every tutor turn
- [ ] Student can close app and resume from exact stopping point
- [ ] Session Handoff Engine restores: current segment, mastery snapshot, explanation history, weak concepts, unresolved ATUs
- [ ] On resume, brief recheck of last weak or interrupted concept before continuing
- [ ] Mastered concepts not re-explained unless student requests
- [ ] Session states enforced: created, active, paused, abandoned, completed, incomplete
- [ ] Auto-pause after 30 minutes of inactivity

### Coverage Audit
- [ ] Coverage ledger updated after every concept taught and checked
- [ ] No session marked complete without coverage audit passing
- [ ] Audit distinguishes: taught, checked, mastered, unresolved
- [ ] Unresolved ATUs listed in session summary
- [ ] Session end summary shows: what learner now owns, what is still shaky, readiness estimate

### Hallucination Reporting
- [ ] Flag This button on every tutor explanation block
- [ ] UserFeedback table stores flagged content with reason and status
- [ ] Admin notified via Sentry alert if more than 3 users flag same concept

### Production Readiness
- [ ] Every engine has unit tests
- [ ] Every API endpoint has integration tests
- [ ] All AI calls have timeout and fallback handling
- [ ] All AI calls log token usage per user per day
- [ ] Token budget enforced per call type as defined in FESTIVAL_OVERVIEW.md
- [ ] Rate limiting enforced on all tutor and assistant endpoints
- [ ] Session ownership verified before every tutor call
- [ ] Prompt injection defense on every AI-touching endpoint
- [ ] Retrieval scoped to document owner only
- [ ] No cross-user session or retrieval leakage
- [ ] All responses sanitized before rendering
- [ ] Streaming via SSE tested under load
