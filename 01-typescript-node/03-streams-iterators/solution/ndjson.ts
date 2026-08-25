import { pipeline } from "node:stream/promises";
import { Transform, type Readable } from "node:stream";

/**
 * Reassemble arbitrary string chunks into whole lines (\n or \r\n).
 * A trailing fragment without a newline is held back until more input
 * arrives (or flush), which is exactly why chunk boundaries stay invisible.
 */
export function stringToLines(): Transform {
  let buffer = "";

  return new Transform({
    // Object mode on the readable side keeps lines as JS strings AND lets
    // empty strings ('') survive — byte-mode silently drops them.
    readableObjectMode: true,
    transform(chunk, _enc, cb) {
      buffer += typeof chunk === "string" ? chunk : chunk.toString();

      const lastNewline = buffer.lastIndexOf("\n");
      if (lastNewline === -1) return cb();

      const complete = buffer.slice(0, lastNewline);
      buffer = buffer.slice(lastNewline + 1);

      // Normalize AFTER slicing: interior CRLFs become LF, and a segment
      // whose CRLF's \r precedes the consumed \n loses its stray \r.
      let normalized = complete.replace(/\r\n/g, "\n");
      if (normalized.endsWith("\r")) normalized = normalized.slice(0, -1);

      for (const line of normalized.split("\n")) {
        this.push(line);
      }
      cb();
    },

    flush(cb) {
      let rest = buffer;
      if (rest.endsWith("\r")) rest = rest.slice(0, -1);
      if (rest.trim().length > 0) this.push(rest);
      cb();
    },
  });
}

/**
 * Parse NDJSON lines into JS values.
 * Empty/whitespace lines are skipped BUT still counted toward the
 * 1-based line numbers used in error messages.
 */
export function parseNdjsonObjects(): Transform {
  let lineNumber = 0;

  return new Transform({
    // Input: line strings from stringToLines (object mode).
    // Output: parsed values (object mode).
    writableObjectMode: true,
    readableObjectMode: true,
    transform(line, _enc, cb) {
      lineNumber++;
      const text = String(line).trim();
      if (text === "") return cb();

      try {
        this.push(JSON.parse(text));
        cb();
      } catch (cause) {
        cb(new Error(`Invalid NDJSON on line ${lineNumber}: ${(cause as Error).message}`));
      }
    },
  });
}

/** Convenience end-to-end: bytes in, objects out. Rejects on any stage error. */
export async function ndjsonToObjects<T = unknown>(source: Readable): Promise<T[]> {
  const objects: T[] = [];

  await pipeline(
    source,
    stringToLines(),
    parseNdjsonObjects(),
    // eslint-disable-next-line require-yield -- terminal sink collects; nothing downstream
    async function* sink(lines) {
      for await (const value of lines) {
        objects.push(value as T);
      }
    },
  );

  return objects;
}
