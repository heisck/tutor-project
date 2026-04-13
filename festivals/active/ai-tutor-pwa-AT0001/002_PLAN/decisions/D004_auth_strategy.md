# D004: Auth Strategy

## Decision
Use database-backed sessions with httpOnly secure cookies and OAuth support, with all protected routes enforcing authenticated ownership-aware access.

## Why
The overview and rules require secure session management, cookie-based auth, and strong ownership checks. Database-backed sessions make revocation, expiry, and auditability easier than purely stateless tokens for this product.

## Benefits
- Compatible with secure cookie-based browser flows
- Easier session invalidation and expiry control
- Strong base for per-user ownership checks across documents, sessions, and progress
- Supports both email auth and Google OAuth

## Tradeoffs
- Session storage adds database reads and writes
- Cookie auth requires CSRF-aware design for state-changing routes

## Result
Foundation tasks must ship auth before upload and document endpoints, and no protected endpoint may proceed without session and ownership validation.
