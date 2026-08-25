import { Readable, Transform } from "node:stream";
import { describe, expect, it } from "vitest";
import {
  ndjsonToObjects,
  parseNdjsonObjects,
  stringToLines,
} from "./src/ndjson";
import { batch } from "./src/batch";

function collect<T>(stream: Readable): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const out: T[] = [];
    stream.on("data", (chunk: T) => out.push(chunk));
    stream.on("end", () => resolve(out));
    stream.on("error", reject);
  });
}

describe("stringToLines", () => {
  it("splits simple newline-delimited input", async () => {
    const source = Readable.from(["a\nb\nc\n"]);
    const lines = await collect(source.pipe(stringToLines()));
    expect(lines).toEqual(["a", "b", "c"]);
  });

  it("handles CRLF endings", async () => {
    const lines = await collect(Readable.from(["a\r\nb\r\n"]).pipe(stringToLines()));
    expect(lines).toEqual(["a", "b"]);
  });

  it("reassembles records split across chunks (the boundary problem)", async () => {
    const source = Readable.from(["hel", "lo\nwor", "ld\nlast-no-newline"]);
    const lines = await collect(source.pipe(stringToLines()));
    expect(lines).toEqual(["hello", "world", "last-no-newline"]);
  });

  it("emits a final unterminated fragment on flush", async () => {
    const lines = await collect(Readable.from(["x\ny"]).pipe(stringToLines()));
    expect(lines).toEqual(["x", "y"]);
  });
});

describe("parseNdjsonObjects", () => {
  it("parses objects and skips empty/whitespace lines", async () => {
    const lines = Readable.from(['{"a":1}', "", "   ", '{"b":2}']);
    const objects = await collect(lines.pipe(parseNdjsonObjects()));
    expect(objects).toEqual([{ a: 1 }, { b: 2 }]);
  });

  it("rejects invalid JSON with a line number counting empties", async () => {
    // line 1 ok, line 2 empty, line 3 broken
    const lines = Readable.from(['{"ok":true}\n', "\n", "{broken}\n"]);

    await expect(collect(lines.pipe(stringToLines()).pipe(parseNdjsonObjects())))
      .rejects.toThrow(/line 3/);
  });
});

describe("ndjsonToObjects", () => {
  it("end-to-end happy path", async () => {
    const source = Readable.from(['{"id":1,"name":"ada"}\n{"id":2,"name":"grace"}\n']);
    const result = await ndjsonToObjects<{ id: number; name: string }>(source);
    expect(result).toEqual([
      { id: 1, name: "ada" },
      { id: 2, name: "grace" },
    ]);
  });

  it("survives adversarial chunk boundaries", async () => {
    const source = Readable.from([
      '{"na',
      'me":"split"}\n{"val',
      'ue":',
      'true}\n',
    ]);
    expect(await ndjsonToObjects(source)).toEqual([
      { name: "split" },
      { value: true },
    ]);
  });

  it("propagates parse errors through the pipeline", async () => {
    const source = Readable.from(["{}\n", "not-json\n"]);
    await expect(ndjsonToObjects(source)).rejects.toThrow(/line 2/);
  });

  it("processes 10k records with correct order (sanity/stress)", async () => {
    const payload = Array.from(
      { length: 10_000 },
      (_, i) => `{"n":${i}}\n`,
    ).join("");
    const result = await ndjsonToObjects<{ n: number }>(Readable.from([payload]));

    expect(result.length).toBe(10_000);
    expect(result[0]).toEqual({ n: 0 });
    expect(result[9_999]).toEqual({ n: 9_999 });
  }, 15_000);
});

describe("batch()", () => {
  it("groups into full batches plus a final partial one", async () => {
    const batches: number[][] = [];
    for await (const group of batch(Readable.from([1, 2, 3, 4, 5, 6, 7]), 3)) {
      batches.push(group);
    }
    expect(batches).toEqual([[1, 2, 3], [4, 5, 6], [7]]);
  });

  it("never yields an empty batch for empty input", async () => {
    const batches: unknown[][] = [];
    for await (const group of batch(Readable.from([]), 3)) {
      batches.push(group);
    }
    expect(batches).toEqual([]);
  });

  it("throws RangeError for non-positive sizes on first pull", async () => {
    const generator = batch(Readable.from([1]), 0);
    await expect(generator.next()).rejects.toThrow(RangeError);
  });

  it("works over plain async iterables, not only streams", async () => {
    async function* naturals(n: number) {
      for (let i = 1; i <= n; i++) yield i;
    }
    const batches: number[][] = [];
    for await (const group of batch(naturals(4), 2)) batches.push(group);
    expect(batches).toEqual([[1, 2], [3, 4]]);
  });
});
