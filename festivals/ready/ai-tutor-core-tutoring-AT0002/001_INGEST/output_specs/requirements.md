# Requirements

## P0 Must Have

### Ingestion
- Parse PDF, PPTX, and DOCX files
- Extract text, bullets, tables, formulas, captions, and meaningful visual labels
- Preserve ordered structure in stored output

### Knowledge Structuring
- Convert extracted content into SourceUnits
- Map SourceUnits into Atomic Teachable Units
- Group ATUs into Concepts
- Build prerequisite and misconception relationships

### Retrieval
- Chunk content for embeddings
- Generate embeddings using the configured embedding model
- Store vectors in pgvector
- Scope retrieval to the current user and document only

### Tutor Flow
- Teach one concept at a time
- Apply story-first and surface-first explanation rules
- Check learner understanding after teaching
- Update mastery state after evaluation
- Reteach when confusion is detected

### Assistant
- Answer freeform learner questions
- Stay grounded in document content only
- Refuse or constrain answers when grounding is insufficient

### Session Continuity
- Save progress after each tutor turn
- Resume from exact stopping point
- Restore current concept, weak areas, and explanation history

### Safety and Quality
- Prevent prompt injection from document content
- Prevent cross-user leakage
- Validate inputs
- Log and control AI usage
- Test all core engines and endpoints

## P1 Important

- Explanation diversity memory
- Coverage audit before completion
- Memory compression across concepts
- Cross-concept linking
- Hallucination reporting support

## P2 Later

- Extra analytics
- More optimization passes
- Additional product refinements outside current festival scope
