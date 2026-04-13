# Festival Overview: ai-tutor-pwa
# THIS IS THE CANONICAL MASTER SPEC
# All previous versions are superseded by this document
# Do not reference any earlier section if it conflicts with this one

## Product Vision

Build an adaptive AI study platform that turns uploaded learning materials into guided tutoring, intelligent quizzes, personalized revision, and exam-focused support. The system must feel like a smart private tutor, not a summarizer.

A student uploads a file and gets a smart tutor that teaches step by step, quizzes intelligently, tracks weak areas, and adapts to their learning style. The system remembers where the student stopped, builds a profile over time, and adapts every session to how that specific student forms meaning.

## v1 MVP Boundary

v1 ships when and only when the following works end to end:
- Signup and signin with Google OAuth and email/password
- Document upload and processing (PDF and PPTX)
- Core tutoring session with mastery tracking
- Assistant questions grounded in document
- Session resume from exact stopping point
- Basic progress view
- Basic dashboard

### Explicitly NOT in v1
- Stripe payments and subscriptions
- Admin panel
- Changelog page
- Crisp support chat
- PostHog analytics
- Cookie consent banner
- SEO optimization
- Email templates beyond signup verification and password reset
- Flashcard generation
- Quiz engine
- Voice mode
- Exam mode
- Revision engine
- Spaced repetition
- Reminders
- Exam planning
- GDPR data export
- Account deletion flow
- Feature flags
- Prompt versioning system
- Evaluation framework metrics
- Hallucination reporting UI
- Global concept registry across courses

Rule: agents must refuse to implement post-v1 items if asked during v1 festival execution
Rule: do not start post-v1 features until fest next returns a v2 festival task

## v1 Acceptance Checklist
v1 is done only when all of the following pass in staging:
- User signs up with email and verifies email
- User signs in with Google OAuth
- User uploads a PDF and sees processing progress
- User uploads a PPTX and sees processing progress
- Processing completes and document structure appears
- Tutoring session starts from document
- Mini calibration runs before first explanation
- Tutor delivers first explanation using story-first approach
- Learner responds and mastery state updates
- Confusion signal fires correctly on weak response
- Tutor reteaches using different explanation type
- Session is closed and resumed from exact stopping point
- Assistant answers a freeform question from document context only
- Assistant rejects a question that is not grounded in document
- Coverage audit runs before session marked complete
- Session summary shows what learner owns and what is shaky
- Second user cannot access first user documents or sessions
- Rate limiting blocks excess AI calls correctly
- Health endpoint returns healthy status for all services
- All CI checks pass on main branch

## Study Modes (all phases)
- Teach me from start to finish
- Quick summary
- Flashcards (post-v1)
- Quiz me now (post-v1)
- Difficult parts only (post-v1)
- Explain images and diagrams
- Voice tutor mode (post-v1)
- Exam mode (post-v1)
- Revision mode (post-v1)

## Architecture Decision
Modular monolith first. No microservices until v1 is proven at scale.

## Tech Stack (locked, no deviations)

### Frontend
- Next.js 14, TypeScript strict mode, Tailwind CSS
- Shadcn/ui as base component library
- Sonner for toast notifications
- KaTeX for math and formula rendering
- PWA support with service worker
- System font stack only, no custom fonts

### Backend
- Fastify, Node.js, TypeScript strict mode
- Zod for all input validation
- Integration tests use Fastify inject method with Vitest
- Supertest is not used in this project

### Database
- PostgreSQL via Supabase
- Prisma ORM
- pgvector extension for embeddings
- hnsw index for embedding queries
- Cosine similarity for all embedding retrieval

### Cache and Queue
- Redis via Upstash
- BullMQ for all background jobs

### File Storage
- Cloudflare R2
- Signed URLs only, no public buckets

### AI and Retrieval
- Primary LLM: claude-sonnet-4-20250514 via Anthropic API
- Vision: same Claude model
- Embeddings: OpenAI text-embedding-3-small
- Embeddings batched in groups of 100 per API call
- Each LLM call stays under 8000 tokens total including system prompt

### Auth
- Google OAuth and email/password
- Database sessions in PostgreSQL
- Session token in httpOnly secure cookie
- No tokens in localStorage or sessionStorage ever

### Testing
- Unit tests: Vitest
- Integration tests: Fastify inject with Vitest
- End-to-end tests: Playwright
- Minimum 80% coverage per module
- Jest is not used in this project

### CI/CD
- GitHub Actions
- Lint, type check, unit tests, integration tests on every PR
- Auto deploy to staging on merge to main
- Manual approve for production deployment
- Migrations run before app deployment

### Infrastructure
- Frontend: Vercel
- Backend: Railway with rolling deployments
- Database: Supabase PostgreSQL with pgvector
- Cache and Queue: Upstash Redis
- File Storage: Cloudflare R2
- Email: Resend
- Error Monitoring: Sentry
- Log shipping: Logtail
- Uptime monitoring: Better Uptime
- Analytics: PostHog (post-v1)

### Monorepo
- Turborepo manages pipeline
- npm workspaces manages packages
- packages/web — Next.js frontend
- packages/api — Fastify backend
- packages/db — Prisma schema and migrations
- packages/shared — shared TypeScript types
- packages/emails — React Email templates

### File Parsing Libraries (locked)
- PDF text extraction: pdf-parse
- PDF image region extraction: pdfjs-dist
- PPTX slide parsing: officeparser
- All parsing runs in BullMQ worker, never in main process

### Vision Image Format
- Images under 5MB sent to Claude as base64 inline
- Images over 5MB skipped and flagged for manual review
- All base64 images include correct MIME type prefix

## Canonical Database Schema
This is the single authoritative schema. All column lists from earlier in any document are superseded by this.

### PostgreSQL Types to Note
- All IDs: UUID, primary key, default gen_random_uuid()
- All timestamps: timestamptz, default now()
- Arrays: UUID[] or text[] as noted
- Vectors: vector(1536) for OpenAI embeddings
- Enums defined as PostgreSQL enum types

### Users
id UUID PK, email text unique not null, password_hash text nullable, auth_provider text not null default 'email', email_verified boolean default false, username text nullable, institution_id UUID nullable FK institutions, department text nullable, level text nullable, role text not null default 'student' check role in (student, admin), created_at timestamptz, updated_at timestamptz

### AuthSessions
id UUID PK, user_id UUID not null FK users on delete cascade, token_hash text not null unique, expires_at timestamptz not null, created_at timestamptz, ip_address text nullable, user_agent text nullable

### Institutions
id UUID PK, name text not null, country text nullable, type text nullable, created_at timestamptz

### Courses
id UUID PK, user_id UUID not null FK users on delete cascade, name text not null, code text nullable, level text nullable, created_at timestamptz

### LearningProfiles
id UUID PK, user_id UUID not null unique FK users on delete cascade, general_preferences_json jsonb default {}, inferred_preferences_json jsonb default {}, explanation_style text nullable, quiz_frequency_preference text nullable, voice_preference text nullable, academic_level text nullable check in (high_school, undergraduate, postgraduate, professional), study_goal_preference text nullable check in (pass_exam, deep_understanding, quick_overview, build_project), explanation_start_preference text nullable check in (example_first, direct, why_first), jargon_tolerance text default 'medium' check in (low, medium, high), wants_story_first boolean default true, wants_surface_first boolean default true, last_calibrated_at timestamptz nullable, updated_at timestamptz

### CourseProfiles
id UUID PK, user_id UUID not null FK users, course_id UUID not null FK courses, preferred_style_json jsonb default {}, weaknesses_json jsonb default {}, strengths_json jsonb default {}, mastery_summary_json jsonb default {}, updated_at timestamptz, unique user_id course_id

### Documents
id UUID PK, user_id UUID not null FK users on delete cascade, course_id UUID nullable FK courses, title text not null, file_url text not null, file_type text not null check in (pdf, pptx, docx), file_size bigint not null, processing_status text not null default 'pending' check in (pending, queued, processing, extracting, indexing, complete, failed, retrying), superseded_by UUID nullable FK documents, created_at timestamptz, updated_at timestamptz

### DocumentSections
id UUID PK, document_id UUID not null FK documents on delete cascade, section_index integer not null, title text nullable, raw_text text not null, normalized_text text nullable, summary text nullable, difficulty_score float nullable, importance_score float nullable, created_at timestamptz

### DocumentAssets
id UUID PK, document_id UUID not null FK documents on delete cascade, section_id UUID nullable FK document_sections, asset_type text not null check in (image, diagram, chart, table, formula), storage_url text not null, extracted_description text nullable, metadata_json jsonb default {}, created_at timestamptz

### SourceUnits
id UUID PK, document_id UUID not null FK documents on delete cascade, slide_number integer nullable, unit_type text not null check in (title, bullet, paragraph, formula, caption, table_cell, diagram_label, arrow_relation, example, footnote), raw_content text not null, position_on_slide text nullable, visual_reference UUID nullable FK document_assets, importance_score float default 0.5, extracted_from_visual boolean default false, created_at timestamptz

### AtomicTeachableUnits
id UUID PK, document_id UUID not null FK documents on delete cascade, source_unit_ids UUID[] not null, statement text not null, category text not null check in (definition, fact, process_step, comparison, cause_effect, formula_rule, example, exception, visual_meaning, prerequisite, likely_test_point), explicit_or_implied text not null check in (explicit, implied), exam_relevance text default 'medium' check in (low, medium, high), difficulty text default 'medium' check in (easy, medium, hard), concept_id UUID nullable FK concept_nodes, created_at timestamptz

### ConceptNodes
id UUID PK, document_id UUID not null FK documents on delete cascade, section_id UUID nullable FK document_sections, concept_name text not null, description text nullable, difficulty text default 'medium' check in (easy, medium, hard), relevance_level text default 'core' check in (core, supporting, low_priority), misconceptions_json jsonb default [], prerequisites_json jsonb default [], predicted_misconceptions_json jsonb default [], carried_over_from UUID nullable FK concept_nodes, created_at timestamptz

### LessonSegments
id UUID PK, document_id UUID not null FK documents on delete cascade, concept_ids UUID[] not null, atu_ids UUID[] not null, source_mapping_json jsonb default {}, explanation_strategy text nullable, analogy text nullable, spoken_visual_description text nullable, check_prompt text nullable, mastery_gate text nullable, created_at timestamptz

### EmbeddingChunks
id UUID PK, document_id UUID not null FK documents on delete cascade, section_id UUID nullable FK document_sections, chunk_index integer not null, content text not null, embedding vector(1536) not null, token_count integer not null, atu_ids UUID[] default [], metadata_json jsonb default {}, created_at timestamptz
Index: hnsw on embedding using vector_cosine_ops
Index: gin on atu_ids for array containment queries

### StudySessions
id UUID PK, user_id UUID not null FK users on delete cascade, document_id UUID not null FK documents, mode text not null check in (full, summary, flashcards, quiz, difficult_parts, images, voice, exam, revision), status text not null default 'created' check in (created, active, paused, abandoned, completed, incomplete), current_section_id UUID nullable FK document_sections, current_segment_id UUID nullable FK lesson_segments, current_step integer default 0, frustration_flag_count integer default 0, motivation_state text default 'neutral' check in (neutral, encouraged, challenged, frustrated), started_at timestamptz, last_active_at timestamptz, updated_at timestamptz

### MasteryStates
id UUID PK, user_id UUID not null FK users on delete cascade, concept_id UUID not null FK concept_nodes on delete cascade, session_id UUID nullable FK study_sessions, status text not null default 'not_taught' check in (not_taught, taught, checked, weak, partial, mastered), evidence_ids UUID[] default [], confusion_score float default 0, last_reviewed timestamptz nullable, transfer_passed boolean default false, compression_passed boolean default false, next_review_due timestamptz nullable, updated_at timestamptz, unique user_id concept_id

### Evidences
id UUID PK, user_id UUID not null FK users on delete cascade, concept_id UUID not null FK concept_nodes, session_id UUID not null FK study_sessions, prompt_id text nullable, response_type text not null check in (explanation, comparison, application, transfer, error_spotting, compression, recall, paraphrase), learner_response text not null, evaluation text not null check in (strong, partial, weak, wrong), confidence_estimate float nullable, created_at timestamptz

### CoverageLedger
id UUID PK, document_id UUID not null FK documents on delete cascade, session_id UUID not null FK study_sessions, atu_id UUID not null FK atomic_teachable_units, concept_id UUID not null FK concept_nodes, taught boolean default false, checked boolean default false, mastered boolean default false, compressed boolean default false, resolved_via_compression boolean default false, unresolved_gap boolean default false, notes text nullable, updated_at timestamptz, unique session_id atu_id

### ExplanationHistory
id UUID PK, session_id UUID not null FK study_sessions on delete cascade, concept_id UUID not null FK concept_nodes, explanation_type text not null check in (analogy, formal_definition, worked_example, concrete_example, contrast, visual_word_picture, step_by_step, common_mistake), used_at timestamptz, outcome text not null check in (successful, weak, failed)

### QuizSets
id UUID PK, user_id UUID not null FK users, document_id UUID not null FK documents, session_id UUID nullable FK study_sessions, mode text not null, difficulty text not null check in (easy, normal, hard), generated_at timestamptz

### QuizQuestions
id UUID PK, quiz_set_id UUID not null FK quiz_sets on delete cascade, concept_id UUID nullable FK concept_nodes, question_type text not null check in (recall, paraphrase, compare_contrast, apply, transfer, error_spotting, sequence, cause_effect, prerequisite_link, compression, reverse_reasoning, boundary_case), question_text text not null, options_json jsonb default [], correct_answer_json jsonb not null, explanation text not null, metadata_json jsonb default {}, created_at timestamptz

### QuizAttempts
id UUID PK, user_id UUID not null FK users, question_id UUID not null FK quiz_questions, answer_json jsonb not null, is_correct boolean not null, confidence_optional float nullable, response_time_ms integer nullable, attempted_at timestamptz

### Flashcards
id UUID PK, user_id UUID not null FK users on delete cascade, document_id UUID not null FK documents, concept_id UUID nullable FK concept_nodes, front_text text not null, back_text text not null, difficulty text default 'medium' check in (easy, medium, hard), next_review_at timestamptz nullable, created_at timestamptz

### UserEvents
id UUID PK, user_id UUID not null FK users on delete cascade, session_id UUID nullable FK study_sessions, event_type text not null check in (pause, resume, highlight, ask_question, replay_section, scroll_dwell, quiz_answered, confusion_override, frustration_flagged, concept_skipped, concept_compressed, tab_focus_lost, tab_focus_gained), payload_json jsonb default {}, created_at timestamptz

### Reminders
id UUID PK, user_id UUID not null FK users on delete cascade, type text not null, title text not null, trigger_at timestamptz not null, status text default 'pending' check in (pending, sent, dismissed), payload_json jsonb default {}, created_at timestamptz

### ExamPlans
id UUID PK, user_id UUID not null FK users on delete cascade, course_id UUID nullable FK courses, exam_date timestamptz not null, exam_type text nullable, intensity_preference text default 'normal' check in (light, normal, intense), created_at timestamptz

### UserFeedback
id UUID PK, user_id UUID not null FK users on delete cascade, session_id UUID nullable FK study_sessions, concept_id UUID nullable FK concept_nodes, content_type text not null check in (tutor_explanation, quiz_answer, assistant_answer), flagged_text text nullable, reason text not null, status text default 'pending' check in (pending, reviewed, confirmed_error, dismissed), created_at timestamptz

### PlanSubscriptions
id UUID PK, user_id UUID not null unique FK users on delete cascade, plan_type text not null default 'free' check in (free, paid), stripe_customer_id text nullable, stripe_subscription_id text nullable, status text default 'active' check in (active, cancelled, past_due), current_period_end timestamptz nullable, created_at timestamptz

### StripeEvents
id UUID PK, stripe_event_id text not null unique, type text not null, payload_json jsonb not null, processed_at timestamptz nullable, created_at timestamptz

### PromptVersions
id UUID PK, engine_name text not null, version text not null, changelog text not null, activated_at timestamptz nullable, deactivated_at timestamptz nullable, eval_score float nullable, unique engine_name version

### DocumentVersions
id UUID PK, original_document_id UUID not null FK documents, new_document_id UUID not null FK documents, created_at timestamptz

### AdminActions
id UUID PK, admin_user_id UUID not null FK users, action_type text not null, target_type text not null, target_id UUID not null, notes text nullable, created_at timestamptz

## State Ownership Map
This is the canonical contract for where every important piece of state lives.

### MasteryState
- Permanent home: PostgreSQL MasteryStates table
- Hot cache: Redis key mastery:{userId}:{conceptId} with TTL 2 hours
- Updated by: post-pass async after every tutor turn
- If cache stale or missing: reload from PostgreSQL, re-cache
- If post-pass fails: log error, keep previous state, retry on next turn

### SessionState
- Permanent home: PostgreSQL StudySessions table (status, current_segment_id, current_step)
- Hot cache: Redis key session:{sessionId} as JSON snapshot with TTL 24 hours
- If Redis TTL expires: reload from PostgreSQL, do not treat session as lost
- Updated by: post-pass async after every tutor turn
- If post-pass fails: log error, session continues, next turn will save

### ConfusionScore
- Temporary home: Redis key confusion:{userId}:{conceptId}:{sessionId} with TTL 2 hours
- Not persisted to PostgreSQL directly
- Derived and stored in MasteryStates.confusion_score when MasteryState is updated
- If cache missing: default to 0, recalculate from recent Evidences

### LearnerProfile Summary
- Permanent home: PostgreSQL LearningProfiles table
- Hot cache: Redis key profile:{userId} as compact JSON with TTL 1 hour
- Compact form includes only: explanation_style, jargon_tolerance, wants_story_first, wants_surface_first, academic_level, study_goal_preference
- Full form loaded from PostgreSQL only when preferences page is viewed
- Updated by: Learning Profile Engine in post-pass

### ExplanationHistory
- Permanent home: PostgreSQL ExplanationHistory table
- Hot cache: Redis key explhistory:{sessionId}:{conceptId} as array with TTL 2 hours
- Used by: Explanation Diversity Memory in pre-pass decision loop
- If cache missing: reload from PostgreSQL

### CoverageLedger
- Permanent home: PostgreSQL CoverageLedger table
- Not cached in Redis
- Updated by: post-pass async after every tutor turn
- Coverage audit reads directly from PostgreSQL

### Rate Limit Counters
- Home: Redis only, never PostgreSQL
- Key pattern: ratelimit:{endpoint}:{userId}:{windowKey}
- TTL: varies by endpoint, see rate limits section
- Never persisted, loss is acceptable

### Subscription Quota Counters
- Home: Redis for daily counters
- Key pattern: quota:user:{userId}:date:{YYYY-MM-DD}
- TTL: 25 hours
- Source of truth for daily limits: Redis counter
- Source of truth for plan type: PostgreSQL PlanSubscriptions

### Document Processing Status
- Home: PostgreSQL Documents.processing_status
- Not cached in Redis
- Worker updates directly in PostgreSQL after each state transition
- Frontend polls GET /api/v1/documents/:id/status

## Idempotency Contract

### Tutor Turn Duplicate Submissions
- Each tutor turn request must include a client-generated idempotency_key (UUID)
- Backend checks Redis key idempotent:tutor:{idempotencyKey} before processing
- If key exists: return cached response, do not reprocess
- If key missing: process, cache response in Redis with TTL 5 minutes, then return
- Key format: idempotent:tutor:{idempotencyKey}

### Document Processing Job Re-entry
- BullMQ job ID is document_id
- BullMQ deduplicates by job ID automatically
- If job already exists in queue: new enqueue is ignored
- If document status is already complete or failed: worker skips processing

### Upload Finish Duplicate Calls
- POST /api/v1/uploads/finish checks Documents.processing_status
- If already queued or beyond: return 200 with current status, do not re-enqueue
- Idempotent by design

### Stripe Webhook Duplicates
- Every webhook stored in StripeEvents table with stripe_event_id unique constraint
- If stripe_event_id already exists: return 200, do not reprocess
- Processing is idempotent for all webhook types

### Resend Webhook Duplicates
- Same pattern as Stripe using event ID from Resend payload

### Session Resume Race Condition
- Redis lock key: sessionlock:{userId} with TTL 30 seconds
- Only one session can be active per user at a time
- If lock exists when starting or resuming session: return 409 conflict
- Lock released when session is paused, abandoned, or completed

## Failure Policy for Partial Success

### Claude Streams Half Response Then Network Dies
- Frontend detects SSE stream closed without end signal
- Frontend shows: "Connection lost. Your session is saved. Tap to continue."
- Session state was already saved at start of turn, so resume is safe
- Partial response is not saved, next turn starts fresh for this concept

### Post-Pass Fails After Stream Succeeds
- Stream has already completed successfully for user
- Post-pass failure is logged to Sentry with session_id and concept_id
- Session continues normally
- Next pre-pass will use slightly stale state but will not crash
- Post-pass retried once automatically after 5 second delay
- If retry fails: logged, session marked for audit review, not interrupted

### Redis Save Succeeds But PostgreSQL Update Fails
- PostgreSQL is source of truth
- If PostgreSQL update fails: Redis cache is now stale
- Next pre-pass will load from Redis, get stale data
- Sentry alert fired on PostgreSQL update failure
- Admin can trigger session state reconciliation from admin panel
- This is an eventual consistency tradeoff, acceptable for tutoring

### PostgreSQL Update Succeeds But Coverage Ledger Update Fails
- Coverage ledger update retried once immediately
- If retry fails: logged to Sentry, concept marked as unresolved_gap in next coverage audit
- Session continues, audit will catch the gap

### Embedding Batch Partially Indexes
- Worker tracks which chunks were indexed in job payload
- If batch fails: retry only the failed chunks, not the whole document
- If chunk fails after 3 retries: mark chunk as unindexed in metadata_json
- Document can still be studied with partial indexing, retrieval degrades gracefully
- Admin notified via Sentry, can trigger re-indexing

### Parsing Extracts Text But Image Extraction Fails
- Image extraction failure does not fail whole document
- Text-only processing continues
- DocumentAssets entries skipped for failed images
- Document marked with has_image_extraction_failures flag in metadata
- User notified: some images may not be explained in tutoring

### SSE Connection Timeout
- SSE connection timeout: 45 seconds
- If Claude has not sent first token within 45 seconds: close SSE, return 504
- Frontend shows: "Tutor took too long to respond. Try again."
- Session state preserved, learner can retry same turn

### Anthropic API Mid-Stream Failure
- If Claude stops streaming mid-response: frontend detects stream closed without end signal
- Same behavior as network dies scenario above
- Partial response discarded, turn retried on next learner action

## Retrieval Policy

### During Active Teaching (ATU-specific retrieval)
Step 1: Query EmbeddingChunks where document_id matches AND atu_ids contains current ATU id
Step 2: If fewer than 3 results: supplement with top similarity chunks from same document
Step 3: Never retrieve chunks from future ATUs in the lesson sequence
Step 4: Cap at 5 chunks total

### During Assistant Questions (similarity retrieval)
Step 1: Embed learner question using OpenAI text-embedding-3-small
Step 2: Query EmbeddingChunks by cosine similarity scoped to current document_id
Step 3: Take top 3 results
Step 4: If similarity of top result is below 0.7: answer cautiously with disclaimer that document may not cover this topic

### Reranking Rule
After initial retrieval: rerank chunks by combining similarity score with importance_score from DocumentSections
Formula: final_score = (0.7 * similarity_score) + (0.3 * importance_score)
Take top results after reranking

### Minimum Evidence Rule
If no chunks retrieved above similarity 0.5: do not fabricate an answer
Return to learner: "I could not find enough context in your document to answer this. Try asking about a specific section."

### Cross-User Isolation
All retrieval queries must include WHERE document_id IN (SELECT id FROM documents WHERE user_id = current_user_id)
Never retrieve chunks without this filter

## Generative vs Analytical Engine Split

### Generative Engines (produce text for user, stream output)
- Tutor Engine
- Assistant Engine
- Voice Delivery Engine (post-v1)
- Engagement and Motivation Layer

### Analytical Engines (produce JSON for system, never streamed to user)
- Ingestion Engine
- ATU Mapper
- Analysis Engine
- Teaching Planner
- Confusion Signal Engine
- Illusion of Understanding Detector
- Error Classification Engine
- Explanation Diversity Memory
- Cross-Concept Linking Engine
- Cognitive Load Regulator
- Coverage Audit Engine
- Session Handoff Engine
- Learning Profile Engine
- Revision Engine (post-v1)
- System Orchestrator

Rule: never mix analytical and generative instructions in same LLM prompt
Rule: orchestrator chains calls, never batches into one mega-prompt
Rule: analytical engines run in pre-pass or post-pass, never during stream

## Exact Tutor Turn Pipeline

Input: learner_message, session_id, user_id, idempotency_key

Step 1 — Idempotency check (under 5ms)
- Check Redis for idempotent:tutor:{idempotencyKey}
- If exists: return cached response immediately
- If missing: continue

Step 2 — Auth and ownership check (under 10ms)
- Verify AuthSession from cookie
- Verify StudySession belongs to user
- Verify Document belongs to user
- Return 401 if any fails

Step 3 — Concurrent session lock (under 10ms)
- Check Redis lock sessionlock:{userId}
- If locked: return 409
- Set lock with 30 second TTL

Step 4 — Load state (target under 50ms, all from Redis with PostgreSQL fallback)
- Load SessionState from Redis, fallback to PostgreSQL
- Load current LessonSegment from Redis, fallback to PostgreSQL
- Load MasteryState for current concept from Redis, fallback to PostgreSQL
- Load LearnerProfile compact summary from Redis, fallback to PostgreSQL
- Load ExplanationHistory for current concept from Redis, fallback to PostgreSQL
- Load ConfusionScore for current concept from Redis, default 0 if missing

Step 5 — Retrieve context (target under 80ms)
- Query pgvector for top 5 chunks using ATU-aware retrieval
- Query pgvector for top 2 additional chunks matching learner message if relevant
- Apply reranking formula
- All scoped to current document_id

Step 6 — Run analytical decision loop (target under 20ms, pure logic no LLM)
- Run Tutor Decision Loop using loaded state
- Determine primary action: TEACH, CHECK, RETEACH, ADVANCE, REVIEW, AUDIT
- Run Cognitive Load Regulator
- Run Explanation Diversity Memory check
- Select explanation type for this turn
- Check if misconception warning needed for this concept

Step 7 — Check subscription quota (under 10ms)
- Load PlanSubscriptions for user
- Check Redis quota counter for today
- If exceeded: return 429 with upgrade message, release session lock

Step 8 — Assemble prompt (target under 10ms)
- Select prompt version from env var
- Inject LessonSegment, MasteryState summary, LearnerProfile compact, retrieved chunks
- Inject last 3 tutor turns for continuity
- Inject explanation type instruction
- Inject misconception warning if high risk concept
- Verify total token count under 8000
- If over budget: compress LearnerProfile to 5 fields, reduce chunks to 3

Step 9 — Stream response (target under 500ms to first token)
- Call Claude API with streaming enabled
- Pipe SSE stream to frontend
- Set SSE timeout to 45 seconds
- Frontend renders tokens as they arrive
- Cache idempotency key in Redis with TTL 5 minutes

Step 10 — Post-stream async (fire and forget, does not block user)
- Evaluate learner previous message using Confusion Signal Engine
- Run Illusion of Understanding Detector
- Run Error Classification if response was weak
- Update MasteryState in PostgreSQL
- Update LearnerProfile behavioral signals in PostgreSQL
- Update CoverageLedger in PostgreSQL
- Update ExplanationHistory in PostgreSQL
- Save SessionState snapshot to Redis with TTL 24 hours
- Update Redis MasteryState cache
- Log token usage to Sentry and cost tracking
- Increment Redis quota counter
- Release session lock

Step 11 — Response complete
- Send SSE end signal to frontend
- Frontend shows interaction controls

## Async Engine Execution Targets
- Pre-pass total: under 150ms
- First token: under 500ms
- Post-pass: async, no time constraint, does not block user

## Compression Completion Rule
Sessions in quick overview mode can reach completed status even with compressed ATUs.

CoverageLedger.resolved_via_compression = true for compressed ATUs
Coverage audit counts resolved_via_compression as resolved, not as unresolved_gap
Session can reach completed when: all ATUs are either mastered=true OR resolved_via_compression=true OR explicitly marked as unresolved_gap with learner notified

Session end summary distinguishes:
- Fully mastered: concepts with mastered=true
- Reviewed briefly: concepts with resolved_via_compression=true
- Still unresolved: concepts with unresolved_gap=true

## Tutor Behavior Rules

### Core Teaching Order
1. Story or real-world picture before formal definition
2. Surface understanding before technical detail
3. Simple example before edge cases
4. Plain wording before technical wording
5. Concept grounded in plain language before any definition check

### Learner Model Rules
- Use stored LearnerProfile before choosing how to open any lesson
- If no profile exists: run mini calibration before heavy teaching
- Update profile from observed behavior not stated preference
- Familiarity with a term is not understanding of a term
- Treat these as different things always

### No-Block Rule
- Never use a word the learner may not know without immediately explaining it
- If explaining one unknown word requires another unknown word: stop and simplify
- Prefer plain wording first, technical wording second

### Tutor Decision Loop (executed every turn, pure logic)
1. Check: confusion_score, mastery status, response quality, cognitive load, motivation state
2. Decide primary action:
   - concept not yet introduced: TEACH
   - introduced but not checked: CHECK UNDERSTANDING
   - confusion high: RETEACH with different explanation type
   - response weak or vague: ASK SMALLER SIMPLER QUESTION
   - partial understanding: REFINE with targeted question
   - strong understanding: ADVANCE or INCREASE DIFFICULTY
   - mastery criteria not met: APPLY DIFFERENT QUESTION TYPE
   - mastery criteria met: MARK MASTERED and MOVE ON
3. Secondary adjustments:
   - cognitive load high: slow down, reduce chunk size
   - boredom detected: increase challenge
   - repeated failure: trigger failure recovery ladder
4. Every 3 to 5 steps: run mini review or link to previous concept
5. Before moving to next concept: verify mastery gate satisfied
6. Before ending session: run full coverage audit

### Fast-Track Rule for High Confidence Learners
If learner gives strong correct answer with clear reasoning on first check:
- Second check must be a harder question, not same level repetition
- Use transfer or boundary case question immediately
- Mastery gate satisfied with one strong check plus one harder check

### Failure Recovery Ladder
If learner keeps struggling with a concept follow this exact order:
1. Clearer explanation same type
2. Different explanation type
3. Step back to prerequisite
4. Very concrete example
5. Contrast with similar concept
6. Shrink task to one tiny part
7. Pause and diagnose what exactly is unclear

### Error Classification (before reteaching always)
1. Misconception: confront directly, contrast with correct idea
2. Partial understanding: guide to missing link, no full reteach
3. Surface memorization: ask why or how to force deeper thinking
4. Careless mistake: point to specific step only
5. Guessing: require explanation before continuing
6. Vocabulary block: simplify wording, restate question

### No-Fake-Mastery Gate
Concept marked mastered only when ALL true:
1. Taught clearly
2. Checked at least twice in different ways
3. One check required learner-generated explanation or application
4. One check tested transfer, contrast, or error spotting
5. No high illusion-of-understanding flag remains
6. Confusion score below 0.4 threshold
7. Coverage audit shows all linked ATUs represented

### Compression Rule
Quick overview mode: low priority concepts compressed to one-sentence mention
Deep mastery mode: all concepts taught fully, no compression
Pass exam mode: core and exam-relevant taught fully, supporting compressed
Compressed is never the same as skipped
Learner can request full teaching of any compressed concept

### Tutor Prompt Engineering Rules
Use negative constraints not just positive rules:
- NEVER open with "In this lesson we will cover..."
- NEVER say "as shown in the diagram"
- NEVER say "got it?" as the only check
- NEVER repeat an explanation type that already failed for this concept
- NEVER move on without a mastery check

Use few-shot examples in prompts for each transition type:
- transition from one concept to next: include one example of a good transition
- reteach after weak response: include one example of a good reteach
- voice-friendly explanation: include one example of a good verbal explanation

## Anti-Skip Contract
Every source unit traceable forward to:
- An ATU
- A concept
- A lesson segment
- At least one understanding check
- A mastery status or unresolved flag or resolved_via_compression flag

## Human Fallback UX Controls
- Start Over This Concept: POST /api/v1/tutor/reset-concept
- Change Explanation Style: POST /api/v1/tutor/change-style
- Make It Simpler: POST /api/v1/tutor/simplify
- I Already Know This: POST /api/v1/tutor/skip-concept
- Ask a Different Question: POST /api/v1/tutor/new-question
- I Am Thinking Not Confused: POST /api/v1/tutor/not-confused

If learner flags frustration 3 times in one session:
- System acknowledges and slows down
- Cognitive Load Regulator sets level to low
- Explanation Diversity Memory resets to most concrete type
- Motivation Layer switches to encouragement mode

If learner presses not-confused more than 3 times:
- System increases auto-intervention threshold for this session
- Logs preference to LearnerProfile for future sessions

## Browser Behavior Rules
- Tab focus lost: log UserEvents tab_focus_lost, pause confusion timer
- Tab focus gained: log UserEvents tab_focus_gained, reset confusion timer
- This prevents false confusion signals from tab switching
- Confusion timer only runs while window has focus

## Learner Message Limits
- Maximum learner message length: 2000 characters
- Enforced at API level with 400 response and clear error message
- Frontend shows character count when approaching limit

## Concurrent Session Limit
- Maximum one active tutoring session per user at any time
- Enforced via Redis lock sessionlock:{userId}
- If user opens second device: second device gets 409 with message "You have an active session on another device"

## KaTeX and Voice Resolution
- KaTeX used for all math and formula rendering in UI
- When voice mode active: Claude outputs dual format
  - ui field: KaTeX syntax
  - voice field: plain English spoken version
- Voice Delivery Engine reads voice field, never ui field
- TTS never receives raw KaTeX strings

## Offline Mode Contract
Offline mode is review-only. AI tutoring requires active internet connection.

Works offline: cached flashcard review, last session summary, progress overview from last sync
Does not work offline: AI tutoring, quiz generation, document upload, assistant questions, any LLM call
UI shows clear offline banner when connection lost
App does not crash offline

## Rate Limits
- Auth endpoints: 10 requests per minute per IP
- Upload: 5 uploads per hour per user
- AI tutor: 60 requests per minute per user
- Quiz generation: 20 per hour per user
- Assistant questions: 30 per minute per user
- Admin endpoints: 30 per minute per admin user

## Performance Targets
- Tutor response first token: under 500ms using streaming
- Quiz generation: under 1 second
- Upload acknowledgement: under 200ms
- All non-AI endpoints: under 200ms
- Pre-pass total: under 150ms
- Document processing: background job

## Security Rules (canonical)
- TypeScript strict mode everywhere, no any types
- Zod validation on every endpoint input
- Every endpoint verifies auth before anything else
- Every endpoint verifies ownership of resource being accessed
- No raw SQL, Prisma ORM only
- All file access via signed URLs with expiry
- All AI calls sanitize output before sending to user
- Uploaded document text treated as data never as instructions
- System prompt separated from retrieved document content
- Retrieval always scoped to document owner
- No user PII in logs or error messages
- Rate limiting on all endpoints
- HTTPS enforced everywhere
- HSTS header enabled
- CSP header configured strictly
- X-Frame-Options DENY
- X-Content-Type-Options nosniff
- CSRF protection on state-changing endpoints
- XSS protection on all rendered content
- Cloudflare DDoS protection in front of all traffic

## API Routes (canonical complete list)

### Auth
POST /api/v1/auth/signup
POST /api/v1/auth/signin
GET /api/v1/auth/oauth/callback
POST /api/v1/auth/verify-email
POST /api/v1/auth/signout
GET /api/v1/auth/session
POST /api/v1/auth/password-reset-request
POST /api/v1/auth/password-reset-confirm

### Profile
GET /api/v1/profile
PUT /api/v1/profile
GET /api/v1/profile/learning-preferences
PUT /api/v1/profile/learning-preferences
POST /api/v1/profile/calibration
GET /api/v1/profile/calibration/status

### Institutions and Courses
GET /api/v1/institutions/search
POST /api/v1/courses
GET /api/v1/courses

### Upload and Documents
POST /api/v1/uploads/create
POST /api/v1/uploads/finish
GET /api/v1/uploads/:id/status
GET /api/v1/documents
GET /api/v1/documents/:id
GET /api/v1/documents/:id/status
GET /api/v1/documents/:id/structure
POST /api/v1/documents/:id/reprocess

### Study Sessions
POST /api/v1/sessions/start
POST /api/v1/sessions/:id/continue
GET /api/v1/sessions/:id/state
PUT /api/v1/sessions/:id/mode
POST /api/v1/sessions/:id/pause
POST /api/v1/sessions/:id/resume
GET /api/v1/sessions/:id/summary

### Tutor
POST /api/v1/tutor/next
POST /api/v1/tutor/question
POST /api/v1/tutor/reset-concept
POST /api/v1/tutor/change-style
POST /api/v1/tutor/simplify
POST /api/v1/tutor/skip-concept
POST /api/v1/tutor/new-question
POST /api/v1/tutor/not-confused

### Quiz (post-v1)
POST /api/v1/quiz/generate
POST /api/v1/quiz/:id/answer
GET /api/v1/quiz/:id/explanation
POST /api/v1/quiz/:id/continue
PUT /api/v1/quiz/preferences

### Flashcards (post-v1)
POST /api/v1/flashcards/generate
GET /api/v1/flashcards
POST /api/v1/flashcards/:id/review
PUT /api/v1/flashcards/:id/state

### Progress
GET /api/v1/progress/dashboard
GET /api/v1/progress/courses/:id
GET /api/v1/progress/weak-topics
GET /api/v1/progress/history

### Feedback
POST /api/v1/feedback

### Health
GET /health
GET /health/db
GET /health/redis
GET /health/ai

### Webhooks
POST /api/v1/webhooks/stripe
POST /api/v1/webhooks/resend

### Admin (post-v1)
GET /api/v1/admin/users
PUT /api/v1/admin/users/:id/suspend
PUT /api/v1/admin/users/:id/restore
GET /api/v1/admin/documents
POST /api/v1/admin/documents/:id/reprocess
GET /api/v1/admin/ai-usage
GET /api/v1/admin/feedback
PUT /api/v1/admin/feedback/:id/review
GET /api/v1/admin/dlq
POST /api/v1/admin/dlq/:id/retry
POST /api/v1/admin/dlq/:id/discard
GET /api/v1/admin/metrics

## Document Structure Response Shape
GET /api/v1/documents/:id/structure returns:
{
  document_id, title, file_type, processing_status,
  section_count, concept_count, atu_count, segment_count,
  sections: [{ id, title, section_index, difficulty_score, importance_score }],
  concepts: [{ id, concept_name, difficulty, relevance_level }],
  has_image_extraction_failures: boolean
}

## Background Job Decisions
- BullMQ retry: 3 times with exponential backoff 1s, 5s, 30s
- Dead letter queue: separate BullMQ queue named dlq
- Sentry alert when any job enters dlq
- Job payloads never contain raw secrets or tokens
- All jobs idempotent by design

## Environment Strategy
- Three environments: local, staging, production
- Staging mirrors production exactly
- All env vars in Railway secrets for staging and production
- Local vars in .env.local, never committed
- Startup validation fails fast if any required var missing

## Local Development
- Docker Compose for local PostgreSQL and Redis
- npm run db:seed creates test data
- Seed is idempotent, safe to run multiple times
- README documents exact steps from clone to running locally

## Data Retention
- Active user data: kept while account exists
- Voice transcripts: deleted after 90 days (post-v1)
- Deleted accounts: hard deleted 30 days after soft delete
- Logs: 30 days via Logtail
- Never log PII, tokens, or secrets

## Shared Object Definitions (for prompt assembly)
These are the in-memory shapes passed between engines. Not the same as database tables.

LearnerProfile compact (under 200 tokens):
{ explanation_style, jargon_tolerance, wants_story_first, wants_surface_first, academic_level, study_goal_preference }

MasteryState compact:
{ concept_id, status, confusion_score, transfer_passed, evidence_count }

SessionState compact:
{ session_id, current_segment_id, current_step, mode, frustration_flag_count, motivation_state }

LessonSegment full:
{ segment_id, concept_ids, atu_ids, explanation_strategy, analogy, check_prompt, mastery_gate }
