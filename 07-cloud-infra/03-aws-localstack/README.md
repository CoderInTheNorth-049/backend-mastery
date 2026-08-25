# Topic: AWS via SDK — S3/SQS patterns, tested without the cloud

> **Goal:** Write AWS client code in the modern v3 command style, and test it COMPLETELY offline with `aws-sdk-client-mock` — proving every input you send and every failure you translate. LocalStack integration becomes an optional stretch, not a grading dependency.

## Beginner-friendly picks

- 📝 [aws-sdk-client-mock docs](https://aws-sdk-client-mock.readthedocs.io/) — the exact mocking patterns your spec uses
- 🎥 YouTube search: **“LocalStack AWS local development”** — see the emulator story end-to-end

## Core concepts

| Concept | Must be able to answer | Free resources |
|---|---|---|
| SDK v3 command pattern | `client.send(new GetObjectCommand({...}))` — commands are plain data ⇒ mockable at the boundary | [AWS SDK v3 guide](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/welcome.html) |
| IAM least privilege | policies grant ACTIONS on ARNs; wildcards are findings waiting to happen | [AWS — IAM best practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html) |
| Regions & endpoints | data residency + latency; LocalStack overrides endpoint for local emulation | [LocalStack docs](https://docs.localstack.cloud/) |
| S3 basics | PutObject/GetObject/DeleteObject; NoSuchKey error shape; presigned URL concept | [S3 API reference](https://docs.aws.amazon.com/AmazonS3/latest/API/API_Operations.html) |
| SQS send semantics | SendMessage JSON body; at-least-once to consumers (phase 06 lives here); FIFO queues & dedupe ids | [SQS developer guide](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/welcome.html) |
| Error translation | AWS errors carry `name` (`NoSuchKey`, `QueueDoesNotExist`) — normalize into YOUR ApiError-style taxonomy | phase 02 pattern reuse |

## Keep in mind

- **Mock the CLIENT boundary, not internals**: `aws-sdk-client-mock` replaces `client.send` per-command — inputs become assertions, failures become scripted.
- **Streams vs strings**: GetObject body is a readable stream — wrap transforms (stream-to-string) so callers get primitives.
- **Buckets are global-namespace, keys are your schema**: versioned key prefixes (`v1|tenant|doc`) beat bucket sprawl.
- **SQS message bodies are STRINGS** — JSON.stringify is your contract; consumers parse + validate (Zod) like any wire format.
- **Credentials never in code** — default provider chains through env/profiles/roles. Tests inject mock clients anyway.

## Self-check quiz

<details><summary>1. Why does <code>GetObject</code> on a missing key throw instead of returning null?</summary>
HTTP 404 → SDK raises NoSuchKey. Absence-as-error means callers MUST catch-and-translate — your wrapper turning it into null IS the product surface.</details>

<details><summary>2. What does least privilege look like for a doc-store service?</summary>
s3:GetObject/PutObject/DeleteObject on <code>arn:aws:s3:::bucket/*</code> ONLY — no ListAll, no other buckets, no s3:* . Scope per env role.</details>

<details><summary>3. Two SQS sends with identical MessageDeduplicationId within 5 min on a FIFO queue?</summary>
Second is accepted but NOT enqueued (dedupe window). That's a feature for idempotent producers — and a footgun if ids collide accidentally.</details>

<details><summary>4. Why assert the COMMAND INPUTS in tests rather than just mocking responses?</summary>
Inputs are your contract with AWS (bucket/key/body shape); response handling is trivial passthrough most times. Input drift = production incident.</details>

## Assignment

[assignment.md](assignment.md) — implement `DocStore` (S3 put/get/delete with NoSuchKey→null translation) and `EventPublisher` (SQS sender with JSON envelope), graded entirely through aws-sdk-client-mock.
