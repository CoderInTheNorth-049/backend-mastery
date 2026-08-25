# Phase 00 — Foundations (~2 weeks)

**Outcome:** explain exactly what happens between typing a URL and bytes arriving at a server — and live comfortably in the terminal/Git where production actually runs.

## Beginner-friendly picks

- 🎥 [Code.org — How the Internet Works](https://www.youtube.com/@codeorg) — short animated series; watch before any reading
- 📝 [Cloudflare Learning Center](https://www.cloudflare.com/learning/) — plain-English DNS/TLS/CDN explainers
- 🧪 [learngitbranching.js.org](https://learngitbranching.js.org/) — interactive Git visualization

## Topics

| Folder | Est. | Type |
|---|---|---|
| [01-internet-protocols](01-internet-protocols/) | 3 days | concepts + coding |
| [02-http-protocol](02-http-protocol/) | 5 days | coding |
| [03-linux-git](03-linux-git/) | 2 days | hands-on lab |

## Why this matters for senior interviews

- "Walk me through what happens when you hit enter on a URL" is a *screening* question — weak answers end interviews early.
- Retry logic, timeouts, and idempotency (topic 02's assignment) are daily production decisions, not trivia.
- Terminal/Git fluency is assumed, never taught, on the job.

## Done means

- [ ] All three topic quizzes self-checked honestly
- [ ] `pnpm test:topic 00-foundations/01-internet-protocols` green
- [ ] `pnpm test:topic 00-foundations/02-http-protocol` green
- [ ] Lab checklist in 03 completed and noted in your `notes.md`
