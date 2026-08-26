import { describe, expect, it } from "vitest";
import { OutboundQueue } from "./outbound-queue";

describe("OutboundQueue", () => {
  it("passes frames straight through when healthy", () => {
    const sent: string[] = [];
    const queue = new OutboundQueue(3, (frame) => sent.push(String(frame.payload)));
    queue.push({ event: "message", payload: "a" });
    queue.push({ event: "message", payload: "b" });
    expect(sent).toEqual(["a", "b"]);
    expect(queue.depth).toBe(0);
    expect(queue.droppedCount).toBe(0);
  });

  it("drops the OLDEST frames on overflow and keeps counting them", () => {
    const sent: string[] = [];
    const queue = new OutboundQueue(3, (frame) => sent.push(String(frame.payload)));

    queue.push({ event: "m", payload: "a" }); // delivered live, queue stays empty
    queue.suspend();
    for (const p of ["b", "c", "d", "e", "f"]) queue.push({ event: "m", payload: p });

    expect(queue.depth).toBe(3); // capacity honored exactly
    expect(queue.droppedCount).toBe(2); // b and c — oldest — paid the price
    expect(sent).toEqual(["a"]);

    queue.resume();
    expect(sent).toEqual(["a", "d", "e", "f"]); // freshest frames survive, in order
    queue.resume();
    expect(sent).toEqual(["a", "d", "e", "f"]); // resume is idempotent
  });
});
