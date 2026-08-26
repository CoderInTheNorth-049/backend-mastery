/** Presence TTL: heartbeats older than this are zombies and get reaped. */
export const PRESENCE_TTL_MS = 45_000;

/**
 * Heartbeat-TTL presence. Multi-tab aware by construction: presence keys on
 * userId, not socketId, so N tabs touching the same user stay one entry and
 * the gateway only calls leave() when the LAST tab disconnects. online()
 * self-filters against the TTL so a stalled sweeper cannot lie about who
 * is online; sweep() is what actually frees the memory.
 */
export class PresenceRegistry {
  private readonly lastSeenMs = new Map<string, number>();

  constructor(private readonly clock: () => number = Date.now) {}

  touch(userId: string): void {
    this.lastSeenMs.set(userId, this.clock());
  }

  leave(userId: string): boolean {
    return this.lastSeenMs.delete(userId);
  }

  online(): string[] {
    const now = this.clock();
    return [...this.lastSeenMs]
      .filter(([, seen]) => now - seen < PRESENCE_TTL_MS)
      .map(([userId]) => userId)
      .sort();
  }

  /** Evicts entries stale by more than `staleMs` and returns who left. */
  sweep(now: number = this.clock(), staleMs: number = PRESENCE_TTL_MS): string[] {
    const evicted: string[] = [];
    for (const [userId, seen] of this.lastSeenMs) {
      if (now - seen >= staleMs) {
        this.lastSeenMs.delete(userId);
        evicted.push(userId);
      }
    }
    return evicted.sort();
  }
}
