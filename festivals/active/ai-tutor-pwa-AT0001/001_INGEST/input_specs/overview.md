# Festival Overview: ai-tutor-pwa

## High-Level Goal

Build an adaptive AI study platform that turns uploaded learning materials into guided tutoring, intelligent quizzes, personalized revision, and exam-focused support. The system must feel like a smart private tutor, not a summarizer.

## The Three Core Engines

### 1. Learning Engine
Teaches the material step by step. Adapts explanation style. Never skips content. Tracks mastery with evidence, not self-report.

### 2. Quiz and Revision Engine
Tests understanding with varied question types. Tracks weak areas. Schedules spaced revision. Increases urgency near exam dates.

### 3. Personalization Engine
Observes how the student actually learns, not just what they say. Updates learning profile over time. Adapts pacing, explanation style, and quiz frequency per student and per course.

## Study Modes

- Teach me from start to finish
- Quick summary
- Flashcards
- Quiz me now
- Difficult parts only
- Explain images and diagrams
- Voice tutor mode
- Exam mode
- Revision mode

## AI Engine Stack

1. Ingestion Engine — parses files into structured content
2. Atomic Teachable Unit Mapper — breaks content into smallest teachable ideas
3. Analysis Engine — understands concepts like a teacher
4. Teaching Planner — decides teaching order and where quizzes appear
5. Tutor Engine — explains live, adapts, checks mastery
6. Quiz Engine — generates and evaluates varied questions
7. Assistant Engine — answers freeform questions, stays grounded
8. Learning Profile Engine — models how this learner learns
9. Revision Engine — schedules spaced review, prioritizes weak areas
10. Voice Delivery Engine — formats content for voice, no slide dependency
11. Confusion Signal Engine — detects confusion before wrong answers appear
12. Explanation Diversity Memory — prevents repeating failed explanations
13. Illusion of Understanding Detector — catches right answer, wrong reason
14. Cross-Concept Linking Engine — connects new ideas to prior knowledge
15. Cognitive Load Regulator — keeps challenge level balanced
16. Coverage Audit Engine — verifies nothing important was skipped
17. Session Handoff Engine — resumes cleanly across sessions
18. Engagement and Motivation Layer — protects momentum without fake praise
19. System Orchestrator — coordinates all engines using shared objects

## Architecture

Modular monolith first. Do not start with microservices.

### Frontend
- Next.js + TypeScript + Tailwind
- PWA support
- Pages: auth, dashboard, upload, tutor, quiz, flashcards, settings, voice, progress

### Backend
- Node.js + TypeScript
- Zod for input validation
- Modules: auth, profile, upload, processing, study session, tutor, quiz, flashcard, progress, reminder, voice

### Database
- PostgreSQL
- Prisma ORM
- pgvector for embeddings

### Cache
- Redis
- Active session state, rate limits, temporary AI job state, idempotency keys

### Queue
- BullMQ on Redis
- File processing, image analysis, indexing, reminder jobs, email delivery

### File Storage
- Cloudflare R2
- Signed URLs, per-user isolation, no public buckets

### Vector Layer
- pgvector with PostgreSQL to start
- Chunk embeddings for retrieval in tutor, assistant, and quiz engines

## Database Schema

### Users
- id, email, auth_provider, email_verified, username, institution_id, department, level, created_at, updated_at

### LearningProfiles
- id, user_id, general_preferences_json, inferred_preferences_json, explanation_style, quiz_frequency_preference, voice_preference, last_calibrated_at

### Institutions
- id, name, country, type

### Courses
- id, user_id, name, code, level

### CourseProfiles
- id, user_id, course_id, preferred_style_json, weaknesses_json, strengths_json, mastery_summary_json

### Documents
- id, user_id, course_id, title, file_url, file_type, file_size, processing_status, created_at

### DocumentSections
- id, document_id, section_index, title, raw_text, normalized_text, summary, difficulty_score, importance_score

### DocumentAssets
- id, document_id, section_id, asset_type, storage_url, extracted_description, metadata_json

### ConceptNodes
- id, document_id, section_id, concept_name, description, difficulty, misconceptions_json, prerequisites_json

### StudySessions
- id, user_id, document_id, mode, status, current_section_id, current_step, started_at, last_active_at

### QuizSets
- id, user_id, document_id, session_id, mode, difficulty, generated_at

### QuizQuestions
- id, quiz_set_id, concept_id, question_type, question_text, options_json, correct_answer_json, explanation, metadata_json

### QuizAttempts
- id, user_id, question_id, answer_json, is_correct, confidence_optional, response_time_ms, attempted_at

### Flashcards
- id, user_id, document_id, concept_id, front_text, back_text, difficulty, next_review_at

### UserEvents
- id, user_id, session_id, event_type, payload_json, created_at
- Event types: pause, resume, highlight, ask_question, replay_section, scroll_dwell, quiz_answered

### Reminders
- id, user_id, type, title, trigger_at, status, payload_json

### ExamPlans
- id, user_id, course_id, exam_date, exam_type, intensity_preference, created_at

## Build Phases

### Phase 1: Foundation
- Auth and user profile
- Dashboard shell
- Upload and document model
- File storage
- Processing status pipeline
- Basic extracted section view
- Goal: User can sign up, upload a file, and see processed sections

### Phase 2: Core Tutoring MVP
- Structured document ingestion
- Analysis engine
- Teaching planner
- Tutor mode
- Continue session
- Simple ask-a-question flow
- Goal: User can upload a file and be taught from it

### Phase 3: Quizzes and Flashcards
- Quiz engine with varied question types
- Flashcard generation
- Quiz attempts tracking
- Adaptive repetition basics
- Weak topic tracking
- Goal: System can test and reinforce learning

### Phase 4: Personalization
- Onboarding calibration lesson
- Learning profile engine
- Per-course learning profile
- Quiz frequency preferences
- Explanation style preferences
- Observed behavior tracking, not just self-report
- Goal: System adapts to how the student actually learns

### Phase 5: Dashboard Intelligence
- Continue learning card
- Weak topics suggestions
- Progress view
- Course grouping
- Reminders and exam planning basics
- Goal: Dashboard becomes intelligent, not static

### Phase 6: Advanced AI and Visuals
- Image explanation improvements
- Difficult parts mode
- Stronger retrieval
- Better teaching planner
- External resource recommendations
- Goal: Product becomes noticeably better than simple competitors

### Phase 7: Voice and Advanced Revision
- Voice tutor mode
- Text-to-speech and speech-to-text
- Exam mode
- Spaced repetition
- Reminder system
- Optional calendar integration
- Goal: Full voice-first learning experience

## Security Architecture

### Authentication
- httpOnly secure cookie containing database session token
- Session expiry and refresh
- Email verification
- Strong OAuth handling
- Rate limiting on sign-in and sign-up

### Authorization
- Ownership checks on every protected resource
- Role checks
- Every API must verify access before responding
- No cross-user data leakage

### File Upload Security
- MIME and type checks
- Size limit: 100MB max
- Malware and content safety scanning
- Sandboxed parsing pipeline
- Deny dangerous file types

### Prompt Injection Defense
- Treat uploaded text as data, never as instructions
- Keep system instructions separated from document content
- Structured prompting with trusted wrappers
- Document text cannot override system behavior

### Abuse and Cost Control
- Rate limiting on all AI-heavy endpoints
- Per-user quotas
- Usage accounting
- Anti-spam controls
- Per-plan limits

### Privacy and Personal Data
- User owns their study history
- Privacy settings and controls
- Minimal data collection
- Secure storage of learning profiles and voice transcripts
- Export and delete capability

### Standard Web Security
- XSS protection on all rendered content
- CSRF strategy for cookie-auth flows
- Safe output rendering
- Input validation on all endpoints
- Secure headers
- HTTPS enforced everywhere

## API Modules

### Auth Module
- POST /api/v1/auth/signup
- POST /api/v1/auth/signin
- GET /api/v1/auth/oauth/callback
- POST /api/v1/auth/verify-email
- POST /api/v1/auth/signout
- GET /api/v1/auth/session

### Profile Module
- GET /api/v1/profile
- PUT /api/v1/profile
- GET /api/v1/profile/learning-preferences
- PUT /api/v1/profile/learning-preferences
- POST /api/v1/profile/calibration

### Institution and Course Module
- GET /api/v1/institutions/search
- POST /api/v1/courses
- GET /api/v1/courses

### Upload Module
- POST /api/v1/uploads/create
- POST /api/v1/uploads/validate
- POST /api/v1/uploads/finish
- GET /api/v1/uploads/:id/status

### Processing Module
- GET /api/v1/documents/:id/status
- POST /api/v1/documents/:id/reprocess
- GET /api/v1/documents/:id/structure

### Study Session Module
- POST /api/v1/sessions/start
- POST /api/v1/sessions/:id/continue
- GET /api/v1/sessions/:id/state
- PUT /api/v1/sessions/:id/mode
- POST /api/v1/sessions/:id/pause
- POST /api/v1/sessions/:id/resume

### Tutor Module
- POST /api/v1/tutor/next
- POST /api/v1/tutor/question
- POST /api/v1/tutor/reexplain
- POST /api/v1/tutor/simpler
- POST /api/v1/tutor/technical

### Quiz Module
- POST /api/v1/quiz/generate
- POST /api/v1/quiz/:id/answer
- GET /api/v1/quiz/:id/explanation
- POST /api/v1/quiz/:id/continue
- PUT /api/v1/quiz/preferences

### Flashcard Module
- POST /api/v1/flashcards/generate
- GET /api/v1/flashcards
- POST /api/v1/flashcards/:id/review
- PUT /api/v1/flashcards/:id/state

### Progress Module
- GET /api/v1/progress/dashboard
- GET /api/v1/progress/courses/:id
- GET /api/v1/progress/weak-topics
- GET /api/v1/progress/history

### Reminder and Exam Module
- POST /api/v1/exams
- POST /api/v1/reminders
- GET /api/v1/reminders
- PUT /api/v1/reminders/preferences

### Voice Module
- POST /api/v1/voice/session/start
- POST /api/v1/voice/session/speech
- GET /api/v1/voice/session/response
- POST /api/v1/voice/session/pause
- POST /api/v1/voice/session/resume

## Shared Objects

### SourceDocument
- document_id, title, file_type, pages_or_slides, extracted_text_blocks, extracted_visuals, metadata

### SourceUnit
- source_unit_id, document_id, slide_number, unit_type, raw_content, position_on_slide, visual_reference, importance_score, extracted_from_visual
- unit_type values: title, bullet, paragraph, formula, caption, table_cell, diagram_label, arrow_relation, example, footnote

### Atomic Teachable Unit (ATU)
- atu_id, source_unit_ids, statement, category, explicit_or_implied, exam_relevance, difficulty
- category values: definition, fact, process_step, comparison, cause_effect, formula_rule, example, exception, visual_meaning, prerequisite, likely_test_point

### Concept
- concept_id, title, description, atu_ids, prerequisite_concept_ids, misconceptions, transfer_targets, mastery_requirements

### LessonSegment
- segment_id, concept_ids, atu_ids, source_mapping, explanation_strategy, analogy, spoken_visual_description, check_prompt, mastery_gate

### LearnerProfile
- learner_id, preferred_style, pacing_preference, strengths, weak_concepts, misconception_history, best_question_types, frustration_signals, motivation_state
- prefers_simple_grammar, wants_story_first, wants_surface_understanding_first, jargon_tolerance, big_picture_before_detail, best_check_style, common_block, reteach_preference

### Evidence
- evidence_id, learner_id, concept_id, prompt_id, response_type, learner_response, evaluation, confidence_estimate, timestamp

### MasteryState
- learner_id, concept_id, status, evidence_ids, last_reviewed, transfer_passed, compression_passed, next_review_due
- status values: not_taught, taught, checked, weak, partial, mastered

### CoverageLedger
- atu_id, source_unit_ids, concept_id, taught, checked, mastered, unresolved_gap, notes

### SessionState
- learner_id, session_id, current_segment_id, completed_segments, pending_segments, active_confusions, explanation_history, voice_position, mastery_snapshot, unresolved_atus, resume_note

## The No-Fake-Mastery Gate

A concept may only be marked mastered if ALL of the following are true:
1. It was taught clearly
2. It was checked at least twice in different ways
3. One check required learner-generated explanation or application
4. One check tested transfer, contrast, or error spotting
5. No high illusion-of-understanding flag remains
6. Confusion score is below threshold
7. Coverage audit shows all linked ATUs have been represented

## Question Types

Rotate among all of these, never just recall:
1. Recall
2. Paraphrase
3. Compare and contrast
4. Apply to a new case
5. Transfer to a new domain
6. Error spotting
7. Sequence the steps
8. Cause-effect reasoning
9. Prerequisite link
10. Compression: explain simply to a beginner
11. Reverse reasoning: given outcome, infer cause
12. Boundary case: when does this fail?

## Failure Recovery Ladder

If a learner struggles with a concept, follow this order:
1. Use a clearer explanation
2. Use a different explanation type
3. Step back to the prerequisite
4. Use a very concrete example
5. Use a contrast with a similar concept
6. Shrink the task, ask learner to explain one tiny part
7. Pause and diagnose exactly what is unclear

## Explanation Types

Never repeat a failed explanation type. Rotate among:
- Analogy
- Formal definition
- Worked example
- Concrete real-world example
- Contrast with similar idea
- Visual word picture
- Step-by-step decomposition
- Common mistake explanation

## Tutor Behavior Rules

### Learner Model Rules
- Use stored learner profile before choosing how to open any lesson
- If no profile exists, run discovery phase before heavy teaching
- Update profile based on observed behavior, not just stated preference
- Do not assume a learner who has heard a word understands it
- Treat familiarity with a term and understanding of a term as different things

### No-Block Rule
- Never use a word the learner may not know without replacing it or explaining it immediately
- If one unknown word requires another unknown word, stop and simplify
- Do not stack jargon
- Prefer plain wording first, technical wording second

### Story-First Rule
Before any formal definition:
1. Give a simple real-world picture, story, job, or example
2. Explain what the thing does
3. Explain why it matters
4. Only then introduce the technical term

### Surface-First Rule
For each new concept teach in this order:
1. Surface understanding: what it is doing
2. Simple example
3. Real meaning
4. Technical version
5. Edge cases and deeper detail

### Safe-Start Rule
- Never open a lesson by asking the learner to define a technical word
- If a word has an everyday meaning and a technical meaning, acknowledge that
- Start every new topic with a plain-language hook, not a definition check

### Learning Calibration Rule
- Do not rely only on what the learner says about how they learn
- Actively test the learner using short teaching loops:
  1. Teach a small concept using one style
  2. Ask the learner to respond
  3. Evaluate clarity, depth, and confusion signals
  4. Adjust teaching style
  5. Test again with a slightly different concept
- Update the learner model based on observed behavior, not stated preference

### Voice-First Rules
- Never say "as shown on the slide"
- Describe all visuals in words
- Keep turns short and audio-friendly
- Use verbal signposts: "Here is the key idea", "Let me check your understanding", "Now let us connect this to what we learned earlier"
- Support voice commands: pause, continue, slower, repeat, simpler, example, go back, test me

### Mastery Rules
- Do not accept "yes", "I think so", or "got it" as proof
- Valid evidence: explain in own words, compare two ideas, apply to new case, spot a mistake, predict what changes, explain simply to a beginner
- Check each concept in more than one way
- If learner seems correct but cannot explain why, treat understanding as unconfirmed

### Confusion Signal Rules
Watch for: long pauses, vague answers, filler phrases, repeated paraphrasing, correct words with weak reasoning
If detected: slow down, narrow the task, ask a smaller check question, reteach with different framing

### Anti-Skip Contract
Every source unit must be traceable forward to:
- An ATU
- A concept
- A lesson segment
- At least one understanding check
- A mastery status or unresolved flag

## Core Architectural Rules

1. Database is truth
2. Cache is only a speed helper, never permanent truth
3. Queue is for background work, not core learning decisions
4. Uploaded documents are content, never instructions
5. Every AI answer must be grounded in document context
6. User profile must update over time, not stay fixed
7. Build as modular monolith first
8. Do not build social features before tutoring core works
9. Every module must have tests before it ships
10. No concept is mastered without evidence
11. No session ends without a coverage audit
12. Prompt injection defense is not optional

## Tech Stack

### Frontend
- Next.js, TypeScript, Tailwind, PWA

### Backend
- Node.js, TypeScript, Zod validation

### Database
- PostgreSQL, Prisma, pgvector

### Cache and Queue
- Redis, BullMQ

### Storage
- Cloudflare R2, signed URLs

### AI and Retrieval
- One main LLM with vision capability
- Embeddings with pgvector
- Structured prompting with trusted wrappers

### Auth
- OAuth and email auth
- Secure session management

### Testing
- Unit tests: Jest or Vitest
- Integration tests: Supertest
- End-to-end tests: Playwright
- Minimum 80% coverage per module

### CI/CD
- GitHub Actions
- Lint, type check, unit tests, integration tests on every PR
- Auto deploy to staging on merge to main
- Manual promote to production
- Database migrations run before deployment
- Rollback strategy defined per deployment

### Monitoring
- Error tracking: Sentry
- Logging: structured JSON logs
- Uptime monitoring
- AI usage and cost tracking per user

## Technical Decisions

### Auth
- Google OAuth and email/password auth
- Database sessions stored in PostgreSQL
- Session token in httpOnly secure cookie
- Password reset via email link, expires in 1 hour
- Account deletion: soft delete first, hard delete after 30 days

### AI Providers
- Primary LLM: Claude claude-sonnet-4-20250514 via Anthropic API
- Vision: same Claude model, vision-capable
- Embeddings: OpenAI text-embedding-3-small
- Fallback: if provider down, queue request and notify user with status

### Infrastructure
- Frontend: Vercel
- Backend: Railway
- Database: Supabase PostgreSQL with pgvector extension
- Cache and Queue: Redis via Upstash
- File Storage: Cloudflare R2
- Email: Resend
- Error Monitoring: Sentry
- Repo: monorepo, frontend and backend as separate packages

### Performance Targets
- Tutor response: under 500ms to first token using streaming
- Quiz generation: under 1 second
- Upload acknowledgement: under 200ms
- All non-AI endpoints: under 200ms
- Document processing: background job, user notified when ready
- Scale target: 100,000 concurrent users via horizontal scaling

### Chunking Strategy
- Split documents into 512-token chunks with 50-token overlap
- Each chunk tagged with section, page, and concept metadata
- Retrieval sends top 5 most relevant chunks per tutor request

### Rate Limits
- Auth endpoints: 10 requests per minute per IP
- Upload: 5 uploads per hour per user
- AI tutor: 60 requests per minute per user
- Quiz generation: 20 per hour per user
- Assistant questions: 30 per minute per user

### Quiz Storage
- Generated on the fly per session
- Stored after generation for history and weak topic tracking

### Data Retention
- Active user data: kept while account exists
- Voice transcripts: deleted after 90 days
- Deleted accounts: hard deleted after 30 days
- Logs: retained for 30 days

### Plans
- Free: 3 documents, 2 active sessions, limited AI calls per day
- Paid: unlimited documents, sessions, higher AI quotas

### Missing Flow Handling
- Failed document processing: user notified, can retry or re-upload
- Corrupt file: rejected at validation with clear error message
- Password reset: email link, expires 1 hour, one-time use
- Account deletion: user confirms, soft delete, email confirmation sent

## Infrastructure Completeness

### CDN and Static Assets
- Vercel handles CDN for frontend static assets automatically
- Cloudflare R2 with Cloudflare CDN for uploaded files and generated audio
- All static assets served with long cache headers
- Cache invalidation strategy on deployment

### DDoS Protection
- Cloudflare proxy in front of all traffic
- Cloudflare DDoS protection enabled
- Rate limiting at Cloudflare edge before hitting backend
- IP blocklist managed via Cloudflare firewall rules

### SSL and TLS
- SSL certificates managed automatically by Vercel and Cloudflare
- HTTPS enforced everywhere, HTTP redirects to HTTPS
- HSTS header enabled with long max-age
- TLS 1.2 minimum, TLS 1.3 preferred

### DNS
- DNS managed via Cloudflare
- All subdomains: app, api, cdn
- TTL configured appropriately per record type

### Database Connection Pooling
- Supabase connection pooler enabled
- Max connections configured per environment
- Connection timeout and retry logic in app

### Backup and Disaster Recovery
- Supabase automatic daily backups enabled
- Point-in-time recovery configured
- Backup retention: 30 days
- Backup restore tested monthly
- Cloudflare R2 versioning enabled for uploaded files
- Recovery time objective: under 1 hour
- Recovery point objective: under 24 hours

### Health Checks
- GET /health endpoint returns 200 with system status
- GET /health/db checks database connectivity
- GET /health/redis checks cache connectivity
- GET /health/ai checks AI provider reachability
- Railway monitors health endpoint and restarts on failure

### Graceful Shutdown
- App listens for SIGTERM and SIGINT
- In-flight requests complete before shutdown
- Background jobs finish current task before shutdown
- Redis connections closed cleanly

### Zero Downtime Deployments
- Railway rolling deployments enabled
- New version starts and passes health check before old version stops
- Database migrations run before app deployment
- Backward compatible migrations only, no breaking schema changes without deprecation phase

## Observability

### Distributed Tracing
- OpenTelemetry instrumentation on all services
- Trace IDs propagated through all requests including AI calls
- Traces stored in Sentry

### Application Performance Monitoring
- Sentry performance monitoring enabled
- P50, P95, P99 response times tracked per endpoint
- Slow query detection and alerting
- Memory and CPU usage tracked per service

### Database Monitoring
- Supabase dashboard for query performance
- Slow query log enabled, threshold 100ms
- Index usage monitored
- Connection pool saturation alerts

### AI Cost Monitoring
- Token usage logged per request per user per day
- Daily cost dashboard per AI provider
- Alert when daily spend exceeds threshold
- Per-user quota enforcement based on plan

### Uptime Monitoring
- Better Uptime monitoring all endpoints
- Alert via email and Slack if downtime detected
- Status page for users at status.domain.com
- SLA target: 99.9% uptime

### Custom Metrics Dashboard
- Active sessions per minute
- Documents processed per hour
- Quiz questions generated per hour
- AI provider error rate
- Upload success and failure rate
- User signup and activation rate

### Logging
- Structured JSON logs on all services
- Log levels: error, warn, info, debug
- Request ID on every log line
- User ID on every authenticated request log
- Logs shipped to Logtail
- Log retention: 30 days
- Never log PII, tokens, or secrets

## Compliance

### GDPR
- Right to access: user can download all their data
- Right to delete: user can delete account and all data
- Data export: JSON export of all user data available in settings
- Data processing agreement with all third party providers
- Cookie consent banner on first visit
- Only necessary cookies set without consent
- Analytics cookies require explicit consent

### Privacy Policy
- Written in plain language
- Covers: what data collected, why, how long kept, who it is shared with
- Covers: user rights under GDPR
- Linked in footer and during signup

### Terms of Service
- Covers: acceptable use, content ownership, account termination
- Covers: AI limitations and no guarantee of accuracy
- Linked in footer and during signup

### Accessibility
- WCAG 2.1 AA compliance target
- All images have alt text
- All interactive elements keyboard accessible
- Color contrast meets AA standard
- Screen reader tested on main flows
- Focus indicators visible on all interactive elements

### Cookie Consent
- Cookie consent banner on first visit
- Necessary cookies only without consent
- Analytics and marketing cookies require opt-in
- Consent stored and respected across sessions

## Standard Website Requirements

### SEO
- Meta title and description on every page
- Open Graph tags for social sharing
- Twitter card tags
- Canonical URLs
- Sitemap.xml generated and submitted to Google
- Robots.txt configured correctly
- Structured data markup where relevant

### PWA Requirements
- Web app manifest with name, icons, theme color, background color
- Service worker for offline support
- Offline fallback page shown when no connection
- Install prompt handled gracefully
- Push notification permission requested only when relevant
- App icons in all required sizes: 192x192, 512x512, maskable

### Error Pages
- Custom 404 page with helpful navigation
- Custom 500 page with friendly error message
- Maintenance mode page for planned downtime
- All error pages match app design

### Email Templates
- Welcome email on signup
- Email verification email
- Password reset email
- Document processing complete notification
- Exam reminder email
- Weekly progress summary email
- Account deletion confirmation email
- All templates mobile responsive
- All templates tested across major email clients

### Favicon and Icons
- Favicon in ico and png format
- Apple touch icon
- PWA icons in all required sizes
- Open Graph image for social sharing

## Security Completeness

### Bot Detection
- Cloudflare bot management enabled
- CAPTCHA on signup and login after suspicious behavior
- Honeypot fields on public forms

### Dependency Security
- Dependabot or Renovate enabled for automated dependency updates
- npm audit runs in CI on every PR
- Critical vulnerabilities block PR merge
- License compliance check in CI

### Secret Scanning
- GitHub secret scanning enabled
- Gitleaks runs in CI to catch accidental secret commits
- Pre-commit hook warns on potential secrets

### SQL Injection Protection
- ORM used for all queries, no raw string interpolation
- Parameterized queries enforced
- SQL injection audit before launch

### Penetration Testing
- Manual pen test planned before public launch
- OWASP Top 10 checklist reviewed before launch
- Bug bounty program considered post-launch

### Content Security Policy
- Strict CSP header configured
- No inline scripts except where absolutely necessary
- All external scripts allowlisted explicitly

### Additional Security Headers
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy: restrict camera, microphone to only where needed
- Cross-Origin-Opener-Policy: same-origin

## Final Decisions and Clarifications

### Resolved Contradictions
- ORM: Prisma. Not Drizzle. Use Prisma everywhere.
- File storage: Cloudflare R2 everywhere. Not generic S3.
- Error monitoring: Sentry everywhere. Not "Sentry or equivalent".
- Distributed tracing: Sentry. Not Honeycomb.
- Log shipping: Logtail. Not Datadog.

### Language and Platform
- English only. No internationalization planned.
- PWA only. No native mobile app planned.

### API Versioning
- All API routes prefixed with /api/v1/
- Example: /api/v1/auth/signin, /api/v1/tutor/next
- Version stays v1 until a breaking change requires v2

### Streaming Strategy
- Tutor responses streamed using Server-Sent Events (SSE)
- Frontend reads SSE stream and renders tokens as they arrive
- Quiz and flashcard responses are not streamed, returned as full JSON
- Voice responses streamed as audio chunks

### Monorepo Structure
- Turborepo for monorepo management
- packages/api — Node.js backend
- packages/db — Prisma schema and migrations
- packages/shared — shared TypeScript types and utilities
- packages/emails — email templates using React Email

### Local Development
- Docker Compose for local PostgreSQL, Redis, and pgvector
- .env.local for local environment variables
- Seed script to populate development database with test data
- Local AI calls use real Anthropic API with a dev quota
- README documents exact steps to run locally from scratch

### Environment Strategy
- Three environments: local, staging, production
- Staging mirrors production exactly
- All environment variables stored in Railway environment secrets
- Local variables in .env.local, never committed
- Startup validation checks all required env vars exist and fails fast if missing

### API Documentation
- Swagger auto-generated from Zod schemas
- Available at /api/docs in development and staging
- Disabled in production

### Payment and Subscriptions
- Stripe for payment processing
- Free plan enforced via PlanSubscriptions table check in middleware
- Paid plan unlocks higher quotas and more documents
- Webhook from Stripe updates subscription status in database
- New tables needed: PlanSubscriptions, StripeEvents

### Missing Database Tables
- AuthSessions: id, user_id, token_hash, expires_at, created_at, ip_address, user_agent
- EmbeddingChunks: id, document_id, section_id, chunk_index, content, embedding vector, token_count, metadata_json
- PlanSubscriptions: id, user_id, plan_type, stripe_customer_id, stripe_subscription_id, status, current_period_end
- StripeEvents: id, stripe_event_id, type, payload_json, processed_at

### Image Optimization
- Next.js Image component used for all images
- All images served as WebP via Next.js automatic conversion
- User uploaded images stored as original in R2 and served via Cloudflare CDN

### Font Strategy
- System font stack only for performance
- No custom font loading
- font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif

### Analytics
- PostHog for product analytics
- Tracks: page views, session starts, uploads, quiz completions, feature usage
- PostHog Cloud
- No tracking without cookie consent

### Feature Flags
- PostHog feature flags for safe rollouts
- New engines and modes hidden behind flags until stable
- Flags evaluated server-side to prevent client manipulation

### Admin Panel
- Simple internal admin at /admin route
- Protected by admin role check
- Admin can: view users, suspend accounts, view document processing status, view AI usage and costs, manage abuse reports
- Not part of Phase 1, built in Phase 5

### Support System
- Crisp chat widget for user support
- Bug report button in app settings
- Support email linked in footer
- Not part of Phase 1

### Large Document Handling
- Documents over 100 pages processed in chunks by worker
- Worker updates processing_status as each chunk completes
- User sees live progress percentage on upload page
- Processing timeout: 10 minutes, after which job is marked failed and user notified
- User can retry processing from document page

### Concurrent Upload Limit
- Maximum 3 concurrent uploads per user
- Enforced at upload endpoint with Redis counter
- User shown clear error if limit reached

### AI Quota Exhausted Mid-Session
- Check remaining quota before every AI call
- If quota exhausted mid-session, pause session gracefully
- Show user clear message: quota reached, session saved, resume tomorrow or upgrade
- Session state preserved so user resumes exactly where they stopped

### Webhook Handling
- Stripe webhooks handled at POST /api/v1/webhooks/stripe
- Resend webhooks handled at POST /api/v1/webhooks/resend
- All webhooks verified with signature before processing
- Webhook events stored in StripeEvents table for idempotency
- Failed webhooks retried by provider automatically

### Changelog
- Public changelog at /changelog
- Updated with each significant feature release
- Brief plain-language entries, no technical jargon
- Linked in footer and in app dashboard

### Seed Data
- Seed script creates: 2 test users, 1 institution, 3 courses, 2 sample documents with pre-processed sections
- Seed runs with: npm run db:seed
- Seed is idempotent, safe to run multiple times

## Elite Tutor Intelligence Rules

### Goal Awareness Rule
Before or early in every session, determine:
- what the learner wants to achieve: pass exam, build project, quick understanding, or deep mastery
- how deep they need to go
- how fast they need to move
Adapt depth, pacing, examples, and quiz difficulty based on the stated goal.
Same content with different goals requires different teaching.

### Relevance Filter Rule
For each concept, mark as: core, supporting, or low priority.
Explicitly signal importance to the learner:
- "This is very important"
- "This is helpful but not critical"
Adjust time spent, number of checks, and depth of explanation based on relevance level.
The system must never treat all content as equally important.

### Loop Closure Rule
Before marking any concept complete:
- ask a usage-level question
- connect it to a real task or system
- verify the learner can USE it, not just explain it
Example: not just "what is polymorphism" but "when would you use it in real code and why"

### Abstraction Ladder Rule
For each concept, move between levels of thinking:
1. Concrete: story or real situation
2. Example: specific case
3. Concept: named idea
4. System: how it fits with other ideas
5. Abstract: general principle
If learner is stuck, go DOWN to more concrete.
If learner is strong, go UP to more abstract.
Never stay at one level for the whole lesson.

### Stress Test Rule
Occasionally challenge the learner with:
- tricky edge cases
- slightly misleading scenarios
- combined concepts that require integrating multiple ideas
Goal: expose weak understanding before the exam does.
Real mastery survives pressure. Familiarity does not.

### Meta-Learning Feedback Rule
Periodically tell the learner:
- what explanation style is working for them
- where they tend to struggle
- how they have improved since last session
- how they should study outside the system
Example: "You understand best when we use examples first. Keep doing that when you study on your own."
This teaches the learner how they learn, not just what they are learning.

### Memory Compression Rule
After every 3 to 5 concepts:
- compress into a simple mental model
- create a short "remember this as" summary
- link multiple concepts together into one coherent picture
Example: "Think of this whole topic as a system where X controls Y and Z reacts to both."
Compression strengthens retention and prevents isolated memorization.

### Tutor Decision Loop
At every step during a live session, decide the next action using this exact order:

1. Check learner state:
   - confusion score
   - mastery state of current concept
   - response quality
   - cognitive load level
   - motivation state

2. Decide primary action:
   - IF concept not yet introduced: TEACH
   - ELSE IF concept introduced but not checked: CHECK UNDERSTANDING
   - ELSE IF confusion is high: RETEACH using different explanation type
   - ELSE IF response is weak or vague: ASK SMALLER SIMPLER QUESTION
   - ELSE IF partial understanding: REFINE with targeted question
   - ELSE IF strong understanding: ADVANCE or INCREASE DIFFICULTY
   - ELSE IF mastery criteria not met: APPLY DIFFERENT QUESTION TYPE
   - ELSE IF mastery criteria met: MARK MASTERED and MOVE ON

3. Secondary adjustments:
   - If cognitive load is high: slow down, reduce chunk size
   - If boredom detected: increase challenge, add tricky question
   - If repeated failure: trigger failure recovery ladder

4. Every 3 to 5 steps:
   - Run mini review or link to previous concept

5. Before moving to next concept:
   - Verify mastery gate is satisfied

6. Before ending session:
   - Run full coverage audit

### Transition Intelligence Rule
Before moving to any new concept:
- briefly connect it to what was just learned
- explain why this next concept matters
- show how it fits into the bigger picture
Never jump between concepts without a bridge.
Transitions are not wasted time. They are what makes knowledge stick.

### Session Narrative Rule
Treat every lesson as a journey with a clear shape:
- Beginning: tell the learner what they are trying to understand and why it matters
- Middle: build pieces step by step, showing how each connects
- End: show the full picture and what the learner now owns
Occasionally remind the learner:
- where they are in the journey
- what they have built so far
- what is coming next
The learner should never feel lost inside a session.

## Frontend and UX Decisions

### Authentication Flow
- Frontend sends all API requests with credentials: include to attach httpOnly cookie automatically
- No token stored in localStorage or sessionStorage
- Session checked on app load via GET /api/v1/auth/session
- Redirect to login if session invalid or expired

### CORS Configuration
- Backend allows requests only from app.domain.com and localhost:3000 in development
- Credentials: true in CORS config to allow cookies
- No wildcard origins ever

### Request Body Size Limits
- Default body limit: 1MB for all JSON endpoints
- Upload endpoints handle multipart form data separately via streaming
- Reject oversized bodies with 413 status before processing

### Loading States Strategy
- Skeleton screens for all page-level content loads
- Inline spinners for button actions
- Never show empty state and loading state at the same time
- Streaming tutor responses show text as tokens arrive, no spinner

### Error Display Strategy
- Toast notifications for background errors and success confirmations
- Inline errors directly below form fields for validation failures
- Full page error state for catastrophic failures like session expired
- Toast library: Sonner (lightweight, works well with Next.js)

### UI Component Library
- Shadcn/ui as base component library
- Tailwind for all custom styling
- No other component libraries mixed in
- All components accessible by default via Shadcn

### Dark Mode
- Dark mode supported from day one
- System preference detected automatically via prefers-color-scheme
- User can override in settings
- Persisted in user preferences in database

### Minimum Supported Browsers
- Chrome 100+
- Firefox 100+
- Safari 15+
- Edge 100+
- No Internet Explorer support

## Developer Experience Decisions

### ESLint and Prettier
- ESLint with typescript-eslint and Next.js rules
- Prettier for formatting
- Both run in CI and as pre-commit hooks
- Disagreements between ESLint and Prettier resolved by eslint-config-prettier

### Commit Convention
- Conventional commits: feat, fix, chore, docs, refactor, test, style
- Example: feat(tutor): add confusion signal detection
- Enforced via commitlint in pre-commit hook

### Branch Naming
- feature/short-description
- fix/short-description
- chore/short-description
- All branches off main, no long-lived branches except main and staging

### PR Template
- What does this PR do
- How to test it
- Checklist: tests added, types correct, no console logs, migrations included if needed

### Admin Role Assignment
- Admin role stored as role field on Users table: student or admin
- First admin set manually via seed script or database update
- Admin can promote other users to admin via admin panel
- No self-service admin promotion ever

## Background Job Decisions

### BullMQ Retry Strategy
- All jobs retry up to 3 times with exponential backoff: 1s, 5s, 30s
- After 3 failures job moves to dead letter queue
- Dead letter queue monitored via admin panel
- Admin can retry or discard dead letter jobs manually
- Job payloads never contain raw user secrets or tokens

### Dead Letter Queue
- Separate BullMQ queue named dlq
- All permanently failed jobs from all queues land here
- Sentry alert triggered when job enters dlq
- Admin reviews dlq daily

### Anthropic API Rate Limit Handling
- Catch 429 responses from Anthropic API
- Retry after the retry-after header value
- If retry fails twice, pause session and notify user
- Track rate limit hits in custom metrics dashboard

## Testing Decisions

### Test Database Strategy
- Separate test database provisioned in CI via Docker
- Each test suite runs in a transaction rolled back after suite completes
- No shared state between test files
- Seed data created fresh per test suite using factories

### TypeScript Sharing
- All shared types defined in packages/shared
- Frontend and backend import from packages/shared
- Never duplicate type definitions across packages

## Subscription and Payment Decisions

### Subscription Cancellation
- User can cancel anytime from settings
- Access continues until end of current billing period
- No prorated refunds on cancellation
- Stripe handles billing period end and downgrades plan automatically

### Stripe Webhook Permanent Failure
- If Stripe webhook fails after all retries, Stripe stops retrying after 3 days
- Admin receives Sentry alert if webhook processing fails
- Admin can manually trigger webhook replay from Stripe dashboard
- PlanSubscriptions table always treated as source of truth, not Stripe alone

### Free Trial
- No free trial. Free plan available indefinitely with usage limits.
- Upgrade prompt shown when free limits are reached

## Final Elite Intelligence Layer

### Error Classification Rule
When a learner gives an incorrect or weak response, do not immediately reteach.
First classify the error type, then choose the correct response.

Error types and responses:

1. Misconception
   - Learner believes something incorrect as a rule
   - Response: confront directly and contrast with the correct idea
   - Example: "A lot of people think that. Here is why that is not quite right..."

2. Partial Understanding
   - Learner has some correct structure but is missing pieces
   - Response: guide to fill the missing link, do not do a full reteach
   - Example: "You have the first part right. What happens after that step?"

3. Surface Memorization
   - Learner repeats words correctly but cannot explain the meaning
   - Response: ask a why or how question to force deeper thinking
   - Example: "Good. Now tell me why that is true in your own words."

4. Careless Mistake
   - Learner understands the concept but made a small slip
   - Response: point attention to the specific step, do not reteach the whole concept
   - Example: "Almost. Look at step 2 again. What did you get there?"

5. Guessing
   - No reasoning is present in the answer
   - Response: require explanation before continuing, never reward a lucky guess
   - Example: "Interesting. Walk me through how you got that."

6. Vocabulary or Language Block
   - Learner is confused by wording, not by the concept itself
   - Response: simplify the wording and restate the question, do not assume concept failure
   - Example: "Let me ask that differently..."

This engine answers: what kind of problem is this?
The Confusion Signal Engine answers: is there a problem?
Both are required. They work together.

### Prediction Rule
Before teaching any concept, identify likely misconceptions in advance.
Warn or prepare the learner before the mistake happens rather than only reacting after.

Example:
"Before we go into this, many people assume X means Y. That is a very common mistake.
Let us build the idea properly so you do not fall into that trap."

This is what separates a reactive tutor from a proactive one.
Prediction prevents misconceptions from forming instead of correcting them after the fact.

The Analysis Engine must output predicted misconceptions per concept during document analysis.
The Teaching Planner must include a pre-warning step for high-risk concepts.
The Tutor Engine must deliver the warning naturally before teaching the concept.

## Final Gap Closures

### Token Budgeting Strategy
The System Orchestrator must never send all engine state to the LLM in one call.
Use this priority system per call type:

Tutor next step call — always include:
- Current LessonSegment
- Current MasteryState for active concept
- Top 5 retrieved chunks from vector layer
- LearnerProfile summary (compact, under 200 tokens)
- Last 3 tutor turns for continuity

Tutor next step call — include only if relevant:
- Explanation history (only if in reteach loop)
- Confusion score (only if above threshold)
- Misconception warnings (only if concept is high risk)

Quiz generation call — always include:
- Concept being tested
- ATUs linked to concept
- Learner weak areas summary
- Last 3 quiz attempts for this concept

Assistant question call — always include:
- User question
- Selected text or highlighted section
- Top 3 retrieved chunks
- Current concept context

Rule: each LLM call must stay under 8000 tokens total including system prompt.
Rule: never pass raw full document text to any LLM call. Always use retrieved chunks.
Rule: compress LearnerProfile to key fields only before including in any prompt.
Rule: use separate focused LLM calls per engine, not one mega-prompt for all 19 engines.
The orchestrator chains calls, it does not batch them into one giant prompt.

### Math and Scientific Expression
- KaTeX used for all math and formula rendering in frontend
- Tutor Engine instructed to output formulas using KaTeX syntax
- Quiz Engine outputs answer options with KaTeX where needed
- Flashcard front and back support KaTeX rendering
- Document ingestion extracts LaTeX expressions from PDFs where present
- If formula cannot be extracted cleanly, ingestion flags it for manual review
- Chemistry, physics, and mathematics documents are supported from day one

### Hallucination Reporting
New UI element: Flag This button on every tutor explanation block and every quiz answer explanation
User can flag: wrong information, confusing explanation, irrelevant answer

New database table: UserFeedback
- id, user_id, session_id, concept_id, content_type, flagged_text, reason, status, created_at
- status values: pending, reviewed, confirmed_error, dismissed

Admin panel shows: all pending flags sorted by frequency
Admin can: mark as confirmed error, add a correction note, trigger reprocessing of that concept
Confirmed errors trigger a Sentry alert for engineering review

Rule: flagged concepts are deprioritized in mastery marking until reviewed
Rule: if more than 3 users flag the same concept explanation, auto-alert admin

### Cold Start Solution
Phase 1 includes a mini calibration step at first login.
Not a full personalization engine. Just enough to not be blind.

Mini calibration collects:
- Academic level: high school, undergraduate, postgraduate, professional
- Study goal for this session: pass exam, deep understanding, quick overview, build project
- Preferred explanation start: give me an example first, explain it directly, tell me why it matters first

This takes under 60 seconds and stores result in LearningProfiles table.
The tutor uses this from the very first session in Phase 2.
Full personalization engine with observed behavior tracking is still Phase 4.
The mini calibration is just the starting point, not the final profile.

### Document Versioning
When a user uploads a new version of an existing document:
- System checks document title and course against existing documents for that user
- If match found, prompt user: is this an update to an existing document or a new document?
- If update: create new Document record, link to previous via superseded_by field on old record
- Mastery state from old document carries over for concepts with matching concept_name
- New concepts in the updated document start fresh
- Deprecated concepts from old version are archived, not deleted
- User can view both versions from document page

New field on Documents table: superseded_by (nullable, references Documents.id)
New field on ConceptNodes table: carried_over_from (nullable, references ConceptNodes.id)

### State Machines

#### Document Processing States
pending — uploaded, waiting for worker to pick up
queued — worker has picked up job, waiting for processing slot
processing — worker actively parsing file
extracting — extracting text, images, and structure
indexing — creating embeddings and storing chunks
complete — all processing done, document ready for study
failed — processing failed after all retries, user notified
retrying — transient failure, job will retry automatically

Transitions:
pending → queued (worker picks up)
queued → processing (worker starts)
processing → extracting (parse complete)
extracting → indexing (extraction complete)
indexing → complete (indexing complete)
any state → failed (max retries exceeded)
failed → retrying (admin triggers retry)
retrying → queued (retry begins)

#### Study Session States
created — session initialized but not yet started
active — learner is currently in session
paused — learner explicitly paused
abandoned — no activity for 30 minutes, auto-paused
completed — all segments taught and coverage audit passed
incomplete — session ended before completion, resume available

Transitions:
created → active (learner starts)
active → paused (learner pauses or closes app)
active → abandoned (30 minute inactivity timeout)
active → completed (coverage audit passes)
active → incomplete (learner ends session early)
paused → active (learner resumes)
abandoned → active (learner returns)
incomplete → active (learner resumes)

#### Tutor Turn States
idle — waiting for learner action
teaching — delivering explanation
checking — waiting for learner response
evaluating — processing learner response
reteaching — delivering alternate explanation after weak response
advancing — moving to next concept after mastery confirmed
reviewing — running mini review of prior concepts
auditing — running coverage audit before session end

#### Quiz Attempt States
generated — questions ready, not yet shown
in_progress — learner answering
submitted — answer received, awaiting evaluation
evaluated — correct or incorrect determined
explained — explanation delivered
complete — all questions in set answered

#### Voice Session States
idle — no active voice session
listening — microphone open, waiting for speech
processing — speech to text running
responding — text to speech playing
paused — voice session paused by learner
ended — voice session closed

### Evaluation Framework
The following metrics define whether the tutor is working. These must be tracked in the database and visible in the admin dashboard.

Per session metrics:
- ATU coverage rate: percentage of document ATUs taught and checked per session
- Mastery gain: number of concepts moving from not_taught to mastered per session
- Reteach rate: how often the tutor had to switch explanation type
- Confusion trigger rate: how often confusion signal fired per session
- Quiz accuracy on first attempt vs second attempt per concept

Retention metrics (requires follow-up session data):
- 24 hour retention: quiz accuracy on same concepts 24 hours later
- 7 day retention: quiz accuracy on same concepts 7 days later
- Spaced repetition effectiveness: mastery state still held after gap

Product metrics:
- Session completion rate: sessions that reach completed vs abandoned or incomplete
- Drop-off point: which concept or phase learners most commonly stop at
- Upload to first session rate: how many uploads lead to an actual study session
- Return rate: users who come back within 7 days after first session

Exam mode metrics:
- Score improvement: quiz accuracy before vs after exam mode session
- Weak topic resolution rate: weak topics resolved before exam date

These metrics stored in UserEvents and aggregated via PostHog.
Admin dashboard shows these metrics at product level.
User sees their own mastery gain and retention in progress page.

### Prompt Versioning
Each engine prompt is versioned and stored in the codebase at:
packages/api/src/ai/prompts/

File naming: engine-name.v1.ts, engine-name.v2.ts
Active version configured per engine via environment variable: TUTOR_PROMPT_VERSION=v2

Each prompt file exports:
- version: string
- createdAt: string
- changelog: string describing what changed and why
- prompt: string containing the full prompt text
- evalCriteria: string describing how to measure if this prompt version is better

Before rolling out a new prompt version:
- Run eval suite against 20 sample sessions comparing old and new version
- New version must show equal or better performance on: mastery gain rate, reteach rate, confusion trigger accuracy
- If new version regresses on any metric, rollback automatically to previous version
- Rollback triggered by setting env var back to previous version, no redeployment needed

### Human Fallback UX
If the tutor keeps misunderstanding the learner, the learner can:
- Press "Start Over This Concept" — clears current concept state and begins explanation fresh
- Press "Change Explanation Style" — cycles to next explanation type immediately
- Press "Make It Simpler" — triggers surface-first restart for current concept
- Press "I Already Know This" — marks concept as skipped, moves to next, skipped noted in coverage audit
- Press "Ask a Different Question" — generates new quiz question on same concept

If learner flags frustration three times in one session:
- System acknowledges: "Let us slow down and try a completely different approach"
- Cognitive Load Regulator sets load level to low
- Explanation Diversity Memory resets to most concrete available type
- Motivation Layer switches to encouragement mode

### Admin Panel API Routes
- GET /api/v1/admin/users — list users with filters
- PUT /api/v1/admin/users/:id/suspend — suspend account
- PUT /api/v1/admin/users/:id/restore — restore suspended account
- GET /api/v1/admin/documents — list all documents with processing status
- POST /api/v1/admin/documents/:id/reprocess — trigger reprocessing
- GET /api/v1/admin/ai-usage — AI usage and cost dashboard
- GET /api/v1/admin/feedback — list flagged content
- PUT /api/v1/admin/feedback/:id/review — mark feedback as reviewed
- GET /api/v1/admin/dlq — list dead letter queue jobs
- POST /api/v1/admin/dlq/:id/retry — retry failed job
- POST /api/v1/admin/dlq/:id/discard — discard failed job
- GET /api/v1/admin/metrics — product metrics dashboard

### Offline PWA Behavior
Service worker caches:
- App shell: all static assets, fonts, icons
- Last visited dashboard state
- Active session state snapshot (so learner can see where they were)
- Last 3 flashcard sets

Service worker does NOT cache:
- Authenticated API responses
- AI tutor responses
- Document processing results

When offline:
- Learner can review cached flashcards
- Learner can see their last session summary
- All other features show: "You are offline. Connect to continue studying."
- App does not crash, shows graceful offline page
- When connection restores, app syncs automatically

### Subscription Middleware Pattern
Every AI-touching endpoint runs this check before processing:

1. Load user session from cookie
2. Load PlanSubscriptions record for user
3. If plan is free: check daily AI call count from Redis counter
4. If daily limit exceeded: return 429 with message and upgrade prompt
5. If plan is paid: check monthly quota from PlanSubscriptions
6. If monthly quota exceeded: return 429 with message
7. If quota available: proceed with AI call
8. After AI call: increment Redis counter and log token usage

Redis key pattern for daily counter: quota:user:{userId}:date:{YYYY-MM-DD}
TTL on counter key: 25 hours (covers timezone edge cases)

### Missing Database Tables (Final Complete List)
In addition to all previously listed tables, add:

UserFeedback:
- id, user_id, session_id, concept_id, content_type, flagged_text, reason, status, created_at

PromptVersions:
- id, engine_name, version, changelog, activated_at, deactivated_at, eval_score

DocumentVersions:
- id, original_document_id, new_document_id, created_at

AdminActions:
- id, admin_user_id, action_type, target_type, target_id, notes, created_at

### Concept Merging Rules
When document versioning is detected and user confirms update:
- Match concepts by concept_name exact match first
- If exact match: carry over MasteryState
- If no exact match: fuzzy match by description similarity using embeddings
- If similarity above 0.85: prompt admin or user to confirm carry-over
- If similarity below 0.85: treat as new concept, start fresh
- All carry-over decisions logged in DocumentVersions table

### Language and Locale
- English only, no internationalization
- All UI text in English
- All AI prompt outputs expected in English
- All email templates in English
- No RTL support needed
- No locale-specific date formatting needed, use ISO 8601 everywhere
