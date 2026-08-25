# Topic: JWT auth — sign and verify from primitives

> **Goal:** Own the full mental model of token auth by implementing HS256 with raw `node:crypto`. After this, `jsonwebtoken` becomes a convenience you *choose*, not a black box you *trust*.

## Beginner-friendly picks

- 🧪 [jwt.io debugger](https://jwt.io/#debugger-io) — paste tokens from YOUR assignment and watch claims decode
- 🎥 YouTube search: **“JWT explained”** — Java Brains / Okta Dev have great conceptual videos

## Core concepts

| Concept | Must be able to answer | Free resources |
|---|---|---|
| Token anatomy | header.payload.signature; base64url (why not base64); claims vs assertions | [RFC 7519 §1-4](https://datatracker.ietf.org/doc/html/rfc7519) · [jwt.io intro](https://www.jwt.io/introduction) |
| HS256 mechanics | HMAC-SHA256 over `headerB64.payloadB64`; symmetric secret; why payload is readable-not-encrypted | RFC 7515 (JWS) skim + your assignment |
| Standard claims | exp/nbf/iat semantics (NumericDate SECONDS), iss/sub/aud; clock skew tolerance in practice | RFC 7519 §4.1 |
| Validation order | structure → signature → temporal → audience/issuer. Signature BEFORE trust decisions, always | assignment contract |
| Attack surface | alg=none confusion, HS↔RS key-confusion, weak-secret brute force, tokens-can't-be-revoked | [RFC 8725 — JWT BCP](https://datatracker.ietf.org/doc/html/rfc8725) (short & gold) |
| Sessions vs tokens | stateless scaling vs revocation lists/short-TTL+refresh trade-offs | phase 05 revisits at scale |

## Keep in mind

- **Payloads are signed, not sealed** — anyone can read them. Never put secrets/PII in a JWT body.
- **`alg` comes from the TOKEN = attacker-controlled.** Pin expected algorithm server-side (RFC 8725's #1 rule); your spec tests exactly this.
- **Timing-safe comparison or nothing**: naive string compare leaks signature bytes via timing. `crypto.timingSafeEqual` exists for a reason.
- **exp uses seconds**, JS uses milliseconds. Off-by-1000 bugs ship to prod weekly somewhere.
- Revocation reality: short TTLs + refresh rotation beat blacklist complexity until scale forces otherwise.

## Self-check quiz

<details><summary>1. Attacker sends header {"alg":"none"} + no signature. Naive verifiers accept. Which check kills it?</summary>
Server pins allowed alg(s) before verifying: reject any token whose header.alg ∉ {configured set}. Never let token metadata choose verification strategy.</details>

<details><summary>2. Why must signature comparison be constant-time?</summary>
String compares early-exit on first mismatch byte → response-time differences leak how many leading sig chars were right → offline forgery assistance. timingSafeEqual removes the signal.</details>

<details><summary>3. User logs out. Token valid 15 more minutes. Options?</summary>
Short TTL (minutes) + silent refresh rotation; or jti-based denylist cache keyed to expiry; or session-style introspection (trade statelessness). Each has costs — name them.</details>

<details><summary>4. What does nbf protect that exp doesn't?</summary>
Premature use: tokens issued-for-later (scheduled access, license windows). Verify order still signature-first.</details>

## Assignment

[assignment.md](assignment.md) — implement base64url codecs, `signJwt`, and a discriminated-union `verifyJwt` (reusing phase 01 patterns), including the alg-none rejection test. Pure crypto, zero dependencies beyond Node built-ins.
