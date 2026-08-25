# Topic: Streams & async iterators — handling data bigger than memory

> **Goal:** Process unbounded data (logs, uploads, exports) with constant memory. You'll build chunk-boundary-safe transforms — the code path behind every log shipper and CSV importer you'll ever own.

## Beginner-friendly picks

- 🎥 YouTube search: **“Node.js streams explained”** — pick any recent top result for the visual intro
- 📝 [dev.to/t/nodejs](https://dev.to/t/nodejs) — community articles tagged node; search “streams”

## Core concepts

| Concept | Must be able to answer | Free resources |
|---|---|---|
| Why streams exist | Load a 10GB file into a string → OOM. Stream it → constant RAM. That's the whole pitch | [Node.js — Streams learn page](https://nodejs.org/en/learn/modules/streams-in-nodejs) |
| The four types | Readable, Writable, Duplex, Transform — who consumes whom | Node docs above |
| Backpressure | Producer outruns consumer → `.write()` returns false → `drain` event; `pipeline()` manages this FOR you (why we never hand-pipe) | [Node docs — backpressure](https://nodejs.org/en/learn/modules/backpressuring-in-streams) |
| Chunk boundaries | Chunks are network packets, NOT messages. `"hello"` can arrive as `"hel"+"lo"` — every parser must buffer | your assignment teaches this viscerally |
| Object mode | Streams of JS values instead of bytes; when it helps vs hurts | Node docs |
| Async iterators | `for await (const chunk of readable)` — modern consumption; async generators as lazy pipelines | [MDN — async iteration](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols) |
| NDJSON | Newline-delimited JSON: the streaming-friendly cousin of JSON arrays; standard for logs/event feeds | [githublines/ndjson spec](https://github.com/ndjson/ndjson-spec) |

## Keep in mind

- **`pipe()` is legacy glue; `pipeline()` handles errors + cleanup** across the chain — forgetting this leaks file descriptors.
- **Encoding bugs live at boundaries**: `setEncoding` vs raw Buffers vs multibyte chars split across chunks. Note it; deep dive optional.
- **Error handling in chains**: one errored stage must destroy all others. Hand-rolled `.on('error')` everywhere is how FD leaks happen.
- **Async generators compose like Unix pipes** with zero library deps: `for await (const row of parse(csvStream))`. Senior code prefers these over `.on('data')` callback soup.
- Real-world anchors: HTTP request bodies ARE streams; Express's `req` is a Readable; phase 06's Kafka consumers iterate exactly like this.

## Self-check quiz

<details><summary>1. A Transform receives <code>'{"a":1', '}\n{"b":2}\n'</code>. What MUST your implementation do to stay correct?</summary>
Buffer partial fragments until a delimiter (newline) arrives, then emit complete units — never assume chunk edges align with record edges.
</details>

<details><summary>2. Why does writing a fast producer into a slow socket without respecting write()===false blow up memory?</summary>
Writable buffers everything in RAM awaiting drain — backpressure ignored = unbounded queue = OOM under load. pipeline/pump automate pause/resume.
</details>

<details><summary>3. When do you pick an async generator over a Transform stream?</summary>
In-process, single-consumer transformations: generators win (simpler, lazy, no event machinery). Multi-stage byte pipelines or interop with stream APIs: Transforms.
</details>

<details><summary>4. Your NDJSON endpoint crashed on line ~900k with "Invalid JSON". First debugging move?</summary>
Capture the offending LINE and neighbors (log line number + raw payload slice), not just the SyntaxError — usually a client wrote an unescaped newline mid-record. Contract fix + defensive parser.
</details>

## Assignment

[assignment.md](assignment.md) — build `stringToLines`, `parseNdjsonObjects` (with line-numbered errors), `ndjsonToObjects`, and an async-generator `batch()` helper. Chunk-splitting tests guarantee you feel the boundary problem firsthand.
