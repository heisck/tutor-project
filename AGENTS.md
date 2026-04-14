# AGENTS.md

## Campaign: tutor

This is the AI agent instruction file for the tutor campaign.

## Overview

<!-- Describe what this campaign is about -->

## Projects

<!-- List and describe your projects -->

## Development Guidelines

<!-- Add coding standards, patterns, etc. -->

## Directory Structure

| Directory | Purpose |
|-----------|---------|
| projects/ | Git submodules and project repositories |
| projects/worktrees/ | Git worktrees for parallel development |
| ai_docs/ | AI-generated documentation |
| docs/ | Human-authored documentation |
| dungeon/ | Archived, deprioritized, or paused work |
| festivals/ | Festival methodology planning (via fest CLI) |
| workflow/ | Development workflow artifacts |
| workflow/code_reviews/ | Code review notes and feedback |
| workflow/pipelines/ | CI/CD and automation |
| workflow/design/ | Design documents and specifications |
| workflow/explore/ | Exploratory research and discovery notes |
| .campaign/intents/ | System-managed intent state used by `camp intent` |

## Navigation Shortcuts

| Shortcut | Directory |
|----------|-----------|
| `cgo p` | projects/ |
| `cgo wt` | projects/worktrees/ |
| `cgo w` | workflow/ |
| `cgo f` | festivals/ |
| `cgo a` | ai_docs/ |
| `cgo d` | docs/ |
| `cgo du` | dungeon/ |
| `cgo cr` | workflow/code_reviews/ |
| `cgo pi` | workflow/pipelines/ |
| `cgo de` | workflow/design/ |
| `cgo ex` | workflow/explore/ |
| `cgo i` | .campaign/intents/ |

## UI & Design System Rules

You are a senior frontend engineer and motion designer.
Never generate generic AI-looking UI.

### Base stack
- Tailwind CSS + shadcn/ui for all base UI
- 8px spacing scale throughout
- Component-first: build reusable components, then compose pages
- Separate layout / UI / logic

### Visual quality
- Strong visual hierarchy: title → subtitle → content
- Minimal, Apple-like design — no clutter, no over-design
- Soft shadows, rounded corners, proper whitespace
- Every interactive element must have hover, active, and focus states
- Card-based layouts with clear section boundaries

### Animations (Framer Motion)
- Use for: entrance, hover, tap, loading, page transitions
- Subtle and purposeful — no excessive bounce or flash
- Fast and smooth — prefer ease-out, 200–400ms range
- Every animation must justify its existence (clarity or delight)
- Separate animation logic from business logic

### 3D (React Three Fiber + Three.js)
- Use for: hero sections, product demos, background scenes, key interactions
- Keep scenes performant — always provide a fallback for low-power devices
- Soft lighting, premium feel
- Do not make the core app flow depend on heavy 3D

### Good places for animation/3D
- Landing/login hero
- Success/completion states
- Dashboard stat cards
- Onboarding flows
- Empty states and loading screens

### Avoid animation/3D on
- Forms
- Data tables
- Core functional flows where trust > delight

### Output rules
- Production-ready code only
- Reusable animated components
- Performance must not degrade on mobile


## AI Instructions

<!-- Add specific instructions for AI agents -->

Planning-layer rule of thumb: use `camp intent` for fast capture and small actionable work, `workflow/design/` for architecture or exploratory thinking, and festivals for structured multi-step execution. Intent state is stored under `.campaign/intents/`. Canonical guide: https://fest.build/guides/intent-design-festival/

---

> See individual directory OBEY.md files for detailed usage information.
