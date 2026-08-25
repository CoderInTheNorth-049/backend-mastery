import { describe, expect, it } from "vitest";
import "reflect-metadata";
import { Container, Injectable } from "./src/container";

@Injectable()
class Logger {
  logs: string[] = [];
  info(message: string): void {
    this.logs.push(message);
  }
}

@Injectable()
class UserRepo {
  constructor(public logger: Logger) {}
}

@Injectable()
class UserService {
  constructor(
    public repo: UserRepo,
    public logger: Logger,
  ) {}
}

@Injectable()
class OtherService {
  constructor(public logger: Logger) {}
}

describe("Container.resolve", () => {
  it("constructs parameterless singletons", () => {
    const container = new Container();
    const a = container.resolve(Logger);
    const b = container.resolve(Logger);

    expect(a).toBeInstanceOf(Logger);
    expect(a).toBe(b);
  });

  it("injects dependencies recursively via reflected param types", () => {
    const container = new Container();
    const service = container.resolve(UserService);

    expect(service.repo).toBeInstanceOf(UserRepo);
    expect(service.repo.logger).toBeInstanceOf(Logger);
  });

  it("shares dependency instances across the whole graph", () => {
    const container = new Container();
    const service = container.resolve(UserService);
    const other = container.resolve(OtherService);

    expect(service.logger).toBe(other.logger);
    expect(service.repo.logger).toBe(service.logger);
  });

  it("rejects classes not marked @Injectable", () => {
    class Unmarked {}

    const container = new Container();
    expect(() => container.resolve(Unmarked)).toThrow(/Unmarked/);
    expect(() => container.resolve(Unmarked)).toThrow(/Injectable/);
  });

  it("detects circular dependencies naming both parties", () => {
    // True same-file circular type references hit TDZ at decoration time
    // (why NestJS ships forwardRef). We wire param types explicitly —
    // exactly what compiled output of a real circular graph looks like.
    @Injectable()
    class NodeA {
      constructor(_b: object) {}
    }

    @Injectable()
    class NodeB {
      constructor(_a: object) {}
    }

    Reflect.defineMetadata("design:paramtypes", [NodeB], NodeA);
    Reflect.defineMetadata("design:paramtypes", [NodeA], NodeB);

    const container = new Container();

    try {
      container.resolve(NodeA);
      expect.unreachable("should have thrown");
    } catch (error) {
      const message = (error as Error).message;
      expect(message).toMatch(/circular/i);
      expect(message).toMatch(/NodeA/);
      expect(message).toMatch(/NodeB/);
    }
  });

  it("stays usable on the same container after a circular failure", () => {
    @Injectable()
    class LoopX {
      constructor(_y: object) {}
    }

    @Injectable()
    class LoopY {
      constructor(_x: object) {}
    }

    Reflect.defineMetadata("design:paramtypes", [LoopY], LoopX);
    Reflect.defineMetadata("design:paramtypes", [LoopX], LoopY);

    const container = new Container();
    expect(() => container.resolve(LoopX)).toThrow(/circular/i);

    // The failure left no corrupted state behind.
    expect(container.resolve(Logger)).toBeInstanceOf(Logger);
  });

  it("clear() resets the singleton cache", () => {
    const container = new Container();
    const first = container.resolve(Logger);
    container.clear();
    const second = container.resolve(Logger);

    expect(first).not.toBe(second);
  });
});
