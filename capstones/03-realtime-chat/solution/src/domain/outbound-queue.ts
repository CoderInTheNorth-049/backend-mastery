export interface OutboundFrame {
  event: string;
  payload: unknown;
}

/**
 * Bounded per-connection send queue — THE backpressure seam.
 *
 * Every frame a connection receives funnels through push(); when healthy it
 * passes straight through to the transport. When a consumer can't keep up
 * (suspend()), frames pile up here instead of in unbounded engine buffers:
 * capacity caps memory per socket at O(100) frames forever, overflow drops
 * the OLDEST frame (stale chat is worthless, fresh chat wins), droppedCount
 * turns "the client missed something" from a guess into a number the client
 * can resync from (replay via the history endpoint's cursor).
 *
 * Production wiring suspends/resumes around the transport's high-water mark
 * (e.g. ws bufferedAmount); the policy lives here either way.
 */
export class OutboundQueue {
  private frames: OutboundFrame[] = [];
  private suspended = false;
  private _droppedCount = 0;

  constructor(
    private readonly capacity: number,
    private readonly send: (frame: OutboundFrame) => void,
  ) {}

  get depth(): number {
    return this.frames.length;
  }

  get droppedCount(): number {
    return this._droppedCount;
  }

  push(frame: OutboundFrame): void {
    this.frames.push(frame);
    while (this.frames.length > this.capacity) {
      this.frames.shift();
      this._droppedCount += 1;
    }
    if (!this.suspended) this.flush();
  }

  suspend(): void {
    this.suspended = true;
  }

  resume(): void {
    this.suspended = false;
    this.flush();
  }

  private flush(): void {
    while (this.frames.length > 0 && !this.suspended) {
      this.send(this.frames.shift() as OutboundFrame);
    }
  }
}
