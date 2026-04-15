# Adaptive AI Learning System

## Product Sentence

TutorAI is an adaptive AI learning system that turns study material into a fully guided, voice-friendly, mastery-based tutoring experience that proves understanding through evidence instead of assumption.

## Core Promise

Most learning tools summarize, explain once, and quiz randomly.

This system is meant to:

- extract the full teachable surface of the source material
- teach in prerequisite-aware order
- adapt to the learner's actual behavior
- detect confusion early
- refuse fake mastery
- maintain continuity across sessions

The target outcome is simple: a learner should perform as well as, or better than, someone who studied the material manually with strong guidance.

## Learner Experience

| Step | Learner Sees | System Responsibility |
| --- | --- | --- |
| 1. Upload | PDFs, slides, notes, and docs go in | Preserve text, structure, visuals, and ownership |
| 2. Understand | Material becomes teachable units | Extract ATUs, concepts, prerequisites, misconceptions, and coverage |
| 3. Calibrate | Short tasks reveal how the learner learns | Model jargon sensitivity, preferred explanation style, pacing tolerance, and breakdown points |
| 4. Teach | Guided modes like step by step, voice tutor, difficult parts only, quiz, exam, flashcards, quick summary | Choose the best next action rather than only generating prose |
| 5. Verify | Tutor checks understanding repeatedly and in different ways | Require explanation, application, transfer, and simplification evidence |
| 6. Continue | Learner resumes seamlessly | Persist session state, weak areas, next best step, and revision targets |

## System Architecture

### 1. Content Understanding Layer

- **Ingestion engine**: parse PDFs, slide decks, docs, extracted visuals, and normalized structure
- **ATU mapper**: break source material into the smallest teachable ideas
- **Analysis engine**: build concepts, prerequisite edges, misconception hints, and importance ordering

Current repo touchpoints:

- `packages/api/src/documents/*`
- `packages/api/src/knowledge/atu-mapper.ts`
- `packages/api/src/knowledge/concept-analyzer.ts`
- `packages/api/src/knowledge/coverage-ledger.ts`

### 2. Teaching Intelligence Layer

- **Teaching planner**: order concepts correctly and create lesson segments with checks
- **Tutor engine**: decide whether to teach, check, reteach, simplify, or advance

Current repo touchpoints:

- `packages/api/src/sessions/planner.ts`
- `packages/api/src/tutor/orchestrator.ts`
- `packages/api/src/tutor/prompt-assembly.ts`
- `packages/api/src/tutor/assistant.ts`

### 3. Adaptive Intelligence Layer

- **Learning profile engine**: store persistent learner preferences and observed tendencies
- **Calibration engine**: learn from real responses instead of self-report only
- **Confusion signal engine**: surface uncertainty before the learner fully fails
- **Error classification engine**: separate misconception, partial understanding, guessing, and vocabulary friction
- **Explanation diversity engine**: avoid repeating the same failed explanation pattern

Current repo touchpoints:

- `packages/api/src/profile/routes.ts`
- `packages/api/src/tutor/evaluation.ts`
- `packages/api/src/tutor/explanation-diversity.ts`
- `packages/api/src/tutor/check-types.ts`

### 4. Mastery System

- **Quiz engine**: create recall, application, transfer, and error-spotting checks
- **Illusion detector**: detect shallow or copied understanding
- **Coverage audit**: ensure important ATUs were not skipped
- **No-fake-mastery gate**: require varied evidence before advancement

Current repo touchpoints:

- `packages/api/src/tutor/mastery.ts`
- `packages/api/src/tutor/coverage-audit.ts`
- `packages/api/src/tutor/evaluation.ts`

### 5. Memory And Continuity

- **Revision engine**: revisit weak or stale concepts through spaced practice
- **Session handoff engine**: restore exact learning state later

Current repo touchpoints:

- `packages/api/src/sessions/handoff.ts`
- `packages/api/src/sessions/state.ts`
- `packages/api/src/sessions/service.ts`

### 6. Control Layer

- **Tutor decision loop**: choose the next best action at every turn
- **Cognitive load regulator**: slow down, simplify, or deepen when appropriate
- **Transition layer**: keep concept flow coherent instead of fragmented

Primary repo touchpoints:

- `packages/api/src/tutor/orchestrator.ts`
- `packages/api/src/tutor/evaluation.ts`
- `packages/api/src/tutor/explanation-diversity.ts`
- `packages/api/src/sessions/planner.ts`

### 7. Voice Layer

- **Voice delivery engine**: make the tutor usable without screen dependence
- **Visual narration support**: describe diagrams and slides in spoken form
- **Voice commands**: let the learner drive pacing and checks hands-free

Current status:

- Product requirement acknowledged
- Dedicated implementation still pending

## Core Data Model

The product revolves around a small set of durable objects:

- **ATUs**: the smallest teachable ideas extracted from source material
- **Concepts**: grouped ATUs with prerequisite structure and teaching order
- **Evidence**: each learner answer, explanation, and check result
- **Mastery state**: not learned, partial, weak, checked, mastered
- **Coverage ledger**: what was taught, checked, unresolved, or skipped
- **Learning profile**: how the learner responds to pacing, language, and explanation style
- **Session handoff snapshot**: enough state to resume without drift

## Non-Negotiable Intelligence Rules

- **No-block rule**: vocabulary must not become a silent gate to learning
- **Story-first rule**: begin with a mental picture before formal abstraction when useful
- **Surface-first rule**: start simple and deepen deliberately
- **Safe-start rule**: do not open with cold-definition prompts
- **Behavioral calibration**: observe learning behavior, not only stated preferences
- **Decision-loop rule**: every turn must justify whether we teach, check, reteach, simplify, or advance
- **Error classification rule**: do not treat every wrong answer as the same failure
- **Prediction rule**: intervene before confusion hardens into error
- **Stress-test rule**: verify with transfer and application, not just recall
- **Loop-closure rule**: end with usable understanding, not only recognition

## Repo Alignment Notes

The existing repo already contains strong foundations for the product:

- upload and normalization
- ATU extraction and concept analysis
- coverage ledger tracking
- teaching-plan generation
- tutor orchestration
- mastery evaluation
- session handoff and resume

The next alignment work should focus on the areas that are part of the product definition but not yet first-class in the implementation:

- richer calibration tasks and observation signals
- explicit multi-mode study surfaces for exam, flashcards, and difficult-parts-only flows
- revision scheduling and weak-topic recurrence
- dedicated voice interaction layer
- stronger illusion-of-understanding checks across session boundaries
