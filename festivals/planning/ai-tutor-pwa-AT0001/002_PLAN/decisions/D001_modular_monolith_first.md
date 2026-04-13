# D001: Modular Monolith First

## Decision
Build ai-tutor-pwa as a modular monolith first.

## Why
The platform has many interconnected concerns: auth, uploads, processing, tutoring, quizzes, profiling, and revision. Splitting these into separate services too early would add operational complexity before the system behavior is stable.

## Benefits
- Faster iteration
- Simpler debugging
- Easier local development
- Lower infrastructure overhead
- Stronger consistency across modules early on

## Tradeoffs
- A single deployable unit can become large if boundaries are not respected
- Later extraction into services may require refactoring

## Result
Use package boundaries and module boundaries now, but deploy as one coordinated system first.
