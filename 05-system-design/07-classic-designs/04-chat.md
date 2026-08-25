# Design prompt 04 — Chat (1:1 + group)

Design WhatsApp-lite for 200M DAU: 1:1 + groups ≤ 512, delivery receipts, online presence, history sync across devices.

Must cover: connection layer (protocol choice + LB strategy for persistent sockets), message ID/ordering scheme per conversation, delivery states (sent/delivered/read) as data model, offline storage + reconnect replay, group fan-out (≤512 amplification), presence TTL design, media messages via object storage presigning.

Follow-ups: end-to-end encryption impact on server-side features; multi-device ordering; spam moderation surface.

Rubric threshold: **19/25**.
