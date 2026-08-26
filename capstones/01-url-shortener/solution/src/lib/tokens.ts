/**
 * DI tokens. Explicit symbol injection keeps constructor metadata out of the
 * picture entirely, so decorator transforms stay simple and providers can be
 * swapped at the composition root.
 */
export const CLOCK = Symbol("clock");
export const LINK_STORE = Symbol("link-store");
export const CLICK_STORE = Symbol("click-store");
export const CACHE_STORE = Symbol("cache-store");
export const CLICK_QUEUE = Symbol("click-queue");
export const QUEUE_DEPTH = Symbol("queue-depth");
export const METRICS = Symbol("metrics");
