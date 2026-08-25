// ── AWS wrappers: S3 document store + SQS event publisher ────────────────
// Implement per ../assignment.md. Do NOT rename exports.

import type {
  GetObjectCommandOutput,
  PutObjectCommandOutput,
  S3Client,
} from "@aws-sdk/client-s3";
import type { SQSClient } from "@aws-sdk/client-sqs";

export class DocStore {
  constructor(
    private readonly s3: Pick<S3Client, "send">,
    private readonly bucket: string,
  ) {}

  async put(key: string, body: string | Buffer): Promise<PutObjectCommandOutput> {
    throw new Error("TODO: implement put");
  }

  /** Returns the object body as a UTF-8 string; missing keys → null. */
  async get(key: string): Promise<string | null> {
    throw new Error("TODO: implement get");
  }

  async delete(key: string): Promise<void> {
    throw new Error("TODO: implement delete");
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

  /**
   * SendMessage with JSON-stringified envelope as the body.
   * Returns the provider message id.
   */
  async publish(event: EventEnvelope): Promise<{ messageId: string }> {
    throw new Error("TODO: implement publish");
  }
}
