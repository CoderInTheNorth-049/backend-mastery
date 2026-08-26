import type { Clock } from "../domain/types";

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}

/** Test clock: freeze time, then advance it to simulate TTLs deterministically. */
export class FakeClock implements Clock {
  private current: Date;

  constructor(now: Date | string = new Date()) {
    this.current = new Date(now);
  }

  now(): Date {
    return new Date(this.current);
  }

  advance(ms: number): Date {
    this.current = new Date(this.current.getTime() + ms);
    return this.now();
  }
}
