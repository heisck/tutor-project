# TutorAI - Sitemap for Relume

**Project:** Adaptive AI Learning Platform  
**Date:** April 15, 2026

---

## 🎯 PROJECT OVERVIEW

**Core Concept:** Transform uploaded study materials (PDF, PPTX, DOCX) into adaptive, mastery-based AI tutoring experiences.

**Key Features:**
- Extract concepts & prerequisites from documents
- Mini-calibration quiz (learn student learning style)
- Adaptive AI tutoring with confusion detection
- Mastery verification (multiple evidence types)
- Perfect session continuity (resume exactly where you left)
- Progress tracking & analytics

**Primary User:** Students uploading study materials

---

## 📍 COMPLETE SITEMAP

### AUTHENTICATION (Public)
- Sign Up (email/password)
- Sign In (email/password)
- Google OAuth (sign up/in)
- Password Reset
- Email Verification

### CORE APP (Protected)

**Dashboard**
- Document/course list
- Recent sessions
- Quick stats (hours, progress %)
- Start new session button

**Upload Flow**
- Drag-drop file upload (PDF/PPTX/DOCX)
- Progress indicator
- Metadata input (title, subject, course)
- Processing status page
- Document structure preview

**Study Session**
- Mode selection (Full/Quiz/Flashcards/etc)
- Mini-calibration survey
- Main teaching interface:
  - Left: Lesson content + visuals
  - Right: Mastery tracker, concept map
  - Bottom: Student response input
- Feedback display
- Session pause/resume
- Session complete screen

**Support**
- AI Assistant (Q&A grounded in document)
- Feedback/bug reporting form

**Progress**
- Session history
- Concept mastery map (visual graph)
- Coverage audit (% complete)
- Learning insights & trends

**Profile**
- User info & avatar
- Learning preferences (pace, style, goals)
- Academic level
- Password & security
- Connected accounts (Google)

### PUBLIC PAGES
- Landing page / Home
- Features
- How It Works
- About
- Contact/Support

---

## 🔧 KEY INTERACTIONS

**Upload → Extract → Tutor → Track**
1. Upload document
2. AI extracts concepts/prerequisites
3. Start study session
4. Answer calibration survey
5. Receive adaptive tutoring
6. Submit responses
7. Get AI feedback
8. Track mastery
9. Pause/resume anytime
10. View progress analytics

---

## 🎨 DESIGN REQUIREMENTS

**Colors:** Blue (primary), Green (success), Orange (warning), Red (error)

**Key Pages (Priority):**
1. Dashboard - Medium complexity
2. Study Interface - High complexity, lots of interaction
3. Upload - Linear/straightforward
4. Auth Pages - Standard
5. Analytics - Charts & visualizations

**Responsive:** Mobile (320px), Tablet (768px), Desktop (1920px+)

**Components Needed:**
Buttons, inputs, cards, modals, progress bars, charts, network graphs, toasts, tabs, dropdowns, file upload zone

**Accessibility:** WCAG 2.1 AA, keyboard nav, screen reader support

---

## 📊 DATABASE STRUCTURE (High-Level)

**Core Tables:**
- Users, Auth Sessions, Learning Profiles
- Documents, Document Sections, Assets
- Atomic Teachable Units (ATUs), Concepts, Prerequisites
- Study Sessions, Lesson Segments, Coverage Ledger
- AI Usage Tracking, User Feedback

---

## 🔌 API STRUCTURE

**Main Endpoints:**
- `/auth/*` - Login/signup/OAuth
- `/uploads/*` - File upload pipeline
- `/documents/*` - Document management
- `/sessions/*` - Study session control
- `/tutor/*` - AI teaching engine (SSE streams)
- `/profile/*` - User settings
- `/progress/*` - Analytics & tracking
- `/feedback/*` - Issue reporting

---

## 🛠️ TECH STACK

Backend: Node.js + Fastify + TypeScript  
Database: PostgreSQL + Prisma + pgvector  
Storage: Cloudflare R2  
AI: Claude (Anthropic) + OpenAI embeddings  
Cache: Redis + BullMQ  
Testing: Vitest


