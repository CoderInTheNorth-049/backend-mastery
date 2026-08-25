# Assignment — mermaid validator (diagrams that can fail CI)

**Estimated:** 3 hours · **File:** [src/mermaid.ts](src/mermaid.ts) · **Graded by:** [mermaid.spec.ts](mermaid.spec.ts)

Your five design docs embed mermaid diagrams. Broken diagram syntax currently rots silently — you'll fix that by writing a structural validator for the SUBSET of flowchart syntax this repo uses.

## Grammar to support

```
<line>    := header | comment | blank | nodeDecl | edge
header    : "graph TD" | "graph LR" | "flowchart TD" | "flowchart LR"
comment   : "%%" <anything>
node      : ID                          # bare declaration
          | ID "[" LABEL "]"            # labeled node
edge      : node ARROW node
          | node ARROW "|" LABEL "|" node
ARROW     : "-->" | "---" | "-.->"
ID        : [A-Za-z0-9_]+
# note: BOTH endpoints of an edge may carry their own [labels]
```

Rules:

- Exactly ONE header, and it must be the first non-blank line.
- Edges implicitly declare nodes (no separate decl needed) — real mermaid behaves this way.
- Unbalanced `[` or missing `]` on a node/label line → error.
- Any non-empty non-comment line that matches nothing above → error `unrecognized statement`.
- Multiple headers → error.
- Empty source / whitespace-only → single file-level error (`line: 0`, message matching `/empty/i`).
- CRLF tolerated; trailing whitespace ignored.

## Output

All errors collected (not fail-fast): `{ ok:false, errors:[{line, message}] }` where messages include the phrase `line N` for per-line issues (spec regexes check `/line 3/` style) — e.g. `` `line 3: unrecognized statement` ``.

## Hints

<details><summary>Arrow splitting</summary>
Try longest-first: /\|[^|]*\|/? then arrows in order ["--\u003e","-.--\u003e","---"]. Careful: "-.\u003e" contains "---"? It doesn't — but match "--\u003e" before "---" anyway since "a ---\u003e b" is invalid here.
</details>

<details><summary>Label balance</summary>
For a candidate node/edge line: count '[' vs ']' occurrences must satisfy open==close AND at least the pattern requires one bracket pair when a label exists. Simplest robust rule: if the trimmed line contains '[' it must contain ']' after it.
</details>

## Acceptance criteria

- [ ] Spec green — includes a valid diagram copied from THIS repo's template
- [ ] No regex without anchors doing full-line matches (be precise; diagrams are code)

## Stretch

- Support `subgraph name … end` blocks with nesting-depth validation
- Detect orphan nodes (declared but zero edges) as warnings array alongside errors
