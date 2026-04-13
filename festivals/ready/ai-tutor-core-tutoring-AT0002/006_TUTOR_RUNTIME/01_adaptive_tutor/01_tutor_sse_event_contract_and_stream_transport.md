---
fest_type: task
fest_id: 01_tutor_sse_event_contract_and_stream_transport.md
fest_name: tutor sse event contract and stream transport
fest_parent: 01_adaptive_tutor
fest_order: 1
fest_status: pending
fest_autonomy: medium
fest_created: 2026-04-13T17:14:36.038808515Z
fest_tracking: true
---

# Task: tutor sse event contract and stream transport

## Objective

Define the tutor SSE event contract and implement the transport layer that streams structured tutor output to authenticated learners.

## Requirements

- [ ] Specify the event types, payload schema, and sequencing rules needed for tutor streaming and structured completion events.
- [ ] Implement authenticated SSE transport that can stream tutor events for a specific owner and session without leaking data across users.

## Implementation

1. Add shared event contracts and typed serializers for tutor stream events, including message, progress, control, and completion shapes as needed by AT0002.
2. Implement the backend SSE transport and endpoint wiring in the existing API structure with authenticated ownership checks tied to session state.
3. Ensure stream setup and teardown behavior is explicit so later reconnect and hardening work has a clear contract to build on.
4. Add integration tests that verify event ordering, protected access, and clean stream completion for the owner session only.

## Done When

- [ ] All requirements met
- [ ] Tutor SSE endpoints stream the documented event contract under test and reject unauthenticated or cross-user access
