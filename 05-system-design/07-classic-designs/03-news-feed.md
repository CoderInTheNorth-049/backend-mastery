# Design prompt 03 — News feed

Design Instagram-style home feeds for 500M DAU: 300 follows average (celebrities: 100M+), feed opens 10×/user/day, posts are image+text.

Must cover: fan-out-on-write vs fan-out-on-read vs hybrid — with the celebrity-row problem handled explicitly; feed store schema & pagination model; ranking service placement (sync in path vs async precompute); media pipeline touchpoints (CDN); consistency users actually notice (your own post visible? followee ordering?).

Follow-ups: unfollow semantics on a pre-built feed; feed ads injection point; cold-start user.

Rubric threshold: **19/25**.
