# Topic: The five classic designs — your interview reps

> **Goal:** Produce five complete design docs on one shared template, with a machine-checked architecture diagram in each. This is the phase's center of gravity — treat each doc as a timed interview rep, then refine.

## Beginner-friendly picks

- 🎥 Watch ONE full design per prompt type (ByteByteGo/GauravSen) AFTER your own 40-min attempt — never before
- 📝 Keep [Latency numbers](https://gist.github.com/jboner/2841832) printed next to you during attempts

## How to run each design

1. **Read the prompt** (`01`–`05`). Requirements are deliberately incomplete — stating YOUR assumptions with numbers is graded content.
2. **Set 40 minutes on a timer.** Fill [template.md](template.md) top-to-bottom without editing earlier sections.
3. **Draw the diagram** as mermaid; validate it: `pnpm test:topic 05-system-design/07-classic-designs`.
4. **Self-score against that prompt's rubric.** Below threshold → one revision pass max, then move on.
5. Weekly: re-do ONE prompt from memory; compare against your previous attempt.

## The five prompts

| # | Prompt | Core tensions |
|---|---|---|
| [01](01-url-shortener.md) | URL shortener | key generation at scale, read-heavy caching, analytics without hot-path writes |
| [02](02-rate-limiter.md) | Distributed rate limiter | per-window accounting across fleet, race conditions, fail-open vs fail-closed |
| [03](03-news-feed.md) | News feed | fan-out on write vs read, celebrity rows, ordering guarantees |
| [04](04-chat.md) | Chat (1:1 + groups) | delivery guarantees, presence, group fan-out, reconnect replay |
| [05](05-ride-hailing.md) | Ride hailing | geo-indexing, matching under contention, live location streams |

## Diagram-as-code

Every doc includes its main architecture diagram as a mermaid `flowchart`. The validator you'll implement in [src/mermaid.ts](src/mermaid.ts) checks structure (header, node/edge syntax, balanced labels) so broken diagrams fail CI instead of rotting silently in READMEs — a real practice for docs-as-code teams.

## Anchor free resources per prompt

- URL shortener: [Primer — design URL shortener](https://github.com/donnemartin/system-design-primer#design-a-url-shortener-like-tinyurl)
- Rate limiter: [Stripe rate limiting article](https://stripe.com/blog/rate-limiters) · [karanpratapsingh — rate limiter](https://github.com/karanpratapsingh/system-design#rate-limiter)
- News feed: [Primer — Facebook newsfeed](https://github.com/donnemartin/system-design-primer#design-facebook-newsfeed)
- Chat: [Primer — WhatsApp](https://github.com/karanpratapsingh/system-design#whatsapp)
- Ride hailing: [Primer — Uber](https://github.com/karanpratapsingh/system-design#uber)

## Done means

- [ ] Five docs committed, each self-scored ≥ its rubric threshold
- [ ] All diagrams pass `validateMermaid`
- [ ] One prompt redone from memory with measurable improvement
- [ ] You can defend any doc's shard keys, caches, and consistency choices for 10 minutes straight
