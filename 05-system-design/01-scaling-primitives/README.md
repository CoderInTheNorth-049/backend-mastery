# Topic: Scaling primitives — the vocabulary of load

> **Goal:** Estimate before you architect. Every design interview starts with "how big is this, really?" — and every incident review ends with "which primitive failed?"

## Beginner-friendly picks

- 🎥 ByteByteGo shorts on load balancers & vertical/horizontal scaling
- 📝 [System Design Primer — back-of-envelope section](https://github.com/donnemartin/system-design-primer#back-of-envelope-estimation) — worked number examples

## Core concepts

| Concept | Must be able to answer | Free resources |
|---|---|---|
| Vertical vs horizontal | when bigger-box wins (simplicity, licensing) and where it hard-stops | [System Design Primer — scaling](https://github.com/donnemartin/system-design-primer#horizontal-vs-vertical-scaling) |
| Load balancing layers | L4 vs L7; round-robin vs least-connections vs consistent-hash routing; why WebSockets break naive RR | [karanpratapsingh — LB](https://github.com/karanpratapsingh/system-design#load-balancing) |
| Statelessness | what "stateless service" actually means (state lives in DB/Redis/client); sticky sessions as debt | [Primer — application layer](https://github.com/donnemartin/system-design-primer#application-layer) |
| Health checks | liveness vs readiness; why flapping checks cause thundering restarts | [K8s docs concepts](https://kubernetes.io/docs/concepts/workloads/pods/lifecycle/) (read even pre-K8s) |
| Back-of-envelope math | DAU→RPS, read/write ratios, storage/day, the ×2–3 peak factor; memorized latency numbers | [Primer — estimation](https://github.com/donnemartin/system-design-primer#back-of-envelope-estimation) · [latency numbers](https://gist.github.com/jboner/2841832) |
| Autoscaling signals | CPU vs queue-depth vs RPS-per-pod; scale-out lag and why you keep headroom | [AWS autoscaling notes](https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-scale-based-on-demand.html) |

## Keep in mind

- **Read:write ratio drives everything** — caching strategy, replica counts, shard choice. Ask it FIRST.
- **Peak ≠ average.** Design for peak × growth horizon; average numbers are how birthday-death incidents happen.
- **Least-connections beats round-robin whenever request costs vary.** RR + heterogeneous fleet = systematic hot spots.
- **Statelessness is a spectrum**: config, caches-in-proc, and file uploads are all sneaky state. Hunt them during migration planning, not after cutover.
- **Health checks that depend on dependencies** turn one DB hiccup into fleet-wide restart storm. Liveness ≠ readiness.

## Self-check quiz

<details><summary>1. 10M DAU image host, 5 uploads/user/day @2MB, reads outnumber writes 20:1. Daily storage & write QPS?</summary>
50M uploads/day = ~580/s avg → ×2.5 peak ≈ 1.5k writes/s; storage 100GB/day ≈ 36TB/yr pre-replication. Reads: 20×580≈11.6k/s avg, ~29k peak. Show the division by 86,400 explicitly.</details>

<details><summary>2. Why do long-lived WebSocket pools break round-robin load balancers?</summary>
RR balances CONNECTIONS not ongoing message load: early connections pin to first nodes while later nodes idle; reconnect storms re-amplify imbalance. Use least-connections or consistent-hash on connection id.</details>

<details><summary>3. Your LB health check hits <code>/healthz</code> which pings Postgres. DB blips 30s. What happens?</summary>
Every instance flaps unhealthy → pool drained → restart stampede exactly when DB recovers. Split liveness (process alive) from readiness (deps OK), and only route on readiness.</details>

<details><summary>4. What's the actual difference between L4 and L7 balancing beyond "layer"?</summary>
L4 routes on IP/port tuples — cheaper, no payload visibility, connection-bound. L7 parses HTTP (paths, headers, cookies) enabling content routing, header mods, per-route pools — at higher cost.</details>

## Assignment — written deliverable `scaling-notes.md`

Create the file in this folder answering with SHOWN WORK (/15):

1. **Estimate** (/5): podcast platform, 3M DAU, each streams 40min/day @128kbps, uploads 0.5% of users @50MB. Compute: daily egress GB, peak stream RPS (peak=2.5×avg), daily upload storage, and object count/month for uploads.
2. **LB choices** (/4): pick+justify algorithms for (a) mixed-cost REST fleet, (b) WebSocket gateway pool, (c) cache-tier lookups where key→node stability matters.
3. **Statelessness migration** (/6): sticky-session PHP-ish app (sessions in local /tmp, uploads to local disk). Produce ordered zero-downtime migration plan: where state goes first, how you verify no session loss, rollback story.

Self-score with rubric below; commit.

### Rubric

| Criterion | Points |
|---|---|
| Estimates show unit conversions (DAU→per-second) explicitly | /2 |
| Peak factor applied & stated as assumption | /1 |
| LB picks match failure modes discussed in README quiz | /4 |
| Migration orders state-extraction BEFORE session-store swap | /3 |
| Rollback story reverses steps without data loss window | /3 |
