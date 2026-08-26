import type { Clock } from "../domain/ports";

export const SYSTEM_CLOCK: Clock = { now: () => Date.now() };
