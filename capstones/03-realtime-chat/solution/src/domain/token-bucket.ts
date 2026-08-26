/**
 * Classic refill-on-check token bucket. No timers: tokens accrue lazily from
 * elapsed wall time on each take(), so idle buckets cost nothing and burst
 * capacity + steady-state rate are both explicit constructor knobs.
 */
export class TokenBucket {
  private tokens: number;
  private lastRefillMs: number;

  constructor(
    private readonly capacity: number = 5,
    private readonly refillPerSec: number = 1,
    private readonly now: () => number = Date.now,
  ) {
    if (!Number.isInteger(capacity) || capacity < 1) {
      throw new RangeError("capacity must be an integer >= 1");
    }
    if (!Number.isFinite(refillPerSec) || refillPerSec < 0) {
      throw new RangeError("refillPerSec must be >= 0");
    }
    this.tokens = capacity;
    this.lastRefillMs = now();
  }

  /**
   * Consumes one token if available. A failed take() still advances the
   * refill clock but never goes negative — rejected callers are not refunded.
   */
  take(): boolean {
    const nowMs = this.now();
    const elapsedSec = Math.max(0, nowMs - this.lastRefillMs) / 1000;
    this.tokens = Math.min(this.capacity, this.tokens + elapsedSec * this.refillPerSec);
    this.lastRefillMs = nowMs;

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    return false;
  }
}
