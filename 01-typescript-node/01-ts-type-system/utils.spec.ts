import { describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  deepEqual,
  err,
  omit,
  ok,
  pick,
  TypedEmitter,
  unwrapOr,
} from "./src/utils";

describe("pick / omit", () => {
  const user = { id: 1, name: "ada", email: "a@x.io", admin: false };

  it("pick returns only requested keys", () => {
    const result = pick(user, ["id", "name"]);
    expect(result).toEqual({ id: 1, name: "ada" });
    expectTypeOf(result).toEqualTypeOf<{ id: number; name: string }>();
  });

  it("omit removes requested keys", () => {
    expect(omit(user, ["email", "admin"])).toEqual({ id: 1, name: "ada" });
  });

  it("does not mutate the input", () => {
    const original = { a: 1, b: 2 };
    pick(original, ["a"]);
    omit(original, ["a"]);
    expect(original).toEqual({ a: 1, b: 2 });
  });
});

describe("deepEqual", () => {
  it("matches nested structures regardless of key order", () => {
    expect(deepEqual({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] })).toBe(true);
    expect(deepEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
  });

  it("distinguishes different key sets and array orders", () => {
    expect(deepEqual({ a: 1 }, { a: 1, b: undefined })).toBe(false);
    expect(deepEqual([1, 2], [2, 1])).toBe(false);
  });

  it("treats NaN as equal to itself (Object.is semantics)", () => {
    expect(deepEqual(NaN, NaN)).toBe(true);
    expect(Object.is(0, -0)).toBe(false);
  });

  it("compares Dates by time value", () => {
    expect(deepEqual(new Date(1000), new Date(1000))).toBe(true);
    expect(deepEqual(new Date(1000), new Date(2000))).toBe(false);
  });

  it("never confuses null with objects", () => {
    expect(deepEqual(null, {})).toBe(false);
    expect(deepEqual(null, null)).toBe(true);
  });
});

describe("Result", () => {
  it("narrows via the ok discriminant", () => {
    const success = ok<number, string>(42);
    if (success.ok) {
      expect(success.value).toBe(42);
    } else {
      throw new Error("should not reach");
    }

    const failure = err<number, string>("boom");
    if (!failure.ok) {
      expect(failure.error).toBe("boom");
    } else {
      throw new Error("should not reach");
    }
  });

  it("unwrapOr falls back on error", () => {
    expect(unwrapOr(ok(5), 0)).toBe(5);
    expect(unwrapOr(err("x"), 0)).toBe(0);
  });
});

describe("TypedEmitter", () => {
  type Events = { "user:created": { id: string }; tick: number };

  it("delivers typed payloads to listeners", () => {
    const bus = new TypedEmitter<Events>();
    const seen: unknown[] = [];
    bus.on("tick", (n) => seen.push(n));

    const delivered = bus.emit("tick", 3);

    expect(delivered).toBe(true);
    expect(seen).toEqual([3]);
  });

  it("emit returns false when nobody listens", () => {
    const bus = new TypedEmitter<Events>();
    expect(bus.emit("user:created", { id: "u1" })).toBe(false);
  });

  it("supports multiple listeners and per-registration unsubscribe", () => {
    const bus = new TypedEmitter<Events>();
    const calls: string[] = [];
    const l1 = () => calls.push("l1");
    const l2 = () => calls.push("l2");

    const off1 = bus.on("tick", l1);
    bus.on("tick", l2);
    bus.emit("tick", 1);
    expect(calls).toEqual(["l1", "l2"]);

    off1();
    bus.emit("tick", 2);
    expect(calls).toEqual(["l1", "l2", "l2"]);
  });

  it("off removes only one registration of a duplicated listener", () => {
    const bus = new TypedEmitter<Events>();
    const spy = vi.fn();
    bus.on("tick", spy);
    bus.on("tick", spy);

    bus.off("tick", spy);
    expect(bus.emit("tick", 9)).toBe(true);
    expect(spy).toHaveBeenCalledTimes(1);

    bus.off("tick", spy);
    expect(bus.emit("tick", 9)).toBe(false);
  });

  // Type-level: these lines must fail typecheck when uncommented.
  // bus.on("nope", () => {});
  // bus.emit("tick", "not-a-number");
});
