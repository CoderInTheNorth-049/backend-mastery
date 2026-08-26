/**
 * Domain errors carry their own HTTP mapping so the transport layer stays a
 * dumb renderer. Codes double as stable machine-readable problem types.
 */
export class DomainError extends Error {
  constructor(
    readonly code: string,
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class BadRequestError extends DomainError {
  constructor(code: string, message: string) {
    super(code, 400, message);
  }
}

export class NotFoundError extends DomainError {
  constructor(code: string, message: string) {
    super(code, 404, message);
  }
}

export class ConflictError extends DomainError {
  constructor(code: string, message: string) {
    super(code, 409, message);
  }
}

/** RFC 6585: 402 Payment Required. */
export class PaymentDeclinedError extends DomainError {
  constructor(message = "The card was declined; the hold was released and the seats are free again.") {
    super("PAYMENT_DECLINED", 402, message);
  }
}

export class GoneError extends DomainError {
  constructor(code: string, message: string) {
    super(code, 410, message);
  }
}
