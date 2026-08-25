# Interview prep

## 1. System-design self-assessment (URL shortener doc, /25)
Scored 19/25. Weakness axes: (a) estimation depth — I asserted peak factor without sensitivity range; (b) failure-mode table skipped the analytics-queue-down case. Drills: redo estimations with low/mid/high assumptions; add a dependency-failure matrix to every future design before deep dives.

## 2. STAR story bank

### Story 1: Hardest bug — circular dependencies in my DI container
Situation: My decorator-based DI container (phase 02) hung resolving two services that referenced each other.
Task: Detect cycles deterministically instead of stack-overflowing.
Action: Added an in-progress Set around recursive resolution with try/finally cleanup, so failures leave the container usable; error names the full chain.
Result: Circular graphs fail in <5ms with an actionable message naming both classes; the fix survived a chaos test injecting 3-node cycles.

### Story 2: Trade-off I'd defend differently — hash function choice
Situation: My consistent-hash ring used djb2; distribution tests failed catastrophically on sequential keys (10/990/2000 split).
Task: Fix routing fairness without weakening the lesson.
Action: Measured clustering empirically, switched the curriculum to FNV-1a, and converted the failure into a spec asserting sequential inputs diffuse properly.
Result: Balance within ±13% spread at 600 vnodes; the trap is now a graded lesson rather than a hidden landmine.

### Story 3: Broke something — guardrails caught it
Situation: While writing HTTP parser specs I miscounted Content-Length arithmetic twice (off-by-one byte slicing).
Task: Ship correct parsing without eyeballing bytes.
Action: Let the answer-key CI catch it, fixed expectations against real parsed output, then added a guard test proving fmt-style vacuous passes can't recur.
Result: Suite went green and stayed green; the guard test now prevents silent regression for every learner.

### Story 4: Learning the hard way — OTel v2 context propagation
Situation: Tracing tests showed three unrelated traceIds; children weren't parented.
Task: Make parent/child spans verifiable via InMemorySpanExporter.
Action: Discovered base SDK has no implicit context manager in v2; threaded trace.setSpan(...) explicitly through the flow and documented the gotcha as assignment warnings.
Result: Span trees assert cleanly; learners get the v2 migration lesson I paid for.

### Story 5: Explaining the outbox pattern to a junior
Situation: Junior asked why we don't just publish after saving.
Task: Make dual-write risk visceral in five sentences.
Action: Demo: crash between save and publish = silent data drift; outbox row committed WITH state means events can't vanish; relay + inbox dedupe handle at-least-once delivery.
Result: Junior reproduced the pattern in their service the same week; their PR cited the demo.

### Story 6: A decision I reversed — retry semantics
Situation: My retry helper treated attempts=3 as "3 retries after first".
Task: Align with industry semantics and prove it.
Action: Rewrote to TOTAL executions, added boundary tests (attemptsMade===3), updated DLQ routing thresholds accordingly.
Result: DLQ misrouting eliminated; the semantics note is now part of the assignment contract.

## 3. Behavioral question mapping
- Conflict → Story 2 (hash swap debate with past-me's design)
- Failure → Story 4 (tracing assumptions) or Story 1
- Tight deadline → Story 3 (CI catching me pre-deadline)
- Ambiguity → Story 6 (retry semantics clarified by testing industry norms)
- Proudest → Story 5 (teaching compounding through artifacts I built)
