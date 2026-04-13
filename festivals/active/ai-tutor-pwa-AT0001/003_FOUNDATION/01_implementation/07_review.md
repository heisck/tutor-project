---
fest_type: gate
fest_id: 07_review.md
fest_name: Code Review
fest_parent: 01_implementation
fest_order: 7
fest_status: completed
fest_autonomy: low
fest_gate_id: review
fest_gate_type: review
fest_managed: true
fest_created: 2026-04-12T23:55:19.125820223Z
fest_updated: 2026-04-13T07:57:14.521609649Z
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

### Error Handling & Security

- [ ] Errors are handled appropriately
- [ ] No secrets in code
- [ ] Input validation present where needed
- [ ] No obvious security issues

### Alignment

- [ ] Changes align with sequence goal
- [ ] No scope creep beyond what was requested

## Findings

Document any issues that must be addressed before commit.

**Critical Issues:** (must fix)

**Suggestions:** (should consider)