import { describe, expect, it, vi } from "vitest";
import {
  createGuardedExecutor,
  executeToolCall,
  GuardrailError,
  ToolRegistry,
  validateArgs,
} from "./src/tools";

function weatherRegistry() {
  const registry = new ToolRegistry();
  registry.register({
    name: "get_weather",
    description: "Current weather for a city",
    parameters: { city: "string", celsius: "boolean" },
    execute: async (args) => ({
      city: args.city as string,
      tempC: args.celsius === true ? 21 : 70,
    }),
  });
  return registry;
}

describe("ToolRegistry", () => {
  it("tracks registration order and membership", () => {
    const registry = new ToolRegistry();
    expect(registry.list()).toEqual([]);

    registry.register({
      name: "get_weather",
      description: "d",
      parameters: {},
      execute: async () => null,
    });
    registry.register({
      name: "get_time",
      description: "d",
      parameters: {},
      execute: async () => null,
    });

    expect(registry.has("get_weather")).toBe(true);
    expect(registry.has("nope")).toBe(false);
    expect(registry.list()).toEqual(["get_weather", "get_time"]);
  });

  it("rejects duplicate tool names", () => {
    const registry = weatherRegistry();
    expect(() => {
      registry.register({
        name: "get_weather",
        description: "dup",
        parameters: {},
        execute: async () => null,
      });
    }).toThrow(/already registered/);
  });
});

describe("validateArgs — strict schema checking", () => {
  const def = {
    name: "get_weather",
    parameters: { city: "string" as const, celsius: "boolean" as const },
  };

  it("accepts fully valid arguments (returns coerced-free copy)", () => {
    const result = validateArgs(def, { city: "Paris", celsius: true });
    expect(result).toEqual({ ok: true, args: { city: "Paris", celsius: true } });
  });

  it("collects ALL violations in one pass", () => {
    const result = validateArgs(def, { celsius: "yes", extra: 1 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toEqual([
        "city: missing",
        "celsius: expected boolean, got string",
        "extra: unknown parameter",
      ]);
    }
  });

  it("treats NaN numbers as invalid", () => {
    const numeric = { name: "t", parameters: { n: "number" as const } };
    const result = validateArgs(numeric, { n: Number.NaN });
    expect(result.ok).toBe(false);
  });
});

describe("executeToolCall", () => {
  it("dispatches validated arguments to the right tool", async () => {
    const result = await executeToolCall(weatherRegistry(), {
      name: "get_weather",
      arguments: { city: "Oslo", celsius: false },
    });

    expect(result).toEqual({ ok: true, result: { city: "Oslo", tempC: 70 } });
  });

  it("never executes on validation failure; error lists violations", async () => {
    const executed = vi.fn();
    const registry = new ToolRegistry();
    registry.register({
      name: "boom",
      description: "",
      parameters: { x: "number" },
      execute: executed,
    });

    const result = await executeToolCall(registry, {
      name: "boom",
      arguments: { x: "not-a-number", y: true },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("x: expected number");
      expect(result.error).toContain("y: unknown parameter");
    }
    expect(executed).not.toHaveBeenCalled();
  });

  it("reports unknown tools without throwing", async () => {
    const result = await executeToolCall(new ToolRegistry(), {
      name: "delete_everything",
      arguments: {},
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("delete_everything");
  });
});

describe("createGuardedExecutor — the safety brake", () => {
  function countingRegistry(counter: { calls: number }) {
    const registry = new ToolRegistry();
    registry.register({
      name: "tick",
      description: "",
      parameters: {},
      execute: async () => void counter.calls++,
    });
    return registry;
  }

  it("allows up to maxCalls then throws GuardrailError WITHOUT executing", async () => {
    const counter = { calls: 0 };
    const executor = createGuardedExecutor(countingRegistry(counter), { maxCalls: 3 });

    for (let i = 0; i < 3; i++) await executor.execute({ name: "tick", arguments: {} });
    expect(counter.calls).toBe(3);

    await expect(executor.execute({ name: "tick", arguments: {} })).rejects.toBeInstanceOf(
      GuardrailError,
    );
    expect(counter.calls).toBe(3); // the blocked call never ran
    expect(executor.callsUsed()).toBe(3);
  });

  it("counts FAILED validations toward the limit too (they are model calls)", async () => {
    const registry = new ToolRegistry();
    registry.register({ name: "t", description: "", parameters: {}, execute: async () => null });
    const executor = createGuardedExecutor(registry, { maxCalls: 2 });

    // invalid call still consumes budget — model turns cost regardless of validity
    await executor.execute({ name: "t", arguments: { rogue: 1 } });
    await executor.execute({ name: "t", arguments: {} });
    await expect(executor.execute({ name: "t", arguments: {} })).rejects.toBeInstanceOf(
      GuardrailError,
    );
  });
});
