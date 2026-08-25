# Assignment — logger factory

## The problem you're solving
At 3 AM the pager fires and you grep logs for one user's request across four services. String-concatenated logs make that impossible; structured JSON with request-id correlation makes it thirty seconds. But structured logs leak secrets unless redaction happens BEFORE serialization. You'll build a logger factory that does all of it, verified by parsing your own output.

## Your tasks
Implement in [src/logger.ts](src/logger.ts):

1. **`createLogger(options, destination?)`** wrapping pino:
   - JSON lines into the provided destination stream (tests capture; prod pipes)
   - `level` defaults "info"; `service` + `base` merged into every line's bindings
   - `redactPaths` configured with censor `[Redacted]` — paths like `password`, `req.headers.authorization`
2. **`withRequest(logger, requestId)`** → child logger carrying requestId on every line WITHOUT mutating the parent.

## Definition of done
- [ ] Spec green: output parses as JSON per line; raw secrets never appear; `[Redacted]` appears instead; non-sensitive fields survive
- [ ] Level policy proven: debug suppressed at info, visible at debug
- [ ] Parent logger untouched by child bindings

## Hints (open only when stuck)

<details><summary>Redact config</summary>
pino option <code>redact: { paths: [...], censor: "[Redacted]" }</code> — only set it when paths are non-empty.</details>

## Going further (optional)
Sampling policy (keep 10% of debug in prod); auto version/env base from package.json.

