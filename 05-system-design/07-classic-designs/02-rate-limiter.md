# Design prompt 02 — Distributed rate limiter

Design the limiter service guarding an API fleet: per-user and per-endpoint rules, sliding windows, enforced across ~200 stateless API nodes at 50k RPS aggregate.

Must cover: algorithm choice (fixed window vs sliding log vs sliding counter vs token bucket) WITH failure modes of each; central store vs replicated counters; race conditions under concurrent requests; behavior when the limiter's store is DOWN (fail-open vs fail-closed — pick & defend); response headers (Retry-After); and how limits are configured/rolled out.

Follow-ups: bursty vs smooth traffic; distributed lock necessity; multi-region limits.

Rubric threshold: **19/25**.
