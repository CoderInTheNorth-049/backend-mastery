import { Transform, type Readable } from "node:stream";

export function stringToLines(): Transform {
  throw new Error("TODO: implement stringToLines");
}

export function parseNdjsonObjects(): Transform {
  throw new Error("TODO: implement parseNdjsonObjects");
}

export async function ndjsonToObjects<T = unknown>(source: Readable): Promise<T[]> {
  throw new Error("TODO: implement ndjsonToObjects");
}
