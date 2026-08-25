# Flagship 1 — Milestone 7: AWS mode via LocalStack

> **Unlocked by:** phase 07 · **Est:** 10–14 hours
> Adds the "runs on real cloud primitives" dimension to the webhook platform: SQS/SNS/Lambda-shaped infrastructure, driven by code you can still test offline (aws-sdk-client-mock, phase 07 topic 03).

## What changes architecturally

```
BEFORE (M5):  delivery workers consume BullMQ jobs directly
AFTER  (M7):  ingest → SNS topic ──▶ SQS queue(s) ──▶ delivery workers
                        └──▶ dead-letter SQS ◀── redrive API reads from here
              payloads archived to S3 (audit + replay source)
```

- **SQS replaces BullMQ** behind your existing `ResilientQueue`-style interface — swap the adapter, keep the domain.
- **SNS fan-out** models multi-consumer futures (billing taps, audit mirrors) without touching ingest code.
- **S3** stores original webhook bodies: replay = re-enqueue from archive; retention policy documented.

## Compose profile

```yaml
# docker-compose.aws.yml — profile "aws"
services:
  localstack:
    image: localstack/localstack
    ports: ["4566:4566"]
    environment: { SERVICES: "sqs,sns,s3" }
    volumes: ["./scripts/init-aws.sh:/etc/localstack/init/ready.d/init-aws.sh"]
```

`init-aws.sh` creates topics/queues/subscriptions/bucket with `awslocal`. `docker compose --profile aws up` boots the whole thing.

## Work items

1. **QueueAdapter for SQS**: long-poll receive loop, visibility-timeout-aware handler wrapper, delete-on-success / DLQ-redrive on exhaustion. Reuse retry/backoff semantics from M3.
2. **Publisher swap**: ingest emits to SNS instead of enqueueing per-endpoint jobs; per-endpoint filtering moves to subscription filter policies where sensible (document trade-off vs app-side routing).
3. **Payload archive**: PUT original body to `s3://webhook-archive/{tenant}/{date}/{eventId}.json`; redrive re-reads from here.
4. **Config surface**: `AWS_ENDPOINT_URL` env switches SDK clients between LocalStack and real AWS — zero code changes between environments (this is the lesson).
5. **Tests**: keep every unit spec on aws-sdk-client-mock; add ONE docker-gated integration spec exercising the compose stack end-to-end (skips without Docker).

## Acceptance criteria

- [ ] Same delivery-guarantee tests from M4 pass with SQS adapter swapped in
- [ ] Crash the worker mid-batch → messages return to queue after visibility timeout → processed exactly once downstream (inbox dedupe)
- [ ] DLQ receives poison payload after maxReceiveCount; redrive API replays it successfully
- [ ] README documents the two profiles (`default`, `aws`) and when each matters

## Resume bullet this milestone feeds

*"Dual-mode event backbone: BullMQ locally, SQS/SNS/S3 under LocalStack in CI-profile — same delivery guarantees proven by shared test suites across both adapters."*
