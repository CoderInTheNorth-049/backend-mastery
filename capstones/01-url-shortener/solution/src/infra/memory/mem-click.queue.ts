import type { ClickDrain, ClickEvent, ClickQueue } from "../../domain/ports";

/**
 * Buffer + drain queue. enqueue resolves immediately (the redirect path never
 * waits); take() is what the flush worker consumes.
 */
export class MemClickQueue implements ClickQueue, ClickDrain {
  private pending: ClickEvent[] = [];

  async enqueue(evt: ClickEvent): Promise<void> {
    this.pending.push(evt);
  }

  take(max: number = Number.POSITIVE_INFINITY): ClickEvent[] {
    if (max >= this.pending.length) {
      const all = this.pending;
      this.pending = [];
      return all;
    }
    return this.pending.splice(0, max);
  }

  pendingCount(): number {
    return this.pending.length;
  }
}
