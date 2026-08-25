# Flagship 1 — Milestone 8: Security pass

> **Unlocked by:** phase 08 · **Est:** 8–12 hours

## Goal

Pass your own OWASP-style review: real HMAC signing with rotation, SSRF-proof endpoint URLs, tenant isolation proven by adversarial tests.

## Work items

1. **Payload signing (real, not stubbed):** `X-Webhook-Signature: t=<ts>,v1=<hmac>` over `${ts}.${rawBody}`; tolerance window ±5min; old-secret honored during rotation overlap
2. **Rotation flow:** new secret_version → dual-verify during grace → old revoked; customer docs describe the dance
3. **SSRF defenses on endpoint URLs:** scheme allowlist (https only), DNS-resolve-and-pin against private ranges (169.254/10/172.16/192.168/::1…), redirect-following disabled, response headers never trusted for URL
4. **Tenant isolation tests:** cross-tenant access attempts on every admin route (expect 404/403 indistinguishably); signing uses the CALLING tenant's secret version only
5. **Dependency + config hygiene:** `pnpm audit` gate in CI, no secrets in logs (redact paths from phase 08), env-only configuration

## Accept

- [ ] Signature verification test vectors pass incl. timestamp-skew rejection and rotation-overlap dual acceptance
- [ ] SSRF suite: private-range URLs rejected at creation AND at delivery time (DNS rebinding attempt documented)
- [ ] Cross-tenant probe suite green on every route
- [ ] `pnpm audit --prod` clean or findings risk-accepted in writing

## Resume line fed
*"HMAC-signed deliveries with zero-downtime secret rotation; SSRF-hardened endpoint ingestion validated by adversarial test suites."*
