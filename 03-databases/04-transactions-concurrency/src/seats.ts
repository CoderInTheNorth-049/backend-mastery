import type { Pool } from "pg";

export const DEADLOCK_CODE = "40P01";

export class DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export function withDeadlockRetry<T>(
  fn: () => Promise<T>,
  maxRetries?: number,
): Promise<T> {
  throw new Error("TODO: implement withDeadlockRetry");
}

export function reserveSeatPessimistic(
  pool: Pool,
  seatId: number,
  holder: string,
): Promise<boolean> {
  throw new Error("TODO: implement reserveSeatPessimistic");
}

export function reserveSeatOptimistic(
  pool: Pool,
  seatId: number,
  holder: string,
  maxRetries?: number,
): Promise<boolean> {
  throw new Error("TODO: implement reserveSeatOptimistic");
}

export function transferWithRetry(
  pool: Pool,
  fromId: number,
  toId: number,
  amountCents: number,
): Promise<void> {
  throw new Error("TODO: implement transferWithRetry");
}
