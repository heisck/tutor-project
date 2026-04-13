---
fest_type: workflow
fest_id: 002_PLAN-WF
fest_parent: 002_PLAN
---

# Planning Phase Workflow

This document guides the agent through the planning phase. Follow these steps in order.

---

## Step 1: REVIEW

**Goal:** Understand the planning inputs and prior phase outputs.

**Actions:**
1. Read FESTIVAL_GOAL.md
2. Read FESTIVAL_OVERVIEW.md
3. Read 001_INGEST output_specs files
4. Identify the product goals, architecture, and implementation constraints

**Output:** Clear understanding of what the system must implement

---

## Step 2: DECOMPOSE

**Goal:** Break the product into executable phases, sequences, and tasks.

**Actions:**
1. Define the implementation phase breakdown
2. Define sequence structure within each phase
3. Define major task groups needed for execution
4. Document the structure in plan/STRUCTURE.md

**Output:** A documented build structure for the festival

---

## Step 3: DESIGN

**Goal:** Record key architecture and implementation decisions.

**Actions:**
1. Document major design choices
2. Create decisions/INDEX.md
3. Create at least one decision file for the chosen architecture direction

**Output:** Architecture decision records for downstream agents

---

## Step 4: IMPLEMENTATION_PLAN

**Goal:** Produce a concrete implementation roadmap.

**Actions:**
1. Create plan/IMPLEMENTATION_PLAN.md
2. Define phase goals
3. Define sequence goals
4. Define dependencies and ordering

**Output:** An implementation plan agents can execute

---

## Step 5: COMPLETE

**Goal:** Finish the planning phase and hand off to implementation.

**Actions:**
1. Confirm planning artifacts exist
2. Confirm planning outputs align with FESTIVAL_OVERVIEW.md
3. Prepare downstream implementation phases for execution

**Output:** Planning phase completed and ready for implementation

## Workflow State Tracking

| Step | Status | Notes |
|------|--------|-------|
| 1. REVIEW | [x] complete | |
| 2. DECOMPOSE | [x] complete | |
| 3. DESIGN | [x] complete | |
| 4. IMPLEMENTATION_PLAN | [x] complete | |
| 5. COMPLETE | [x] complete | |
