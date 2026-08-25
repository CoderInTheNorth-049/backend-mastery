import { describe, expect, it } from "vitest";
import { matchesTopicBinding, routeMessage } from "./src/topic-match";

describe("matchesTopicBinding — exact words", () => {
  it("matches identical single and multi-word keys", () => {
    expect(matchesTopicBinding("order", "order")).toBe(true);
    expect(matchesTopicBinding("order.created.eu", "order.created.eu")).toBe(true);
  });

  it("rejects partial overlaps", () => {
    expect(matchesTopicBinding("order", "order.created")).toBe(false);
    expect(matchesTopicBinding("order.created", "order")).toBe(false);
  });
});

describe("matchesTopicBinding — the * wildcard (exactly one word)", () => {
  it("substitutes exactly one word", () => {
    expect(matchesTopicBinding("order.created.eu", "order.*.eu")).toBe(true);
    expect(matchesTopicBinding("a.b.c.d", "a.*.c.*")).toBe(true);
  });

  it("never matches zero or two words", () => {
    expect(matchesTopicBinding("order.eu", "order.*.eu")).toBe(false);
    expect(matchesTopicBinding("order", "order.*")).toBe(false);
    expect(matchesTopicBinding("a.b", "a.*")).toBe(true);
  });
});

describe("matchesTopicBinding — the # wildcard (zero or more words)", () => {
  it("# alone matches everything, including empty keys", () => {
    for (const key of ["a", "a.b.c", "x"]) {
      expect(matchesTopicBinding(key, "#")).toBe(true);
    }
    expect(matchesTopicBinding("", "#")).toBe(true);
  });

  it("# consumes zero words when needed", () => {
    // "log.#" must match plain "log" (# ate nothing)
    expect(matchesTopicBinding("log", "log.#")).toBe(true);
    expect(matchesTopicBinding("log.error.fatal", "log.#")).toBe(true);
  });

  it("handles the gnarly combinations", () => {
    expect(matchesTopicBinding("a.b", "#.#")).toBe(true);
    expect(matchesTopicBinding("a", "*.#")).toBe(true);   // * takes 'a', # takes zero
    expect(matchesTopicBinding("a.b.c", "*.b.#")).toBe(true);
    expect(matchesTopicBinding("b.c", "*.b.#")).toBe(false);
    expect(matchesTopicBinding("a.b.c.d", "#.c.#")).toBe(true);
    expect(matchesTopicBinding("a.c", "#.c.#")).toBe(true);
    expect(matchesTopicBinding("a.b", "#.c.#")).toBe(false);
  });
});

describe("routeMessage", () => {
  const bindings = [
    "order.*",
    "order.created.eu",
    "#.eu",
    "payment.#",
  ];

  it("returns only matching patterns, preserving input order", () => {
    // note: "order.*" is exactly-two-words — it does NOT match the 3-word key
    expect(routeMessage(bindings, "order.created.eu")).toEqual([
      "order.created.eu",
      "#.eu",
    ]);
    expect(routeMessage(bindings, "order.created")).toEqual(["order.*"]);
    expect(routeMessage(bindings, "payment.capture")).toEqual(["payment.#"]);
    expect(routeMessage(bindings, "user.signup")).toEqual([]);
  });

  it("supports the fan-out-with-filtering pattern", () => {
    const everything = routeMessage(["#", "audit.#"], "anything.here");
    expect(everything).toEqual(["#"]);
  });
});
