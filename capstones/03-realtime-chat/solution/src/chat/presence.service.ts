import { Injectable } from "@nestjs/common";
import { PresenceRegistry } from "../domain/presence";

/** DI wrapper around the pure presence unit; the registry stays framework-free. */
@Injectable()
export class PresenceService {
  private readonly registry = new PresenceRegistry(() => Date.now());

  touch(userId: string): void {
    this.registry.touch(userId);
  }

  leave(userId: string): void {
    this.registry.leave(userId);
  }

  online(): string[] {
    return this.registry.online();
  }

  sweep(now: number = Date.now()): string[] {
    return this.registry.sweep(now);
  }
}
