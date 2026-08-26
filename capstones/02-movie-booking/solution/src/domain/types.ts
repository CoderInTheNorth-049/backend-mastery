// Pure domain vocabulary: no framework or adapter imports here.

export type HoldState = "ACTIVE" | "CONFIRMED" | "EXPIRED" | "RELEASED";
export type BookingState = "CONFIRMED" | "PAYMENT_FAILED";
export type SeatStatus = "available" | "held" | "booked";

export interface Movie {
  id: string;
  title: string;
}

export interface Showing {
  id: string;
  movieId: string;
  startsAt: string; // ISO 8601
  rows: number;
  cols: number;
  seatRefs: string[]; // "A1".."E5", row-major
  priceCents: number; // flat per showing; per-seat categories would generalize this
}

export interface Hold {
  holdId: string;
  showingId: string;
  seatRefs: string[];
  userId: string;
  expiresAt: Date;
  state: HoldState;
}

export interface Booking {
  bookingId: string;
  holdId: string;
  seatRefs: string[];
  totalCents: number;
  idempotencyKey: string;
  state: BookingState;
}

export interface Clock {
  now(): Date;
}

export interface ChargeRequest {
  showingId: string;
  holdId: string;
  amountCents: number;
  idempotencyKey: string;
  cardNumber: string;
}

export interface ChargeResult {
  approved: boolean;
  declineReason?: string;
}

export interface PaymentGateway {
  charge(req: ChargeRequest): Promise<ChargeResult>;
}

/**
 * One transaction's worth of storage operations. Adapters guarantee that all
 * calls inside a single tx() run as one serialized critical section.
 */
export interface TxView {
  getShowing(showingId: string): Promise<Showing | undefined>;
  listMovies(): Promise<Movie[]>;
  listShowingsByMovie(movieId: string): Promise<Showing[]>;
  seatStates(showingId: string): Promise<Map<string, SeatStatus>>;
  createHold(hold: Hold): Promise<void>;
  getHold(holdId: string): Promise<Hold | undefined>;
  confirmHold(holdId: string): Promise<void>;
  releaseHold(holdId: string): Promise<void>;
  expireHolds(now: Date): Promise<number>;
  findBookingByIdempotencyKey(key: string): Promise<Booking | undefined>;
  createBooking(booking: Booking): Promise<void>;
  listActiveHolds(showingId: string): Promise<Hold[]>;
}

export interface BookingStore {
  /**
   * Runs fn inside one serialized transaction. If fn throws, nothing it did
   * after the last successful step is observable by later transactions
   * (memory adapter: single-flight chain; pg adapter: BEGIN/COMMIT/ROLLBACK).
   */
  tx<T>(fn: (tx: TxView) => Promise<T>): Promise<T>;
  isReady(): Promise<boolean>;
  close(): Promise<void>;
}
