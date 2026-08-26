import type { BookingStore, Clock } from "./types";

/**
 * Eager counterpart to lazy expiry-on-read/write: flips every past-due ACTIVE
 * hold to EXPIRED so seat inventory is reclaimed even when nobody touches the
 * showing again. Bootstrap schedules this; tests drive it manually via the
 * fake clock.
 */
export class SweepService {
  private timer?: ReturnType<typeof setInterval>;

  constructor(private readonly store: BookingStore) {}

  sweepExpired(now: Date): Promise<number> {
    return this.store.tx((txv) => txv.expireHolds(now));
  }

  startAutoSweep(clock: Clock, intervalMs: number): void {
    if (this.timer) {
      return;
    }
    this.timer = setInterval(() => {
      void this.sweepExpired(clock.now()).catch(() => undefined);
    }, intervalMs);
    // unref: the demo process should still exit naturally on SIGTERM/SIGINT.
    this.timer.unref?.();
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }
}
