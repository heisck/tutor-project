---
fest_type: task
fest_id: 01_tutor_session_shell_and_sse_rendering.md
fest_name: tutor session shell and sse rendering
fest_parent: 01_session_experience
fest_order: 1
fest_status: completed
fest_autonomy: medium
fest_created: 2026-04-13T17:14:37.456261152Z
fest_updated: 2026-04-14T06:00:31.913733997Z
fest_tracking: true
---


# Task: tutor session shell and sse rendering

## Objective

Build the learner session shell and render tutor SSE events in order so a study session can be experienced inside the web app.

## Requirements

- [ ] Create the main tutoring session route or shell that can start or resume an authenticated study session.
- [ ] Render the tutor SSE event contract faithfully, including streamed content, stateful control events, and terminal session states.

## Implementation

1. Add the web session shell in the existing frontend structure and connect it to session startup or resume data from prior phases.
2. Implement an SSE client layer that consumes the tutor event contract from `006_TUTOR_RUNTIME` and updates UI state in event order.
3. Keep session state recovery grounded in server state so refresh or reconnect does not fabricate progress locally.
4. Add frontend and integration tests for page load, stream rendering, and safe handling of interrupted tutor streams.

## Done When

- [ ] All requirements met
- [ ] Learners can open a session view and watch tested ordered tutor stream output render from the live SSE transport