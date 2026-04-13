# D007: Testing Baseline

## Decision
Require unit tests for new functions, integration tests for every endpoint, and relevant end-to-end coverage for critical flows before work is considered complete.

## Why
The festival goal and rules set a production-readiness bar from day one. The product spans auth, uploads, document processing, and AI behavior, which means regressions can become expensive quickly if not caught early.

## Benefits
- Protects correctness across the modular monolith
- Makes ownership, validation, and processing-state behavior verifiable
- Supports CI enforcement before future phases increase complexity

## Tradeoffs
- Slows initial delivery compared with ad hoc prototyping
- Requires stable test harnesses and fixtures early in the project

## Result
Every implementation phase must ship with lint, typecheck, and the task-specific tests required by FEST before it is considered ready to advance.
