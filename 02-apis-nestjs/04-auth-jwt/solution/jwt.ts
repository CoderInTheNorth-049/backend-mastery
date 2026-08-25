import { createHmac, timingSafeEqual } from "node:crypto";

export type JwtPayload = Record<string, unknown>;

export interface SignOptions {
  expiresInSec?: number;
  issuedAtSec?: number;
}

export type VerifyResult =
  | { valid: true; payload: JwtPayload }
  | {
      valid: false;
      reason: "malformed" | "wrong-alg" | "bad-signature" | "expired" | "not-yet-valid";
    };

export function base64UrlEncode(input: string | Buffer): string {
  return Buffer.from(input).toString("base64url");
}

export function base64UrlDecode(input: string): Buffer {
  return Buffer.from(input, "base64url");
}

function currentSec(): number {
  return Math.floor(Date.now() / 1000);
}

const HEADER = { alg: "HS256", typ: "JWT" };

export function signJwt(
  payload: JwtPayload,
  secret: string,
  options: SignOptions = {},
): string {
  const iat = options.issuedAtSec ?? currentSec();

  const claims: JwtPayload = { ...payload, iat };
  if (options.expiresInSec !== undefined) {
    claims.exp = iat + options.expiresInSec;
  }

  const headerB64 = base64UrlEncode(JSON.stringify(HEADER));
  const payloadB64 = base64UrlEncode(JSON.stringify(claims));
  const signatureB64 = createHmac("sha256", secret)
    .update(`${headerB64}.${payloadB64}`)
    .digest("base64url");

  return `${headerB64}.${payloadB64}.${signatureB64}`;
}

const MALFORMED: VerifyResult = { valid: false, reason: "malformed" };

export function verifyJwt(
  token: string,
  secret: string,
  nowSecOverride?: number,
): VerifyResult {
  // 1. Structure: three segments (count only — contents verified below).
  const parts = token.split(".");
  if (parts.length !== 3) return MALFORMED;
  const [headerB64, payloadB64, signatureB64] = parts;

  // 2. Header must be JSON declaring the pinned algorithm.
  let header: { alg?: unknown };
  try {
    header = JSON.parse(base64UrlDecode(headerB64!).toString("utf8"));
  } catch {
    return MALFORMED;
  }
  if (typeof header !== "object" || header === null || typeof header.alg !== "string") {
    return MALFORMED;
  }
  // RFC 8725: algorithm comes from configuration, NEVER from the token.
  if (header.alg !== "HS256") {
    return { valid: false, reason: "wrong-alg" };
  }

  // 3. Signature — constant-time compare, length-guarded.
  const expected = createHmac("sha256", secret)
    .update(`${headerB64}.${payloadB64}`)
    .digest();
  const provided = base64UrlDecode(signatureB64!);

  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return { valid: false, reason: "bad-signature" };
  }

  // 4. Only NOW do we trust (and parse) the payload body.
  let payload: JwtPayload;
  try {
    payload = JSON.parse(base64UrlDecode(payloadB64!).toString("utf8"));
  } catch {
    return MALFORMED;
  }
  if (typeof payload !== "object" || payload === null) return MALFORMED;

  // 5. Temporal claims — NumericDate SECONDS.
  const now = nowSecOverride ?? currentSec();
  const { exp, nbf } = payload as { exp?: unknown; nbf?: unknown };

  if (exp !== undefined) {
    if (typeof exp !== "number") return MALFORMED;
    if (now >= exp) return { valid: false, reason: "expired" }; // inclusive-reject
  }
  if (nbf !== undefined) {
    if (typeof nbf !== "number") return MALFORMED;
    if (now < nbf) return { valid: false, reason: "not-yet-valid" };
  }

  return { valid: true, payload };
}
