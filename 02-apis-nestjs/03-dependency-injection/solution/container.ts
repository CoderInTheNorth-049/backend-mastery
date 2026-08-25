// This import activates Reflect.metadata — required by emitDecoratorMetadata.
import "reflect-metadata";

export type Constructor<T = object> = new (...args: any[]) => T;

const INJECTABLE_MARKER = Symbol("injectable");
const PARAM_TYPES_KEY = "design:paramtypes";

/** Marks a class as constructible by containers. */
export function Injectable(): ClassDecorator {
  return (target) => {
    Reflect.defineMetadata(INJECTABLE_MARKER, true, target);
  };
}

export function isInjectionToken(value: unknown): boolean {
  return (
    typeof value === "function" &&
    Reflect.getMetadata(INJECTABLE_MARKER, value) === true
  );
}

function describeToken(value: unknown): string {
  return typeof value === "function" && value.name ? value.name : String(value);
}

export class Container {
  private instances = new Map<Constructor<unknown>, unknown>();
  private resolving = new Set<Constructor<unknown>>();

  resolve<T>(token: Constructor<T>): T {
    const cached = this.instances.get(token);
    if (cached !== undefined) return cached as T;

    if (!isInjectionToken(token)) {
      throw new Error(
        `Cannot resolve '${describeToken(token)}': not marked @Injectable().`,
      );
    }

    if (this.resolving.has(token)) {
      const chain = [...this.resolving].map(describeToken).join(" -> ");
      throw new Error(
        `Circular dependency detected: ${chain} -> ${describeToken(token)}. Extract shared logic into a third provider instead.`,
      );
    }

    this.resolving.add(token);
    try {
      const paramTypes = (Reflect.getMetadata(PARAM_TYPES_KEY, token) ??
        []) as unknown[];

      const dependencies = paramTypes.map((param, index) => {
        // TS emits `Object` for parameters whose types don't survive
        // compilation (interfaces, unions, untyped).
        if (typeof param !== "function" || param === Object) {
          throw new Error(
            `Parameter #${index} of '${describeToken(token)}' cannot be reflected. Interfaces/unions are erased at runtime — inject via a class token.`,
          );
        }
        return this.resolve(param as Constructor);
      });

      const instance = new token(...dependencies);
      this.instances.set(token, instance);
      return instance;
    } finally {
      // ALWAYS clean up, so a failure leaves the container fully usable.
      this.resolving.delete(token);
    }
  }

  clear(): void {
    this.instances.clear();
  }
}
