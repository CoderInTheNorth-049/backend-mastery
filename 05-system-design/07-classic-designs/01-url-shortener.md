# Design prompt 01 — URL shortener

Design TinyURL: `POST /links` returns a short code; `GET /:code` 302-redirects.

**Given numbers:** 100M new links/month; read:write ≈ 100:1; redirect p99 < 50ms globally; links live forever by default.

State your assumptions for: code alphabet & length (collision math!), key generation strategy, storage schema, cache layer + TTL policy, analytics capture without slowing redirects, and hot-link handling.

Follow-ups to answer inside the doc: custom aliases? expiry? same-URL dedupe? abuse (malware links)?

Rubric threshold: **19/25** on the shared template rubric. Extra weight this prompt: collision probability shown with actual math (+implicit in estimates criterion).
