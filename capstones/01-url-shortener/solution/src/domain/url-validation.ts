export const MAX_URL_LENGTH = 2048;

export type UrlValidation =
  | { ok: true; url: string }
  | { ok: false; reason: string };

/**
 * Creation-time URL validation. Scheme allowlisting (http/https only) is the
 * core SSRF control here: javascript:, data:, file: etc. can never leave as a
 * Location header. A production build would additionally resolve the host and
 * block private/loopback IP ranges before persisting - noted as a documented
 * simplification in the README decisions table.
 */
export function validateTargetUrl(raw: unknown): UrlValidation {
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return { ok: false, reason: "url must be a non-empty string" };
  }
  const candidate = raw.trim();
  if (candidate.length > MAX_URL_LENGTH) {
    return { ok: false, reason: `url must not exceed ${MAX_URL_LENGTH} characters` };
  }
  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return { ok: false, reason: "url must be an absolute URL" };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, reason: "url scheme must be http or https" };
  }
  if (parsed.hostname.length === 0) {
    return { ok: false, reason: "url must include a host" };
  }
  // Echo back the normalized form the URL parser produced.
  return { ok: true, url: parsed.toString() };
}
