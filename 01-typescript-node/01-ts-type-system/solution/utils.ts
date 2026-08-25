export function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in obj) result[key] = obj[key];
  }
  return result;
}

export function omit<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const excluded = new Set<unknown>(keys);
  const result = {} as Omit<T, K>;
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (!excluded.has(key)) {
      (result as Record<string, unknown>)[key] = value;
    }
  }
  return result;
}

export function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true; // covers NaN === NaN, and fast-primitive path

  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    return a.every((item, i) => deepEqual(item, b[i]));
  }

  if (typeof a === "object" && a !== null && typeof b === "object" && b !== null) {
    const aObj = a as Record<string, unknown>;
    const bObj = b as Record<string, unknown>;
    const aKeys = Object.keys(aObj);
    if (aKeys.length !== Object.keys(bObj).length) return false;
    return aKeys.every(
      (key) => Object.prototype.hasOwnProperty.call(bObj, key) && deepEqual(aObj[key], bObj[key]),
    );
  }

  return false;
}

export type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export const ok = <T, E = never>(value: T): Result<T, E> => ({ ok: true, value });

export const err = <T = never, E = never>(error: E): Result<T, E> => ({ ok: false, error });

export function unwrapOr<T, E>(result: Result<T, E>, fallback: T): T {
  return result.ok ? result.value : fallback;
}

interface Registration {
  /** stored as unknown so the public API keeps full type safety */
  fn: unknown;
}

export class TypedEmitter<Events extends Record<string, unknown>> {
  private listeners = new Map<keyof Events, Set<Registration>>();

  on<K extends keyof Events>(
    event: K,
    listener: (payload: Events[K]) => void,
  ): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    const registration: Registration = { fn: listener };
    set.add(registration);
    return () => {
      // remove exactly this registration (reference-counted duplicates)
      const current = this.listeners.get(event);
      if (!current) return;
      current.delete(registration);
      if (current.size === 0) this.listeners.delete(event);
    };
  }

  off<K extends keyof Events>(
    event: K,
    listener: (payload: Events[K]) => void,
  ): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const registration of set) {
      if (registration.fn === listener) {
        set.delete(registration);
        break; // remove only ONE registration per off() call
      }
    }
    if (set.size === 0) this.listeners.delete(event);
  }

  emit<K extends keyof Events>(event: K, payload: Events[K]): boolean {
    const set = this.listeners.get(event);
    if (!set || set.size === 0) return false;

    // Copy so listeners may subscribe/unsubscribe during dispatch safely.
    for (const { fn } of [...set]) {
      (fn as (payload: Events[K]) => void)(payload);
    }
    return true;
  }
}
