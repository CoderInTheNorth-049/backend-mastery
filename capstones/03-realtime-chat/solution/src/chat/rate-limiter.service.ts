import { Injectable } from "@nestjs/common";
import { TokenBucket } from "../domain/token-bucket";

// 5-message burst, then one slot per second: a human typing can't tell,
// a for-loop absolutely can.
export const RATE_LIMIT_CAPACITY = 5;
export const RATE_LIMIT_REFILL_PER_SEC = 1;

@Injectable()
export class RateLimiterService {
  // Buckets key on userId and outlive reconnects — otherwise a client could
  // reset its own budget by cycling the socket.
  private readonly buckets = new Map<string, TokenBucket>();

  allow(userId: string): boolean {
    let bucket = this.buckets.get(userId);
    if (!bucket) {
      bucket = new TokenBucket(RATE_LIMIT_CAPACITY, RATE_LIMIT_REFILL_PER_SEC);
      this.buckets.set(userId, bucket);
    }
    return bucket.take();
  }
}
