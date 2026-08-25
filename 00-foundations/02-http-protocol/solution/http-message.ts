export interface ParsedRequest {
  method: string;
  path: string;
  query: Record<string, string>;
  version: string;
  headers: Record<string, string>;
  body: string;
}

export interface ResponseInput {
  status: number;
  headers?: Record<string, string>;
  body?: string;
}

const STATUS_REASONS: Record<number, string> = {
  200: "OK",
  201: "Created",
  204: "No Content",
  301: "Moved Permanently",
  302: "Found",
  304: "Not Modified",
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  409: "Conflict",
  422: "Unprocessable Entity",
  429: "Too Many Requests",
  500: "Internal Server Error",
  502: "Bad Gateway",
  503: "Service Unavailable",
  504: "Gateway Timeout",
};

export function reasonFor(status: number): string {
  return STATUS_REASONS[status] ?? "Unknown";
}

const START_LINE = /^([A-Za-z]+)[ \t]+(\S+)[ \t]+HTTP\/(\d\.\d)$/;

function parseQuery(target: string): { path: string; query: Record<string, string> } {
  const qIndex = target.indexOf("?");
  if (qIndex === -1) return { path: target, query: {} };

  const query: Record<string, string> = {};
  for (const pair of target.slice(qIndex + 1).split("&")) {
    if (!pair) continue;
    const eq = pair.indexOf("=");
    const key = decodeURIComponent(eq === -1 ? pair : pair.slice(0, eq));
    const value = eq === -1 ? "" : decodeURIComponent(pair.slice(eq + 1));
    query[key] = value; // duplicates: last wins
  }
  return { path: target.slice(0, qIndex), query };
}

export function parseRequest(raw: string): ParsedRequest {
  const sep = raw.includes("\r\n\r\n") ? "\r\n\r\n" : "\n\n";
  const sepIndex = raw.indexOf(sep);
  const head = sepIndex === -1 ? raw : raw.slice(0, sepIndex);
  const rest = sepIndex === -1 ? "" : raw.slice(sepIndex + sep.length);

  const lines = head.split(/\r?\n/);
  const match = START_LINE.exec(lines[0] ?? "");
  if (!match) {
    throw new Error(`malformed request line: ${JSON.stringify(lines[0] ?? "")}`);
  }

  const [, method, target, versionNum] = match;
  const headers: Record<string, string> = {};
  for (const line of lines.slice(1)) {
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    headers[line.slice(0, colon).trim().toLowerCase()] = line.slice(colon + 1).trim();
  }

  let body = "";
  const contentLength = headers["content-length"];
  if (contentLength !== undefined) {
    const length = Number(contentLength);
    body = Number.isFinite(length) && length > 0 ? rest.slice(0, length) : "";
  }

  return {
    method: method.toUpperCase(),
    ...parseQuery(target),
    version: `HTTP/${versionNum}`,
    headers,
    body,
  };
}

export function serializeResponse(input: ResponseInput): string {
  const { status } = input;
  const headers = { ...input.headers };
  const body = input.body ?? "";

  if (status !== 204 && !Object.keys(headers).some((h) => h.toLowerCase() === "content-length")) {
    headers["Content-Length"] = String(Buffer.byteLength(body));
  }

  let out = `HTTP/1.1 ${status} ${reasonFor(status)}\r\n`;
  for (const [name, value] of Object.entries(headers)) {
    out += `${name}: ${value}\r\n`;
  }
  out += "\r\n";
  out += body;
  return out;
}
