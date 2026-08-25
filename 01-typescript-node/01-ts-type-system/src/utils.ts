// ── Type-driven utilities ────────────────────────────────────────────────
// Implement per ../assignment.md. Do NOT rename exports.

export function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  throw new Error("TODO: implement pick");
}

export function omit<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  throw new Error("TODO: implement omit");
}

export function deepEqual(a: unknown, b: unknown): boolean {
  throw new Error("TODO: implement deepEqual");
}

export type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export const ok = <T, E = never>(value: T): Result<T, E> => {
  throw new Error("TODO: implement ok");
};

export const err = <T = never, E = never>(error: E): Result<T, E> => {
  throw new Error("TODO: implement err");
};

export function unwrapOr<T, E>(result: Result<T, E>, fallback: T): T {
  throw new Error("TODO: implement unwrapOr");
}

export class TypedEmitter<Events extends Record<string, unknown>> {
  on<K extends keyof Events>(
    _event: K,
    _listener: (payload: Events[K]) => void,
  ): () => void {
    throw new Error("TODO: implement on");
  }

  off<K extends keyof Events>(
    _event: K,
    _listener: (payload: Events[K]) => void,
  ): void {
    throw new Error("TODO: implement off");
  }

  emit<K extends keyof Events>(_event: K, _payload: Events[K]): boolean {
    throw new Error("TODO: implement emit");
  }
}
