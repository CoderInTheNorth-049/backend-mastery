import type { ChargeRequest, ChargeResult, PaymentGateway } from "../domain/types";

const APPROVED_CARD = "4242424242424242";

/**
 * Deterministic fake PSP: only the classic Stripe test card approves, every
 * other card declines. No network, no latency, no flakes - decline drills are
 * reproducible.
 */
export class MemPaymentGateway implements PaymentGateway {
  async charge(req: ChargeRequest): Promise<ChargeResult> {
    const digits = req.cardNumber.replace(/\s+/g, "");
    if (digits === APPROVED_CARD) {
      return { approved: true };
    }
    return { approved: false, declineReason: "card_declined" };
  }
}
