# Festival Structure

## Festival Goal
Build an adaptive AI study platform that turns uploaded learning materials into guided tutoring, intelligent quizzes, personalized revision, and exam-focused support.

## Planned Phases

### 001_INGEST
Goal: Convert raw uploaded files into structured source material for downstream planning and implementation.

### 002_PLAN
Goal: Convert product goals and ingest outputs into an implementation-ready phase, sequence, and task structure for coding agents.

### 003_FOUNDATION
Goal: Set up the platform foundation including auth, profile, upload, storage, database, processing jobs, and dashboard shell.

### 004_INGEST_EXEC
Goal: Implement the real document ingestion and processing pipeline that extracts structured sections and assets from uploaded files.

### 005_TUTOR
Goal: Implement the tutor core that teaches content step by step and supports session state and continuation.

### 006_QUIZ
Goal: Implement intelligent quiz generation, answer evaluation, and weak-topic tracking.

### 007_PROFILE
Goal: Implement personalization, learner profiling, adaptive explanation style, and adaptive quiz behavior.

### 008_REVISION
Goal: Implement spaced revision, weak-area recovery, and exam-focused review logic.

### 009_VOICE
Goal: Implement voice-first tutoring and audio session support.

## Dependencies
- 001_INGEST must be complete before 002_PLAN is considered well-grounded
- 003_FOUNDATION must complete before 004_INGEST_EXEC
- 004_INGEST_EXEC must complete before 005_TUTOR and 006_QUIZ
- 005_TUTOR and 006_QUIZ feed into 007_PROFILE and 008_REVISION
- 009_VOICE depends on stable tutor session logic
