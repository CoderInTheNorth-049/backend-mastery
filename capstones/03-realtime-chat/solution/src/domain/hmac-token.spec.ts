import { describe, expect, it } from "vitest";
import { signToken, verifyToken } from "./hmac-token";

const SECRET = "test-secret";
// exp = unix second 1_000_000; verifyToken takes ms.
const PAYLOAD = { sub: "alice", exp: 1_000_000 };

describe("hmac-token", () => {
  it("roundtrips a signed token", () => {
    const token = signToken(PAYLOAD, SECRET);
    expect(token).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    // 999_999_999ms -> nowSec 999_999 < exp: still valid one tick before expiry.
    expect(verifyToken(token, SECRET, 999_999_999)).toEqual(PAYLOAD);
  });

  it("rejects a tampered payload", () => {
    const [, signature] = signToken(PAYLOAD, SECRET).split(".");
    const forgedBody = Buffer.from(JSON.stringify({ sub: "mallory", exp: 1_000_000 }), "utf8").toString(
      "base64url",
    );
    expect(verifyToken(`${forgedBody}.${signature}`, SECRET, 0)).toBeNull();
  });

  it("rejects a tampered signature and a wrong secret", () => {
    const [body, signature] = signToken(PAYLOAD, SECRET).split(".");
    const sameLengthFake = "A".repeat(signature.length);
    expect(verifyToken(`${body}.${sameLengthFake}`, SECRET, 0)).toBeNull();
    expect(verifyToken(signToken(PAYLOAD, SECRET), "other-secret", 0)).toBeNull();
  });

  it("rejects expired tokens at and after expiry", () => {
    const token = signToken(PAYLOAD, SECRET);
    // exp == current second counts as expired (strictly-future rule).
    expect(verifyToken(token, SECRET, 1_000_000_000)).toBeNull();
    expect(verifyToken(token, SECRET, 2_000_000_000)).toBeNull();
  });

  it("rejects malformed input outright", () => {
    expect(verifyToken(undefined, SECRET)).toBeNull();
    expect(verifyToken("", SECRET)).toBeNull();
    expect(verifyToken("no-dot-here", SECRET)).toBeNull();
    expect(verifyToken("a.b.c", SECRET)).toBeNull();
  });
});
