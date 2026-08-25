# Assignment — HS256 JWTs from raw crypto

## The problem you're solving
Every auth library trusts you to know what a JWT IS. Attackers bet you don't: alg-confusion, weak secrets, clock-skew bugs. You'll sign and verify tokens with raw node:crypto — building the mental model that makes jsonwebtoken a convenience you CHOOSE.

## Your tasks
In [src/jwt.ts](src/jwt.ts):
1. Base64url encode/decode helpers (no `+`, `/`, or `=` ever).
2. `signJwt(payload, secret, {expiresInSec?, issuedAtSec?})`: header `{alg:"HS256",typ:"JWT"}` always sets `iat`, adds `exp = iat + expiresInSec` when requested; signature = HMAC-SHA256 over `header.payload`.
3. `verifyJwt(token, secret, nowSec?)` returning a RESULT OBJECT (never throwing for attacker input), checking IN THIS ORDER: three segments → header parses & alg pinned to HS256 (kills alg=none attacks) → signature via timingSafeEqual (length-guarded) → payload parses → `exp` inclusive-reject → `nbf` future-reject → success payload.

## Definition of done
- [ ] Spec green incl. tampered-payload, wrong-secret, expired-boundary, and alg-none rejection cases
- [ ] Invalid tokens NEVER throw — every failure is a typed result

## Hints

<details><summary>Hint 1 — base64url</summary>
Buffer.from(x).toString("base64url") exists in modern Node — but implement via replace if you want the full experience: base64 → replace +→-, /→_, strip trailing =.</details>

<details><summary>Hint 2 — timingSafeEqual</summary>
It THROWS on length mismatch: guard <code>sigA.length === sigB.length</code> before calling, return false early otherwise.</details>

<details><summary>Hint 3 — structure</summary>
const parts = token.split("."); parts.length !== 3 → malformed. Then JSON.parse each of parts[0..1] inside try/catch.</details>

## Acceptance criteria

- [ ] Spec green
- [ ] No throw-paths for invalid tokens (all results typed)
- [ ] alg-none token crafted in tests rejected as wrong-alg even with valid-looking empty signature

## Stretch

- Add RS256 verify path using a generated keypair (`crypto.generateKeyPairSync`) — feel the asymmetry difference
- Support `aud`/`iss` checks with expected-value params
- JTI denylist helper: `verifyJwt(token, secret, {denylist:Set<string>})`
