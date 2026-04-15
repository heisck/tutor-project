# Implementation Plan

## Overview

This plan aligns the current monorepo with the full TutorAI product definition: an evidence-based tutoring system that extracts complete study coverage, teaches in the right order, adapts to the learner, and verifies mastery before progression.

## Phase Breakdown

### Phase 1: Content Fidelity And Coverage

**Type:** implementation  
**Goal:** Guarantee that uploaded material becomes a complete, auditable teaching substrate.

#### Sequences

1. **Ingestion completeness**
   - [ ] Harden text, structure, and visual extraction across PDF, PPTX, DOCX
   - [ ] Preserve source ordering strongly enough for teaching and citation
   - [ ] Expose extraction gaps clearly instead of failing silently

2. **ATU and concept quality**
   - [ ] Improve ATU granularity checks and validation heuristics
   - [ ] Strengthen prerequisite edge validation
   - [ ] Record misconception and importance signals as first-class outputs

3. **Coverage audit enforcement**
   - [ ] Ensure completion is blocked when required ATUs are unresolved
   - [ ] Surface missing or skipped coverage in APIs and UI

### Phase 2: Learner Calibration

**Type:** implementation  
**Goal:** Build a real learner model from observed behavior rather than preference toggles alone.

#### Sequences

1. **Calibration tasks**
   - [ ] Add short diagnostic prompts that test explanation preference, jargon tolerance, and pacing fit
   - [ ] Capture hesitation, rephrase requests, and repeated confusion as durable signals

2. **Profile updates**
   - [ ] Persist behavior-driven calibration updates during sessions
   - [ ] Feed those updates back into planning and prompt assembly

### Phase 3: Tutor Decision Loop

**Type:** implementation  
**Goal:** Make every tutor turn an explicit controlled decision instead of a generic answer.

#### Sequences

1. **Action selection**
   - [ ] Expand next-step decisions across teach, check, reteach, simplify, advance, and pause
   - [ ] Tie decisions to coverage state, mastery evidence, and confusion signals

2. **Explanation control**
   - [ ] Enforce story-first and surface-first openings where appropriate
   - [ ] Avoid repeating explanation styles that already failed

3. **Error diagnosis**
   - [ ] Separate misconception, partial understanding, guessing, and vocabulary friction
   - [ ] Route each diagnosis to a distinct follow-up strategy

### Phase 4: Mastery And Study Modes

**Type:** implementation  
**Goal:** Support the promised learner modes while keeping mastery evidence consistent.

#### Sequences

1. **Mastery evidence**
   - [ ] Require explanation, application, and transfer evidence for high-confidence mastery
   - [ ] Add stronger illusion-of-understanding detection

2. **Learner modes**
   - [ ] Add explicit mode orchestration for step-by-step tutoring, difficult-parts-only review, quiz, exam prep, flashcards, and quick summary
   - [ ] Keep all modes grounded in the same concept graph and coverage ledger

3. **UI surfaces**
   - [ ] Expose mastery state, weak areas, and next best action clearly in the web app
   - [ ] Show why the tutor is reteaching or advancing

### Phase 5: Continuity And Revision

**Type:** implementation  
**Goal:** Turn single sessions into a continuous mastery system.

#### Sequences

1. **Session continuity**
   - [ ] Preserve and restore unresolved concepts, current segment, and evidence history
   - [ ] Re-check stale understanding on resume

2. **Revision engine**
   - [ ] Add weak-topic resurfacing and spaced review scheduling
   - [ ] Feed revision outcomes back into mastery state

### Phase 6: Voice Tutor

**Type:** implementation  
**Goal:** Deliver the same guided system through a voice-friendly interaction layer.

#### Sequences

1. **Voice delivery**
   - [ ] Render explanations into spoken-friendly pacing and structure
   - [ ] Narrate visuals when source material depends on them

2. **Voice controls**
   - [ ] Support commands like repeat, simplify, quiz me now, and continue
   - [ ] Keep voice interactions inside the same evidence and mastery model

## Dependencies

| Item | Blocked By | Rationale |
| --- | --- | --- |
| Reliable mastery gating | Content fidelity and coverage audit | Mastery cannot be trusted if important material never entered the system correctly |
| Mode-specific tutoring flows | Tutor decision loop | Every mode still needs the same controlled action selection |
| Revision scheduling | Durable mastery evidence | Revision priorities depend on trustworthy weak-signal history |
| Voice tutor | Tutor decision loop and continuity state | Voice is a delivery layer on top of the core system, not a separate tutor |

## Risks And Mitigations

| Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- |
| The product drifts back into generic chat behavior | Medium | High | Keep action selection, evidence storage, and mastery rules explicit in code and UI |
| Coverage gaps create false mastery | Medium | High | Enforce coverage-ledger checks before advancement and completion |
| Calibration becomes self-report only | Medium | Medium | Prefer observed behavior and task outcomes over settings alone |
| Voice work ships before the core loop is stable | Medium | High | Treat voice as a later delivery phase that depends on the same controlled runtime |
| Too many study modes fragment the implementation | Medium | Medium | Keep all modes mapped to one concept graph, one evidence model, and one mastery gate |
