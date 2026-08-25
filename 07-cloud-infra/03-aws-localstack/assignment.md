# Assignment — AWS wrappers under aws-sdk-client-mock

**Estimated:** 4 hours · **File:** [src/aws-kit.ts](src/aws-kit.ts)
**Graded by:** [aws-kit.spec.ts](aws-kit.spec.ts) — fully offline; no cloud, no LocalStack required.

`src/fixtures.ts`-style GIVEN data doesn't exist here — instead the SPEC mocks both AWS clients with [aws-sdk-client-mock](https://aws-sdk-client-mock.readthedocs.io/) and asserts your command INPUTS (bucket/key/body/queueUrl), not just responses.

## 1. `DocStore` (S3)

```ts
new DocStore(s3: Pick<S3Client, "send">, bucket: string)
put(key, body: string | Buffer): Promise<PutObjectCommandOutput>
get(key): Promise<string | null>     // NoSuchKey → null
delete(key): Promise<void>
```

- Every method sends the corresponding v3 command with `{Bucket, Key, …}`.
- `get`: translate ONLY `NoSuchKey` into `null`; every other error (AccessDenied…) rethrows untouched so callers see real permission problems.
- `get` returns the object Body as a UTF-8 **string** — SDK v3 bodies are streams: prefer `transformToString("utf-8")` when present, else iterate chunks into Buffer.concat.

## 2. `EventPublisher` (SQS)

```ts
new EventPublisher(sqs: Pick<SQSClient, "send">, queueUrl: string)
publish({type, payload}): Promise<{ messageId: string }>
```

- Sends `SendMessageCommand { QueueUrl, MessageBody: JSON.stringify(envelope) }`; returns `{ messageId }`.
- Provider failures propagate AS-IS — SQS error names are already your taxonomy.

## Hints

<details><summary>Error names</summary>
v3 service errors expose <code>error.name</code>. Check name BEFORE generic handling; guard <code>match[1]</code>-style access patterns you'd use elsewhere.</details>

<details><summary>Body handling</summary>
<code>GetObjectCommandOutput.Body</code> may be undefined on empty objects — return null there too.</details>

## Acceptance criteria

- [ ] Spec green
- [ ] No network calls possible in tests (mocks intercept everything)
- [ ] Inputs asserted, not just responses stubbed

## Stretch (LocalStack lab, docker-gated)

Spin LocalStack via compose profile; point a real S3Client at it (`endpoint`, `region: us-east-1`, dummy creds); round-trip put/get/delete for real. Document the endpoint-override trick in notes.
