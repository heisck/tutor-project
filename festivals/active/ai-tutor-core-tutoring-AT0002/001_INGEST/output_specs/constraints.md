# Constraints

## Product Constraints
- Stay within v1 scope
- Do not implement post-v1 features in this festival
- Build on top of the AT0001 foundation

## Technical Constraints
- TypeScript strict mode
- Fastify backend
- Prisma with PostgreSQL
- pgvector for embeddings
- BullMQ for background jobs
- Cloudflare R2 for storage
- Claude for generation and vision
- OpenAI text-embedding-3-small for embeddings

## Architecture Constraints
- Modular monolith only
- No microservices in this phase
- Do not send full raw documents to LLM calls
- Use retrieved chunks for AI grounding

## Security Constraints
- No cross-user data leakage
- Prompt injection defense is mandatory
- Validate all inputs
- Enforce session ownership
- Use secure session handling

## Performance Constraints
- Keep LLM calls within token budget
- Use SSE for tutor and assistant streaming
- Use retries and failure handling for jobs
- Apply rate limits to AI endpoints

## Process Constraints
- Follow FEST workflow order
- Keep outputs structured and reviewable
- Produce artifacts that planning can directly use
