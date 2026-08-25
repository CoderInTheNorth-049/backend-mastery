import { describe, expect, it } from "vitest";
import {
  parseRequest,
  serializeResponse,
} from "./src/http-message";

describe("parseRequest", () => {
  it("parses a simple GET with CRLF endings", () => {
    const raw =
      "GET /hello HTTP/1.1\r\nHost: example.com\r\nAccept: */*\r\n\r\n";

    expect(parseRequest(raw)).toEqual({
      method: "GET",
      path: "/hello",
      query: {},
      version: "HTTP/1.1",
      headers: { host: "example.com", accept: "*/*" },
      body: "",
    });
  });

  it("tolerates bare-LF line endings", () => {
    const raw = "GET /a HTTP/1.1\nX-One: 1\n\n";
    const parsed = parseRequest(raw);
    expect(parsed.headers["x-one"]).toBe("1");
    expect(parsed.body).toBe("");
  });

  it("splits path and query, URL-decoding values (last duplicate wins)", () => {
    const raw =
      "GET /search?q=hello%20world&tag=a&tag=b&page=2 HTTP/1.1\r\n\r\n";
    const parsed = parseRequest(raw);

    expect(parsed.path).toBe("/search");
    expect(parsed.query).toEqual({
      q: "hello world",
      tag: "b",
      page: "2",
    });
  });

  it("lowercases header names; duplicate names keep the last value", () => {
    const raw =
      "POST /upload HTTP/1.1\r\n" +
      "Content-Type: text/plain\r\n" +
      "content-TYPE: application/json\r\n" +
      "Content-Length: 10\r\n" +
      "\r\n" +
      "raw-bytes!extra-junk";

    const parsed = parseRequest(raw);
    expect(parsed.method).toBe("POST");
    expect(parsed.headers).toEqual({ "content-type": "application/json", "content-length": "10" });
    expect(parsed.body).toBe("raw-bytes!");
  });

  it("truncates body exactly to Content-Length", () => {
    const raw =
      "PUT /items/7 HTTP/1.1\r\nContent-Length: 10\r\n\r\n{\"a\":true}TRAILING";
    expect(parseRequest(raw).body).toBe('{"a":true}');
  });

  it("throws on malformed start lines", () => {
    expect(() => parseRequest("GET /no-version\r\n\r\n")).toThrow(/malformed/i);
    expect(() => parseRequest("nonsense\r\n\r\n")).toThrow(/malformed/i);
  });
});

describe("serializeResponse", () => {
  it("emits status line, auto Content-Length and terminating blank line", () => {
    expect(serializeResponse({ status: 201, body: "ok" })).toBe(
      "HTTP/1.1 201 Created\r\nContent-Length: 2\r\n\r\nok",
    );
  });

  it("injects Content-Length: 0 for bodiless statuses that allow it", () => {
    expect(serializeResponse({ status: 200 })).toBe(
      "HTTP/1.1 200 OK\r\nContent-Length: 0\r\n\r\n",
    );
  });

  it("omits Content-Length for 204", () => {
    expect(serializeResponse({ status: 204 })).toBe(
      "HTTP/1.1 204 No Content\r\n\r\n",
    );
  });

  it("never overrides an explicit Content-Length", () => {
    const out = serializeResponse({
      status: 200,
      headers: { "Content-Length": "99" },
      body: "ab",
    });
    expect(out).toBe("HTTP/1.1 200 OK\r\nContent-Length: 99\r\n\r\nab");
    expect(out.match(/Content-Length/g)).toHaveLength(1);
  });

  it("uses Unknown for unmapped status codes", () => {
    expect(serializeResponse({ status: 599 }).startsWith("HTTP/1.1 599 Unknown\r\n")).toBe(true);
  });

  it("computes Content-Length in bytes, not characters", () => {
    // "héllo" is 6 bytes (é is 2) but 5 characters
    const out = serializeResponse({ status: 200, body: "héllo" });
    expect(out).toContain("Content-Length: 6\r\n");
  });

  it("writes caller headers verbatim before any injection", () => {
    const out = serializeResponse({
      status: 429,
      headers: { "Retry-After": "30", "X-Trace": "t-1" },
    });
    expect(out).toBe(
      "HTTP/1.1 429 Too Many Requests\r\nRetry-After: 30\r\nX-Trace: t-1\r\nContent-Length: 0\r\n\r\n",
    );
  });
});
