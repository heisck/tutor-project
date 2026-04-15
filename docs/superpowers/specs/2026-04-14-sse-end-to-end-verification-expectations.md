# SSE And End-to-End Verification Expectations

**Date:** 2026-04-14  
**Fest task:** 008_RUNTIME_HARDENING / 01_guardrails_and_verification / 04_sse_stability_reconnect_behavior_and_end_to_end_verification  
**Status:** Implemented

## Verification bar

The tutoring runtime is only considered healthy when all of the following remain true:

1. Reconnecting to `POST /api/v1/tutor/next` keeps event ordering stable for the same tutor turn.
2. Each reconnect gets a fresh stream connection id, but the tutor message identity stays stable for the same session step so the UI can deduplicate safely.
3. Client-side interruption does not fabricate completion and a clean reconnect can consume the full stream afterward.
4. If the client disconnects mid-stream, the server stops emitting additional frames.
5. The owner-scoped tutoring journey works end to end for a processed document:
   - session start
   - initial tutor stream
   - assistant question
   - learner response evaluation
   - pause with persisted handoff
   - resume
   - reconnect stream
   - mastery reaches completion-ready state
   - completed session rejects new tutor streaming
6. Cross-user state access remains blocked during the journey.

## Test anchors

- `packages/api/tests/tutor-stream.test.ts`
- `packages/api/tests/tutor-runtime-e2e.test.ts`

If any future change breaks one of these expectations, it should be treated as a runtime regression for AT0002.
