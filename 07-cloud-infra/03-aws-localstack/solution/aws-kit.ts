import {
  DeleteObjectCommand,
  GetObjectCommand,
  NoSuchKey,
  PutObjectCommand,
  PutObjectCommandOutput,
  S3Client,
} from "@aws-sdk/client-s3";
import type { GetObjectCommandOutput } from "@aws-sdk/client-s3";
import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";

export class DocStore {
  constructor(
    private readonly s3: Pick<S3Client, "send">,
    private readonly bucket: string,
  ) {}

  async put(key: string, body: string | Buffer): Promise<PutObjectCommandOutput> {
    return this.s3.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body }),
    );
  }

  /** Absence is not exceptional for callers: NoSuchKey → null. */
  async get(key: string): Promise<string | null> {
    let response: GetObjectCommandOutput;
    try {
      response = await this.s3.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    } catch (error) {
      if ((error as Error).name === "NoSuchKey" || (error as { name?: string })?.name === "404") {
        return null;
      }
      throw error;
    }

    const body = response.Body;
    if (!body) return null;

    // SDK v3 bodies expose transformToString; fall back to manual iteration
    // for plain streams.
    const maybe = body as { transformToString?: (enc: string) => Promise<string> };
    if (typeof maybe.transformToString === "function") {
      return await maybe.transformToString("utf-8");
    }

    const chunks: Buffer[] = [];
    for await (const chunk of body as AsyncIterable<Buffer>) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks).toString("utf8");
  }

  async delete(key: string): Promise<void> {
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}

export interface EventEnvelope {
  type: string;
  payload: unknown;
}

export class EventPublisher {
  constructor(
    private readonly sqs: Pick<SQSClient, "send">,
    private readonly queueUrl: string,
  ) {}

  async publish(event: EventEnvelope): Promise<{ messageId: string }> {
    const result = await this.sqs.send(
      new SendMessageCommand({
        QueueUrl: this.queueUrl,
        MessageBody: JSON.stringify(event),
      }),
    );
    return { messageId: result.MessageId ?? "" };
  }
}

// Re-exported for learner convenience in their own local labs:
export { S3Client, SQSClient, NoSuchKey };
