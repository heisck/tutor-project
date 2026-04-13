---
fest_type: workflow
fest_id: 001_INGEST-WF
fest_parent: 001_INGEST
---

# Ingest Phase Workflow

This document guides the agent through the ingest phase. Follow these steps in order, completing each checkpoint before proceeding.

---

## Step 1: READ — Understand All Input

**Goal:** Build comprehensive understanding of what the user has provided.

**Actions:**
1. List all files in `input_specs/`
2. Read each file completely — do not skim
3. Identify: What is the user trying to accomplish? What problem are they solving?
4. Note any questions or ambiguities

**Output:** Mental model of the user's intent

**Checkpoint:** Completed

---

## Step 2: EXTRACT — Identify Key Elements

**Goal:** Pull out the essential information that needs to be structured.

**Actions:**
1. Extract festival purpose
2. Extract requirements
3. Extract constraints
4. Extract context

**Output:** Structured notes on each element

**Checkpoint:** Completed

---

## Step 3: STRUCTURE — Produce Output Specs

**Goal:** Transform extracted elements into structured documents.

**Actions:**
1. Created `output_specs/purpose.md`
2. Created `output_specs/requirements.md`
3. Created `output_specs/constraints.md`
4. Created `output_specs/context.md`

**Output:** Four documents in `output_specs/`

**Checkpoint:** Completed

---

## Step 4: PRESENT — Get User Approval

**Goal:** Verify the structured output captures the user's intent.

**Actions:**
1. Structured outputs prepared for review
2. Interpretations minimized by grounding in FESTIVAL_OVERVIEW.md and FESTIVAL_GOAL.md

**Output:** Output ready for approval

**Checkpoint:** Approved

---

## Step 5: ITERATE or COMPLETE

**Goal:** Handle user feedback or finalize the phase.

**Actions:**
1. Finalized structured output for downstream planning and implementation

**Output:** Phase complete

**Checkpoint:** Completed

---

## Workflow State Tracking

| Step | Status | Notes |
|------|--------|-------|
| 1. READ | [x] complete | Input files reviewed |
| 2. EXTRACT | [x] complete | Key elements extracted |
| 3. STRUCTURE | [x] complete | Output specs created |
| 4. PRESENT | [x] complete | Approved for use |
| 5. COMPLETE | [x] complete | Phase ready to hand off |
