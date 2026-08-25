# Assignment — NDJSON pipeline & batching, chunk-safe

## The problem you're solving
Logs, uploads, and event feeds arrive as CHUNKS that never respect message boundaries — `"{"a":1` might end one network packet and `"}"` starts the next. Naive parsers crash on exactly this. Today you build a Newline-Delimited-JSON pipeline that survives arbitrary chunk splits, plus the batching helper every consumer needs downstream.

## Your tasks
1. [src/ndjson.ts](src/ndjson.ts):
   - `stringToLines()` — a Transform buffering chunks and emitting complete lines (handles `\n`, `\r\n`, and final unterminated fragments).
   - `parseNdjsonObjects()` — parse each line to JS values, skip empty/whitespace lines (they still COUNT toward numbering), and destroy the stream with “Invalid NDJSON on line N” on bad JSON.
   - `ndjsonToObjects(source)` — convenience: pipeline the two transforms and collect objects.
2. [src/batch.ts](src/batch.ts): async-generator `batch(source, size)` grouping items into arrays of up to `size`, flushing the remainder, yielding nothing for empty input.
3. Specs feed adversarial chunk boundaries deliberately — including splitting records mid-word.

## Definition of done
- [ ] All specs green incl. the 10k-record stress case
- [ ] Boundary-split inputs produce byte-identical output to whole-chunk inputs

## Hints

<details><summary>Hint 1 — buffering</summary>
Keep a string buffer field. On each chunk: <code>buffer += chunk</code>, then loop splitting on /\r?\n/ while a delimiter exists. Emit everything except the trailing partial fragment. In _flush(), emit remaining buffer if trim() non-empty.
</details>

<details><summary>Hint 2 — shared line numbering</summary>
Numbering counts LINES IN THE ORIGINAL INPUT, so parseNdjsonObjects can't count alone — it receives post-split lines but empty lines were already dropped? No: keep empties flowing INTO this transform and drop them here after incrementing the counter. That's why both transforms exist separately.
</details>

<details><summary>Hint 3 — batch()</summary>
Accumulator array + inner for-await; when length===size yield & reset. After loop ends, flush remainder if non-empty. RangeError check happens lazily inside generator body.
</details>

## Acceptance criteria

- [ ] Spec green (`pnpm test:topic 01-typescript-node/03-streams-iterators`)
- [ ] The boundary-split test passes without "cheating" (e.g., no concatenating ALL input before parsing — that defeats streaming and fails the 10k-line memory sanity test's spirit)

## Stretch

- Add `stringifyNdjson(): Transform` (objects → wire format) and round-trip your own output
- Propagate byte offsets with each object (map-reduce style debugging info)
- Rewrite ndjsonToObjects as pure async generators; compare LOC and readability
