import { describe, expect, it } from "vitest";
import { BASE62_ALPHABET, createCodeFactory, decode, encode, nextUniqueCode } from "./base62";

describe("base62", () => {
  it("uses a 62-char alphabet with unique characters", () => {
    expect(BASE62_ALPHABET.length).toBe(62);
    expect(new Set(BASE62_ALPHABET).size).toBe(62);
  });

  it("round-trips numbers through encode/decode", () => {
    for (let i = 0; i <= 1000; i++) {
      expect(decode(encode(i))).toBe(BigInt(i));
    }
    // Big values exercise the multi-digit path without float precision loss.
    for (const big of [1234567890123, Number.MAX_SAFE_INTEGER]) {
      expect(decode(encode(big))).toBe(BigInt(big));
    }
  });

  it("matches known vectors", () => {
    expect(encode(0)).toBe("0");
    expect(encode(61)).toBe("z");
    expect(decode("10")).toBe(62n);
  });

  it("rejects invalid characters on decode", () => {
    expect(() => decode("a-b")).toThrow(/invalid base62 character/);
  });
});

describe("code factory", () => {
  it("produces a deterministic sequence prefix with a fixed rand", () => {
    const factory = createCodeFactory({ rand: () => 0.5, suffixLength: 4 });
    const codes = [factory.next(), factory.next(), factory.next()];
    // Fixed rand pins the suffix; stripping it must reveal the raw counter.
    const expectedSuffix = BASE62_ALPHABET[31].repeat(4);
    codes.forEach((code, i) => {
      expect(code.slice(-4)).toBe(expectedSuffix);
      expect(decode(code.slice(0, -4))).toBe(BigInt(i));
    });
  });

  it("appends the configured number of random chars", () => {
    const code = createCodeFactory({ suffixLength: 6 }).next();
    expect(code.length).toBeGreaterThanOrEqual(1 + 6);
  });

  it("retries collisions up to five times, then throws", async () => {
    let attempts = 0;
    const factory = { next: (): string => `c${++attempts}` };
    await expect(nextUniqueCode(factory, async () => false)).resolves.toBe("c1");

    let calls = 0;
    const alwaysTaken = async (): Promise<boolean> => {
      calls += 1;
      return true;
    };
    await expect(nextUniqueCode(factory, alwaysTaken)).rejects.toThrow(/unique short code/);
    expect(calls).toBe(5);
  });
});
