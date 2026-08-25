# Review — pr-3

## Summary
The flow shape (request → token → confirm) is right, but as written I can't approve: several [security]-critical gaps plus an import bug that fails at runtime.

## Findings

### 1. [security] randomUUID tokens are fine entropy-wise but the node:crypto import is broken
`import { crypto } from "node:crypto"` — node:crypto has no named `crypto` export; runtime crash on first use. Use `randomUUID` directly, or better `randomBytes(32).toString("base64url")` for opaque tokens.

### 2. [security] in-memory tokens Map breaks across instances and restarts
Multi-instance fleet ⇒ token created on pod A unusable on pod B; deploy wipes outstanding reset requests. Persist (DB/Redis with TTL).

### 3. [security] requestReset leaks account existence
Different behavior/response timing for known vs unknown emails enables enumeration. Always return the same generic response; send mail only if the account exists.

### 4. [security] tokens are reusable until expiry
ConfirmReset never deletes the entry ⇒ same link resets repeatedly within 24h and there's no audit trail. Delete-on-use + log the event; rate-limit requestReset per email+IP.

### 5. [tests] none of these failure modes are covered
Add specs: expired token rejected, token invalidated after successful reset, identical response for known/unknown emails.

(nit) Good instinct separating requestReset/confirmReset responsibilities.
