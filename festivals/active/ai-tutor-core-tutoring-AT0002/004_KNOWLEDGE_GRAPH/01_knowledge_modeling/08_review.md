---
fest_type: gate
fest_id: 08_review.md
fest_name: Code Review
fest_parent: 01_knowledge_modeling
fest_order: 8
fest_status: completed
fest_autonomy: low
fest_gate_id: review
fest_gate_type: review
fest_managed: true
fest_created: 2026-04-13T17:37:21.323271063Z
fest_updated: 2026-04-13T21:51:41.889383369Z
fest_tracking: true
fest_version: "1.0"
---


# Gate: Code Review

Review all code changes in this sequence for quality, correctness, and standards compliance.

## Review Checklist

### Code Quality

- [ ] Code is readable and well-organized
- [ ] Functions are focused (single responsibility)
- [ ] Naming is clear and consistent
- [ ] No unnecessary complexity or duplication

### Standards Compliance

- [ ] Linting passes without warnings
- [ ] Formatting is consistent
- [ ] Project conventions are followed
- [ ] TypeScript strictness is preserved and no `any` types were introduced
- [ ] Zod validation, Prisma access patterns, and shared contract conventions remain aligned with the codebase

### Error Handling & Security

- [ ] Errors are handled appropriately
- [ ] No secrets in code
- [ ] Input validation present where needed
- [ ] No obvious security issues
- [ ] Ownership checks protect every user-scoped read and write touched by the sequence
- [ ] AI-facing prompts preserve grounding boundaries and do not trust uploaded document text as instructions

### Alignment

- [ ] Changes align with sequence goal
- [ ] No scope creep beyond what was requested
- [ ] Work stays inside AT0002 v1 scope and does not add quiz, revision, voice, or post-v1 features

## Findings

Document any issues that must be addressed before commit.

**Critical Issues:** (must fix)

**Suggestions:** (should consider)