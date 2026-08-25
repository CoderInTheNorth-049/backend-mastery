// ── Part 1: raw HTTP/1.1 message handling ────────────────────────────────
// Implement per ../assignment.md. Do NOT rename exports.

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

export function parseRequest(raw: string): ParsedRequest {
  // TODO: implement
  throw new Error("TODO: implement parseRequest");
}

export function serializeResponse(input: ResponseInput): string {
  // TODO: implement
  throw new Error("TODO: implement serializeResponse");
}
