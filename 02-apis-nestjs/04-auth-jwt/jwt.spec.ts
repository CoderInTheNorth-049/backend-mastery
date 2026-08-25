import { describe, expect, it } from "vitest";
import {
  base64UrlDecode,
  base64UrlEncode,
  signJwt,
  verifyJwt,
} from "./src/jwt";

const SECRET = "test-secret-key-material";
const T0 = 1_700_000_000; // fixed "now" for determinism

describe("base64url codecs", () => {
  it("round-trips ASCII and unicode strings", () => {
    const value = 'hello wörld {"a":1}';
    expect(base64UrlDecode(base64UrlEncode(value)).toString("utf8")).toBe(value);
  });

  it("round-trips binary buffers", () => {
    const buffer = Buffer.from([0x00, 0xfb, 0xff, 0x10]);
    expect(base64UrlDecode(base64UrlEncode(buffer))).toEqual(buffer);
  });

  it("never emits +, / or = characters", () => {
    // These base64 inputs WOULD produce +, / and padding =
    const output = base64UrlEncode(Buffer.from([251, 255, 190, 239]));
    expect(output).not.toMatch(/[+/=]/);
  });
});

describe("signJwt", () => {
  it("produces three dot-separated segments", () => {
    const token = signJwt({ sub: "user-1" }, SECRET, { issuedAtSec: T0 });
    expect(token.split(".")).toHaveLength(3);
  });

  it("declares HS256 in a decodable header", () => {
    const token = signJwt({ sub: "user-1" }, SECRET, { issuedAtSec: T0 });
    const [headerB64] = token.split(".");
    const header = JSON.parse(base64UrlDecode(headerB64!).toString("utf8"));

    expect(header).toEqual({ alg: "HS256", typ: "JWT" });
  });

  it("adds iat and computes exp from expiresInSec", () => {
    const token = signJwt({ sub: "user-1" }, SECRET, {
      issuedAtSec: T0,
      expiresInSec: 60,
    });
    const [, payloadB64] = token.split(".");
    const payload = JSON.parse(base64UrlDecode(payloadB64!).toString("utf8"));

    expect(payload.iat).toBe(T0);
    expect(payload.exp).toBe(T0 + 60);
    expect(payload.sub).toBe("user-1");
  });

  it("omits exp when no expiry requested", () => {
    const token = signJwt({ sub: "x" }, SECRET, { issuedAtSec: T0 });
    const [, payloadB64] = token.split(".");
    expect(JSON.parse(base64UrlDecode(payloadB64!).toString())).not.toHaveProperty("exp");
  });

  it("preserves arbitrary extra claims (iss, roles...)", () => {
    const token = signJwt(
      { iss: "auth.example.com", roles: ["admin"], meta: { orgId: 7 } },
      SECRET,
      { issuedAtSec: T0 },
    );
    const result = verifyJwt(token, SECRET, T0 + 1);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.payload).toMatchObject({
        iss: "auth.example.com",
        roles: ["admin"],
        meta: { orgId: 7 },
      });
    }
  });
});

describe("verifyJwt — happy path & tampering", () => {
  const payload = { sub: "user-9" };

  it("verifies a fresh token at various clock positions", () => {
    const token = signJwt(payload, SECRET, { issuedAtSec: T0, expiresInSec: 100 });

    expect(verifyJwt(token, SECRET, T0).valid).toBe(true);
    expect(verifyJwt(token, SECRET, T0 + 99).valid).toBe(true);
  });

  it("rejects a tampered payload as bad-signature", () => {
    const token = signJwt({ sub: "user-9", role: "pleb" }, SECRET, {
      issuedAtSec: T0,
      expiresInSec: 100,
    });
    const [h, , s] = token.split(".");
    const forgedPayload = Buffer.from(JSON.stringify({ sub: "user-9", role: "admin" })).toString("base64url");
    const forged = `${h}.${forgedPayload}.${s}`;

    const result = verifyJwt(forged, SECRET, T0 + 1);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toBe("bad-signature");
  });

  it("rejects the wrong secret as bad-signature", () => {
    const token = signJwt(payload, SECRET, { issuedAtSec: T0, expiresInSec: 100 });

    const result = verifyJwt(token, "different-secret", T0 + 1);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toBe("bad-signature");
  });
});

describe("verifyJwt — temporal claims", () => {
  it("expires exactly at exp (inclusive-reject)", () => {
    const token = signJwt({}, SECRET, { issuedAtSec: T0, expiresInSec: 60 });

    expect(verifyJwt(token, SECRET, T0 + 59)).toEqual({ valid: true, payload: expect.anything() });
    const atExpiry = verifyJwt(token, SECRET, T0 + 60);
    expect(atExpiry.valid).toBe(false);
    if (!atExpiry.valid) expect(atExpiry.reason).toBe("expired");
  });

  it("reports not-yet-valid for future nbf", () => {
    const token = signJwt({ nbf: T0 + 50 }, SECRET, { issuedAtSec: T0 });

    const early = verifyJwt(token, SECRET, T0 + 49);
    expect(early.valid).toBe(false);
    if (!early.valid) expect(early.reason).toBe("not-yet-valid");

    const onTime = verifyJwt(token, SECRET, T0 + 50);
    expect(onTime.valid).toBe(true);
  });
});

describe("verifyJwt — malformed input & algorithm attacks", () => {
  it.each([
    "",
    "not-a-jwt",
    "only.two",
    "four.segments.here.now",
    "!!!.!!.!!!",
  ])("marks %j as malformed", (token) => {
    const result = verifyJwt(token, SECRET);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toBe("malformed");
  });

  it("rejects non-JSON header/payload segments as malformed", () => {
    const garbage = Buffer.from("not json").toString("base64url");
    const result = verifyJwt(`${garbage}.${garbage}.sig`, SECRET);

    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toBe("malformed");
  });

  it("kills the alg:none attack regardless of signature content", () => {
    const noneHeader = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
    const body = Buffer.from(JSON.stringify({ sub: "victim", iat: T0 })).toString("base64url");

    const result = verifyJwt(`${noneHeader}.${body}.`, SECRET, T0 + 1);

    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toBe("wrong-alg");
  });

  it("rejects unexpected algorithms like HS512", () => {
    const header = Buffer.from(JSON.stringify({ alg: "HS512", typ: "JWT" })).toString("base64url");
    const body = Buffer.from(JSON.stringify({ sub: "x" })).toString("base64url");
    const result = verifyJwt(`${header}.${body}.c2ln`, SECRET, T0);

    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toBe("wrong-alg");
  });
});
