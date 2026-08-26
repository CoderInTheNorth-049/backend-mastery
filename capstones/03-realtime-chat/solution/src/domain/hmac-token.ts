import { createHmac, timingSafeEqual } from "node:crypto";

export interface TokenPayload {
  sub: string;
  /** Expiry as unix seconds, mirroring the JWT `exp` claim. */
  exp: number;
}

const b64url = (input: string): string => Buffer.from(input, "utf8").toString("base64url");

function mac(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("base64url");
}

export function signToken(payload: TokenPayload, secret: string): string {
  const body = b64url(JSON.stringify(payload));
  return `${body}.${mac(body, secret)}`;
}

/**
 * Returns the payload for a well-formed, correctly signed, unexpired token;
 * null for anything else. Callers treat null as "reject" — there is no
 * partial-credit path. `now` is injectable (ms) so tests can freeze time.
 */
export function verifyToken(
  token: string | undefined,
  secret: string,
  now: number = Date.now(),
): TokenPayload | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, received] = parts;

  // Constant-time compare once lengths match; differing lengths leak nothing
  // useful to an attacker but would make timingSafeEqual throw.
  const expected = Buffer.from(mac(body, secret), "utf8");
  const got = Buffer.from(received, "utf8");
  if (expected.length !== got.length || !timingSafeEqual(expected, got)) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;
  const { sub, exp } = parsed as { sub?: unknown; exp?: unknown };
  if (typeof sub !== "string" || typeof exp !== "number" || !Number.isFinite(exp)) return null;

  // exp == current second counts as expired: a token is valid only strictly
  // into the future, which errs on the safe side at second boundaries.
  if (exp <= Math.floor(now / 1000)) return null;

  return { sub, exp };
}
