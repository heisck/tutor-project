---
fest_type: task
fest_id: 003_FOUNDATION-S01-T02
fest_name: auth_and_sessions
fest_parent: 003_FOUNDATION-S01
fest_order: 2
fest_status: pending
fest_tracking: true
---

# Task: Auth and Sessions

## Objective

Implement secure authentication and session management so users can sign up, sign in, sign out, and access protected routes with database-backed sessions.

## Scope

This task includes:
- signup and signin flows
- Google OAuth integration
- secure session creation and lookup
- signout
- protected route/session middleware
- ownership-aware auth foundation for later modules

This task does not include:
- advanced admin workflows
- password reset flow unless trivially scaffolded
- profile preferences beyond what auth requires

## Implementation Requirements

- Implement signup endpoint and signin endpoint
- Implement Google OAuth provider integration
- Store sessions in the database
- Send the session token via httpOnly secure cookie
- Implement signout endpoint
- Implement session lookup endpoint
- Add auth middleware or helper for protected endpoints
- Ensure session expiry is enforced
- Ensure auth endpoints are rate limited
- Ensure no tokens are stored in localStorage or sessionStorage

## Acceptance Criteria

- A user can sign up successfully
- A user can sign in successfully
- A user can sign out successfully
- Session lookup returns the authenticated user when valid
- Protected endpoints reject unauthenticated access
- Session cookie is httpOnly and secure in the appropriate environment
- Google OAuth flow is wired and returns a valid authenticated session

## Required Tests

- Signup success integration test
- Signin success integration test
- Invalid signin rejection test
- Signout integration test
- Session lookup integration test
- Protected route unauthenticated rejection test
- Rate limit behavior test for auth endpoints

## Notes

Security rules are mandatory:
- database-backed sessions
- httpOnly cookie
- ownership checks will depend on this task
- auth must be production-oriented, not demo-only
