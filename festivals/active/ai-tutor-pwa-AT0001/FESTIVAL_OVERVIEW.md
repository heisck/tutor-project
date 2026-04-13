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
