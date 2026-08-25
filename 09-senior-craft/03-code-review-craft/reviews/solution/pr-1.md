# Review — pr-1

## Summary
Nice separation of the retry loop and good instinct skipping retries for validation errors. One [correctness] blocker though: charging is a non-idempotent operation and this helper can double-charge on timeout-after-success.

## Findings

### 1. [correctness] chargeWithRetry can duplicate charges when the API timed out AFTER succeeding
A response timeout doesn't mean the charge failed — the provider may have captured funds. Retrying turns a slow success into two captures.
Suggested fix: require an idempotency key per logical charge (generated once, reused across attempts) or only retry errors provably received BEFORE processing.

(severity: blocking)

### 2. [concurrency] MAX_RETRIES = 5 means five total executions, not five retries
`for attempt <= MAX_RETRIES` executes the call up to 5 times. If the intent was "original + 4 retries", say so explicitly — off-by-one semantics on payment paths get audited the hard way. Also consider jitter on `sleep(100 * attempt)` to avoid synchronized client storms.

(severity: blocking)

### 3. [tests] no tests in the diff
The error-classification branch (`isValidationError` → rethrow) and the exhaustion path are exactly the branches that need specs. Please add unit tests with a fake chargeApi.

(severity: blocking)

### 4. [nit]
Nice touch rethrowing validation errors immediately — that classification deserves its own exported predicate + test now that it's load-bearing.
