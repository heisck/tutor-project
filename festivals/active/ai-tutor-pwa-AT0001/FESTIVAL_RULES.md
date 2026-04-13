---
fest_type: festival
fest_id: AT0001
fest_name: ai-tutor-pwa
---
# Festival Rules: ai-tutor-pwa

Every worker — human or AI — must follow these rules throughout the entire festival.
These rules are not suggestions. They are the quality contract.

## Engineering Rules

### General
- TypeScript strict mode everywhere, no any types
- Zod for all input validation on every endpoint
- No raw SQL unless using parameterized queries
- All environment variables validated at startup, app fails fast if missing
- No secrets in code, commits, or logs ever
- All errors must be caught, logged, and handled gracefully
- No console.log in production code, use structured logger

### Backend
- Every endpoint must verify authentication before doing anything else
- Every endpoint must verify ownership of the resource being accessed
- Every response must have correct HTTP status codes
- All AI calls must have timeout and fallback handling
- All external service calls must have retry logic with exponential backoff
- Never trust client-sent data without server-side validation

### Frontend
- Never trust data from the server without type checking
- Never store sensitive data in localStorage
- Never expose internal IDs or system details in the UI
- All forms must have loading, error, and success states
- PWA service worker must not cache authenticated responses

### Database
- Every migration must be reversible
- Never drop a column or table without a deprecation phase
- All foreign keys must have indexes
- All queries touching user data must include user_id in the WHERE clause
- No N+1 queries, use eager loading or batch queries
- All migrations tested in staging before production

### AI and Prompts
- Uploaded document text must always be wrapped as data, never as instructions
- System prompt must be separated from retrieved document content
- All retrieval results must be scoped to the document owner
- No AI response is shown to the user without sanitization
- All AI calls must log token usage for cost tracking
- Prompt injection defense is mandatory on every AI-touching endpoint

## Testing Rules

- Every new function must have a unit test
- Every API endpoint must have an integration test
- Every critical user flow must have an end-to-end test
- Tests must run in under 5 minutes total in CI
- No PR merges if any test fails
- No PR merges if coverage drops below 80% on the changed module
- Mocks must not hide real behavior, prefer integration tests for DB logic
- Test file lives next to the module it tests
- E2E tests cover: signup, upload, start session, quiz, resume session

## CI/CD Rules

- Every PR must pass: lint, type check, unit tests, integration tests
- No direct commits to main, all changes via PR
- Staging deployment happens automatically on merge to main
- Production deployment requires manual approval
- Database migrations run before app deployment, never after
- Rollback plan documented for every deployment
- Environment variables managed via secrets manager, never in repo
- Docker images tagged with git commit SHA

## Security Rules

- All endpoints behind auth unless explicitly marked public
- Rate limiting on all endpoints, stricter on AI and upload endpoints
- File uploads validated for MIME type, size, and content before processing
- All file access via signed URLs with expiry, no public buckets
- HTTPS enforced everywhere, HTTP redirects to HTTPS
- Secure headers set: CSP, X-Frame-Options, X-Content-Type-Options
- CSRF protection on all state-changing endpoints
- XSS protection on all rendered user content
- Audit log for sensitive operations: login, upload, delete, settings change
- No user PII in error messages or logs

## AI Behavior Rules

- Tutor must never skip a concept to save time
- Tutor must never accept passive listening as mastery
- Tutor must never repeat the same failed explanation
- Tutor must never open with a technical definition before grounding the idea
- Tutor must use story-first, surface-first teaching order
- Tutor must update learner profile from observed behavior, not just stated preference
- Quiz engine must rotate question types, never only recall
- Coverage audit must run before any session is marked complete
- No concept marked mastered without evidence from the learner
- Assistant engine must stay grounded in document context at all times

## Code Review Rules

- Every PR needs at least one reviewer
- Reviewer checks: correctness, security, test coverage, error handling
- No approval if tests are missing
- No approval if security rule is violated
- No approval if AI prompt rule is violated
- Comments must be resolved before merge

## What Not To Do

- Do not start with microservices
- Do not build social or ranking features before tutoring core works
- Do not polish UI before engines work correctly
- Do not add calendar sync, drag-drop animations, or advanced social before Phase 5
- Do not use any as a TypeScript type
- Do not store secrets in code or commits
- Do not mark a concept mastered without learner evidence
- Do not let document content override system instructions
- Do not skip writing tests to ship faster
