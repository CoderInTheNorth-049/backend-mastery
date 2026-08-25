// This import activates Reflect.metadata — required by emitDecoratorMetadata.
import "reflect-metadata";

export type Constructor<T = object> = new (...args: any[]) => T;

const INJECTABLE_MARKER = Symbol("injectable");

export function Injectable(): ClassDecorator {
  throw new Error("TODO: implement Injectable");
}

export function isInjectionToken(value: unknown): boolean {
  throw new Error("TODO: implement isInjectionToken");
}

export class Container {
  resolve<T>(token: Constructor<T>): T {
    throw new Error("TODO: implement resolve");
  }

  clear(): void {
    throw new Error("TODO: implement clear");
  }
}
