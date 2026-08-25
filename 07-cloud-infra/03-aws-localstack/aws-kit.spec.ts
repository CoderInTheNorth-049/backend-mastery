import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import { mockClient } from "aws-sdk-client-mock";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DocStore, EventPublisher } from "./src/aws-kit";

let s3 = mockClient(S3Client);
let sqs = mockClient(SQSClient);

beforeEach(() => {
  s3 = mockClient(S3Client);
  sqs = mockClient(SQSClient);
});
afterEach(() => {
  s3.reset();
  sqs.reset();
});

describe("DocStore", () => {
  const store = new DocStore(new S3Client({}), "docs-bucket");

  it("put sends Bucket/Key/Body via PutObjectCommand", async () => {
    s3.on(PutObjectCommand).resolves({});

    await store.put("v1|tenant-a|doc-1", "hello");

    expect(s3.commandCalls(PutObjectCommand)).toHaveLength(1);
    const input = s3.commandCalls(PutObjectCommand)[0].args[0].input;
    expect(input.Bucket).toBe("docs-bucket");
    expect(input.Key).toBe("v1|tenant-a|doc-1");
    expect(input.Body).toBe("hello");
  });

  it("get returns the body string on success", async () => {
    s3.on(GetObjectCommand).resolves({
      Body: { transformToString: async () => "file contents" } as never,
    });

    await expect(store.get("k")).resolves.toBe("file contents");

    const call = s3.commandCalls(GetObjectCommand)[0];
    expect(call.args[0].input).toMatchObject({ Bucket: "docs-bucket", Key: "k" });
  });

  it("translates NoSuchKey into null (absence is not exceptional)", async () => {
    s3.on(GetObjectCommand).rejects(
      Object.assign(new Error("The specified key does not exist."), {
        name: "NoSuchKey",
      }),
    );

    await expect(store.get("ghost")).resolves.toBeNull();
  });

  it("rethrows non-NoSuchKey S3 errors", async () => {
    s3.on(GetObjectCommand).rejects(Object.assign(new Error("denied"), { name: "AccessDenied" }));

    await expect(store.get("secret")).rejects.toMatchObject({ name: "AccessDenied" });
  });

  it("delete issues DeleteObjectCommand with bucket+key", async () => {
    s3.on(DeleteObjectCommand).resolves({});

    await store.delete("old-doc");

    const call = s3.commandCalls(DeleteObjectCommand)[0];
    expect(call.args[0].input).toMatchObject({ Bucket: "docs-bucket", Key: "old-doc" });
  });
});

describe("EventPublisher", () => {
  const publisher = new EventPublisher(new SQSClient({}), "https://sqs.local/orders");

  it("publishes JSON envelopes and returns the message id", async () => {
    sqs.on(SendMessageCommand).resolves({ MessageId: "msg_9" });

    const result = await publisher.publish({
      type: "order.placed",
      payload: { orderId: "o-1", totalCents: 1999 },
    });

    expect(result.messageId).toBe("msg_9");

    const call = sqs.commandCalls(SendMessageCommand)[0];
    expect(call.args[0].input.QueueUrl).toBe("https://sqs.local/orders");
    expect(JSON.parse(String(call.args[0].input.MessageBody))).toEqual({
      type: "order.placed",
      payload: { orderId: "o-1", totalCents: 1999 },
    });
  });

  it("propagates queue failures to the caller", async () => {
    sqs.on(SendMessageCommand).rejects(
      Object.assign(new Error("queue gone"), { name: "QueueDoesNotExist" }),
    );

    await expect(publisher.publish({ type: "x", payload: null })).rejects.toMatchObject({
      name: "QueueDoesNotExist",
    });
  });
});
