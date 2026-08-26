import { describe, expect, it, vi } from "vitest";
import { InboxDedupe } from "./inbox";

describe("InboxDedupe", () => {
  it("skips already-seen eventIds while letting fresh ones through", async () => {
    const onDuplicate = vi.fn();
    const inbox = new InboxDedupe(onDuplicate);
    let processed = 0;
    const handler = inbox.wrap(async () => {
      processed += 1;
    });

    await handler({ eventId: "e-1", topic: "t" });
    await handler({ eventId: "e-1", topic: "t" });
    await handler({ eventId: "e-2", topic: "t" });

    expect(processed).toBe(2);
    expect(onDuplicate).toHaveBeenCalledTimes(1);
    expect(inbox.hasSeen("e-1")).toBe(true);
    expect(inbox.hasSeen("e-2")).toBe(true);
  });
});
