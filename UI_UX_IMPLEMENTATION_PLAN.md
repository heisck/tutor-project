# TutorAI UI/UX Implementation Plan

## Overview
This document captures the complete UI/UX system for TutorAI using the extracted design assets and requirements from the temporary folder:
`C:\Users\DEN6\AppData\Local\Temp\Rar$DRa19980.28220\stitch_tutorai_adaptive_learning_platform`

The extracted UI modules include:
- `landing_page`
- `upload_extraction_flow`
- `student_dashboard`
- `adaptive_study_interface`
- `learning_insights_mastery`
- `scholar_logic`

Additionally, `tutorai_product_requirements.md` contains the project sitemap and primary UX flows.

---

## 1. Core Implementation Priorities

### High-priority screens
1. Dashboard
2. Upload / Extraction Flow
3. Adaptive Study Interface
4. Learning Insights / Mastery
5. Landing Page
6. Profile / Settings (based on requirements)
7. Auth pages (standard implementation)

### Goals
- Build a working UI shell quickly using the design system.
- Keep page structure lean and directly mapped to the backend API.
- Prioritize content, interaction, and navigation over visual polish at first.

---

## 2. Design System Summary

### Brand & Surface Palette
- `primary`: #004ac6
- `secondary`: #006e2f
- `tertiary`: #784b00
- `surface`: #f8f9ff
- `surface-container`: #e6eeff
- `surface-container-high`: #dce9ff
- `surface-container-highest`: #d5e3fc
- `surface-container-low`: #eff4ff
- `surface-container-lowest`: #ffffff
- `surface-tint`: #0053db
- `outline-variant`: #c3c6d7
- `on-surface`: #0d1c2e
- `on-primary`: #ffffff
- `on-secondary`: #ffffff

### Typography
- `Headline`: Space Grotesk
- `Body`: Newsreader
- `Label`: Manrope
- Headline sizes: 3.5rem / 1.75rem
- Body readable line-height: 1.6
- Label: all-caps, letter spacing 0.05em

### Surface Rules
- No 1px borders for layout; use tonal layering instead.
- Use subtle background shifts to separate zones.
- Glassmorphism for AI feedback panels: 60% opacity + blur.
- Ambient shadows only if needed: `0px 12px 32px rgba(13, 28, 46, 0.06)`.

### Buttons
- Primary: solid `primary`, rounded corners, white text.
- Secondary: ghost button with `primary` text, surface container hover.
- AI Action: gradient from `primary` to `primary-container`.

### Inputs
- Minimal bottom-border style.
- Focus: bottom border becomes `primary` and background lightly brightens.

### Visuals
- No heavy borders or harsh shadows.
- Use large whitespace instead of dividers.
- Use left accent bars or subtle color blocks to indicate active items.

---

## 3. Page Structure & Routes

### Public pages
- `/` - Landing page
- `/features`
- `/how-it-works`
- `/about`
- `/contact`
- `/signin`
- `/signup`
- `/password-reset`

### Protected app pages
- `/dashboard`
- `/upload`
- `/documents/[id]/processing`
- `/documents/[id]/structure`
- `/session/[sessionId]`
- `/session/[sessionId]/assistant`
- `/progress/sessions`
- `/progress/concepts`
- `/progress/coverage`
- `/progress/insights`
- `/settings/profile`
- `/settings/preferences`

---

## 4. Screen-by-Screen UX Summary

### Landing Page
- Hero with bold headline and CTA
- Navigation links: Curriculum, Library, Insights
- Notification and settings icons
- Profile avatar preview
- Academic editorial aesthetic with card-based layout
- Uses glassmorphism in hero and feature callouts

### Upload / Extraction Flow
- Drag-and-drop upload interface
- File validation states and progress meter
- Metadata capture after upload
- Processing status page with pipeline steps
- Ability to start session when document is ready

### Dashboard
- Document library + progress cards
- Recent sessions list
- Quick stats area (hours, mastery, streak)
- Primary action buttons for upload and new session
- Academic editorial styling with layered cards

### Adaptive Study Interface
- Large lesson content area
- Right-side mastery tracker and AI interaction card
- Bottom response input area
- Session navigation and status feedback
- Glassmorphic AI panels for explanations and feedback

### Learning Insights / Mastery
- Charts and progress visualizations
- Concept dependency graph
- Coverage audit summary
- Recommendations and weak-area highlights

---

## 5. Recommended Frontend Stack

### Framework
- Next.js 14 or equivalent React-based app

### Styling
- Tailwind CSS (project artifact already uses Tailwind in design prototypes)
- Custom theme tokens matching `landing_page/code.html`

### Fonts
- Space Grotesk
- Newsreader
- Manrope
- Material Symbols Outlined for icons

### Key components
- `AppShell` with top app bar and responsive layout
- `Card` / `Surface` / `GlassPanel`
- `ButtonPrimary`, `ButtonSecondary`, `ButtonAIAction`
- `TextInput`, `Textarea`, `SelectField`
- `ProgressBar`, `StatCard`
- `ConceptGraph` visualization panel
- `SessionPanel`, `MasteryMeter`

---

## 6. Next Steps to Start Using the System

1. Create a frontend package (e.g. `packages/ui` or `apps/web`) with Next.js.
2. Import the Tailwind theme and fonts from the extracted assets.
3. Implement the page routes above using the component set.
4. Connect UI screens to the existing backend API endpoints.
5. Start with the highest-priority screens: Dashboard, Upload, Study Session.

---

## 7. Immediate Action Plan

### Phase 1: MVP UI shell
- Build `dashboard`, `upload`, `session`, `progress`, and `profile` routes.
- Use placeholder data to verify layout and interactions.
- Apply the design system from `scholar_logic/DESIGN.md`.

### Phase 2: Connect data
- Hook upload flow to the backend file upload API.
- Hook dashboard to document/session list APIs.
- Hook study session to session state and tutor endpoints.

### Phase 3: Polish
- Add animations and glassmorphic AI panels.
- Add responsive mobile layouts.
- Validate accessibility and interaction flows.

---

## 8. Immediate UI/UX Deliverable
The extracted assets are sufficient to build the full frontend UX. I can either:
- generate a complete Visual Specification document, or
- scaffold the actual frontend package with routes and components.

If you want, I can now create the first frontend skeleton in this repository, including:
- `pages/_app.tsx`
- `pages/dashboard.tsx`
- `pages/upload.tsx`
- `pages/session/[sessionId].tsx`
- `components/*`

---

## References
- `tutorai_product_requirements.md` — sitemap and UX flow
- `scholar_logic/DESIGN.md` — design system specification
- `landing_page/code.html` — landing page theme and tokens
- `upload_extraction_flow/code.html` — upload experience
- `student_dashboard/code.html` — dashboard layout
- `adaptive_study_interface/code.html` — core tutoring UI
- `learning_insights_mastery/code.html` — analytics screens
