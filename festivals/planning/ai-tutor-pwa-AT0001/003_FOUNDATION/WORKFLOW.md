---
fest_type: workflow
fest_id: 003_FOUNDATION-WF
fest_parent: 003_FOUNDATION
---

# Foundation Phase Workflow

This document guides the agent through the foundation implementation phase. Follow these steps in order.

---

## Step 1: READ_PLAN

**Goal:** Understand exactly what foundation implementation must cover.

**Actions:**
1. Read FESTIVAL_OVERVIEW.md
2. Read 002_PLAN/plan/IMPLEMENTATION_PLAN.md
3. Read 003_FOUNDATION/PHASE_GOAL.md
4. Read 003_FOUNDATION/01_implementation/SEQUENCE_GOAL.md

**Output:** Clear scope for the foundation phase

---

## Step 2: EXECUTE_SEQUENCE

**Goal:** Execute the foundation implementation sequence in task order.

**Actions:**
1. Start with 01_repo_and_app_foundation.md
2. Continue to auth, profile, upload, and document-processing tasks
3. Respect task ordering and task constraints
4. Do not implement later-phase features

**Output:** Foundation modules implemented in order

---

## Step 3: TEST_AND_VERIFY

**Goal:** Verify that implemented modules are correct and stable.

**Actions:**
1. Run tests required by each task
2. Run lint
3. Run typecheck
4. Fix failures before moving on

**Output:** Verified foundation implementation

---

## Step 4: COMPLETE

**Goal:** Finish foundation implementation and prepare for the next phase.

**Actions:**
1. Confirm phase acceptance criteria are met
2. Confirm security rules were followed
3. Confirm all touched modules include tests

**Output:** Foundation phase ready for downstream phases

## Workflow State Tracking

| Step | Status | Notes |
|------|--------|-------|
| 1. READ_PLAN | [ ] pending | |
| 2. EXECUTE_SEQUENCE | [ ] pending | |
| 3. TEST_AND_VERIFY | [ ] pending | |
| 4. COMPLETE | [ ] pending | |
