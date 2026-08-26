import { describe, expect, it } from "vitest";
import { PRESENCE_TTL_MS, PresenceRegistry } from "./presence";

describe("PresenceRegistry", () => {
  it("tracks touches and leaves per user", () => {
    let nowMs = 1_000_000;
    const registry = new PresenceRegistry(() => nowMs);

    registry.touch("alice");
    registry.touch("bob");
    registry.leave("bob");
    expect(registry.online()).toEqual(["alice"]);
    registry.leave("alice");
    expect(registry.online()).toEqual([]);
  });

  it("hides stale users online() and evicts them on sweep()", () => {
    let nowMs = 1_000_000;
    const registry = new PresenceRegistry(() => nowMs);

    registry.touch("alice");
    registry.touch("bob");
    nowMs += 10_000;
    registry.touch("carol");

    expect(registry.online()).toEqual(["alice", "bob", "carol"]);

    // alice/bob at 44_999ms age: still fresh. One more ms crosses the TTL.
    nowMs += PRESENCE_TTL_MS - 10_000 - 1;
    expect(registry.online()).toEqual(["alice", "bob", "carol"]);
    nowMs += 1;
    expect(registry.online()).toEqual(["carol"]); // self-filtering even pre-sweep

    expect(registry.sweep(nowMs)).toEqual(["alice", "bob"]);
    expect(registry.sweep(nowMs)).toEqual([]); // idempotent
    expect(registry.online()).toEqual(["carol"]);
  });
});
