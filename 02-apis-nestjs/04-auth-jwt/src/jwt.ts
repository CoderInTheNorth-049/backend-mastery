import { createHmac } from "node:crypto";

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
  throw new Error("TODO: implement base64UrlEncode");
}

export function base64UrlDecode(input: string): Buffer {
  throw new Error("TODO: implement base64UrlDecode");
}

function nowSec(): number {
  return Math.floor(Date.now() / 1000);
}

export function signJwt(
  payload: JwtPayload,
  secret: string,
  options: SignOptions = {},
): string {
  throw new Error("TODO: implement signJwt");
}

export function verifyJwt(
  token: string,
  secret: string,
  nowSecOverride?: number,
): VerifyResult {
  throw new Error("TODO: implement verifyJwt");
}
