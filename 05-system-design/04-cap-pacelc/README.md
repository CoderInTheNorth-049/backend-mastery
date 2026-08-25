# Topic: CAP & PACELC — choosing your inconsistencies deliberately

> **Goal:** Retire the cargo-cult version of CAP ("pick 2 of 3") and replace it with the decision framework senior engineers actually use: what does the system do DURING a partition, and — just as important — what does it trade when there isn't one?

## Beginner-friendly picks

- 🎥 YouTube search: **“CAP theorem explained”** + **“PACELC”** — short animated primers
- 📝 [Jepsen — consistency models](https://jepsen.io/consistency) — bookmark; you'll return per scenario

## Core concepts

| Concept | Must be able to answer | Free resources |
|---|---|---|
| CAP, precisely | C = linearizability, A = every request gets a response, P = the network CAN partition. Partition-tolerance isn't optional — partitions are scheduled by physics | [Brewer's original keynote notes](https://www.infoq.com/articles/cap-twelve-years-later-ericsbrewer/) (free article) |
| The honest reading | During a partition you choose: reject requests (CP) or risk staleness/conflicts (AP). No partition? You're trading LATENCY vs consistency instead → PACELC | [PACELC explainer](https://martin.kleppmann.com/2015/10/06/cap-twelve-years-later.html) context in Kleppmann's post |
| Consistency classes | linearizable > sequential > causal > eventual — with client-visible examples of each | [Jepsen — consistency models](https://jepsen.io/consistency) (canonical, free) |
| Quorum math | N replicas, R read + W write: R+W>N ⇒ overlapping sets; R=W=(N+1)/2 classic; tunable per-operation | [Dynamo paper concepts](https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf) (free PDF) |
| Real systems mapped | Postgres primary (CP-ish writes), Cassandra/Dynamo (tunable AP), ZooKeeper/etcd (CP), caches (AP/eventual by nature) | Jepsen analyses per system |
| What CAP does NOT say | It says nothing about latency, nothing about partitions not happening, and CA systems don't exist on real networks | Brewer article above |

## Keep in mind

- **"CA" is not an option.** Claiming it just means you haven't decided what happens during the inevitable partition.
- **Eventual consistency is a UX contract**: "your dashboard may lag up to Xs." If nobody owns that sentence for the product, you're not eventual-consistent — you're accidentally-inconsistent.
- **Quorums buy consistency with latency.** R=1,W=1 on N=5 is fast and forked; R=3,W=3 overlaps but doubles write latency. Tune PER OPERATION (reads loose, money strict).
- **Partitions include GC pauses and clock jumps** from the app's perspective — anything that makes a node unable to distinguish "slow" from "dead."
- Read-replica lag IS an AP choice made quietly by default in most "boring Postgres" stacks.

## Self-check quiz

<details><summary>1. A service claims "CA — we run a single Postgres primary." Attack this claim.</summary>
Single primary + async replicas: during primary-partition (network blip), either you halt writes (chose C over A under P) or promote/split-brain (A over C). Also replica reads are eventually consistent. There is no CA on a network.</details>

<details><summary>2. N=5, want writes durable against 2-node failure AND reads never seeing conflicts. R/W?</summary>
W=3 (survives 2 failures), R=3 (3+3>5 guarantees overlap with latest write quorum). Latency cost: majority waits both directions.</details>

<details><summary>3. Where does a Redis cache sit on PACELC and why is that FINE?</summary>
PA/EL-ish: during partitions serve possibly-stale hits (availability), normally skip consensus for lowest latency. Wrongness expires with TTL — bounded staleness as a feature.</details>

<details><summary>4. Product says "chat messages must NEVER be visible out of order." Which class, whose problem?</summary>
Causal (at minimum) consistency per conversation: replies visible after their parents. Implement via per-conversation sequence vectors/session ordering — it's an application-level guarantee layered on whatever store.</details>

## Assignment — written deliverable `decisions.md`

Six scenarios; for each: name the regime (CP/AP under partition; EL/EC otherwise), pick concrete tech posture, defend in ≤3 sentences (/18 total):

1. Banking transfer API (amounts move between accounts)
2. Social "like" counters
3. Shopping cart during Black Friday regional outage
4. Feature-flag service powering kill-switches fleet-wide
5. Chat message ordering within one conversation
6. Session store for logged-in users

Plus quorum drills: for N=3 and N=7, list ALL (R,W) pairs that prevent reading uncommitted-to-majority values, and mark which pair you'd ship for a product page counter vs an order ledger — say why the two answers differ.

### Rubric

| Criterion | Points |
|---|---|
| Every scenario names BOTH partition-side AND latency-side choices | /6 |
| Tech postures are named systems w/ realistic configs, not vibes | /4 |
| Quorum tables mathematically correct (all pairs listed) | /4 |
| Counter-vs-ledger answer articulates per-operation tuning | /4 |
