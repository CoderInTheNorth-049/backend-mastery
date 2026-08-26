import type { INestApplication } from "@nestjs/common";
import { FakeClock } from "../../src/infra/clocks";
import { MemoryBookingStore } from "../../src/infra/memory-booking-store";
import { MemPaymentGateway } from "../../src/infra/payment-gateway";
import type { PaymentGateway } from "../../src/domain/types";
import { buildApp } from "../../src/app";

export const TTL_MS = 600_000;
export const START_ISO = "2026-08-26T12:00:00.000Z";

export function makeClock(): FakeClock {
  return new FakeClock(START_ISO);
}

/** Wraps the deterministic gateway so tests can assert how often money moved. */
export class CountingPaymentGateway implements PaymentGateway {
  calls = 0;

  private readonly inner = new MemPaymentGateway();

  async charge(req: Parameters<PaymentGateway["charge"]>[0]) {
    this.calls += 1;
    return this.inner.charge(req);
  }
}

export interface Rig {
  app: INestApplication;
  clock: FakeClock;
  store: MemoryBookingStore;
  gateway: CountingPaymentGateway;
  /** Pre-bound base URL so concurrent supertest calls never fight over listen(). */
  url: string;
}

/** Boots the real HTTP stack over the in-memory adapters; sweep stays manual. */
export async function bootHttp(overrides: { clock?: FakeClock; holdTtlMs?: number } = {}): Promise<Rig> {
  const clock = overrides.clock ?? makeClock();
  const store = new MemoryBookingStore(clock);
  const gateway = new CountingPaymentGateway();
  const app = await buildApp({
    clock,
    store,
    paymentGateway: gateway,
    holdTtlMs: overrides.holdTtlMs ?? TTL_MS,
    autoStartSweep: false,
    logLevel: "silent",
  });
  const server = app.getHttpServer();
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  if (typeof address !== "object" || !address) {
    throw new Error("http server did not report an address");
  }
  return { app, clock, store, gateway, url: `http://127.0.0.1:${address.port}` };
}

export async function drain(rig: Rig): Promise<void> {
  await rig.app.close();
}
