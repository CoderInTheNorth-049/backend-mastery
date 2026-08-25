import { describe, expect, it } from "vitest";
import { verifyContract } from "./src/api-client";
import { chargeContract, chargeResponses } from "./src/fixtures";

describe("verifyContract — tolerant reader", () => {
  it("accepts a fully conformant response", () => {
    expect(verifyContract(chargeResponses.happy, chargeContract)).toEqual({ ok: true });
  });

  it("ignores unknown extra fields (providers may evolve)", () => {
    expect(verifyContract(chargeResponses.extraFieldsOk, chargeContract)).toEqual({ ok: true });
  });

  it("reports status mismatches with exact formatting", () => {
    const result = verifyContract(chargeResponses.wrongStatus, chargeContract);
    expect(result).toEqual({
      ok: false,
      violations: ["status: expected 201, got 202"],
    });
  });

  it("reports type violations on dotted paths", () => {
    const result = verifyContract(chargeResponses.amountAsString, chargeContract);
    expect(result).toEqual({
      ok: false,
      violations: ["body.amount_cents: expected number, got string"],
    });
  });

  it("reports missing required fields inside nested objects", () => {
    const result = verifyContract(chargeResponses.missingEmail, chargeContract);
    expect(result).toEqual({
      ok: false,
      violations: ["body.customer.email: missing"],
    });
  });

  it("collects ALL violations in contract-declaration order", () => {
    const result = verifyContract(
      { status: 500, body: { id: 9, amount_cents: null, customer: {} } },
      chargeContract,
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.violations).toEqual([
        "status: expected 201, got 500",
        "body.id: expected string, got number",
        "body.status: missing",
        "body.amount_cents: missing", // null counts as missing (see test above)
        "body.currency: missing",
        "body.customer.id: missing",
        "body.customer.email: missing",
      ]);
    }
  });

  it("treats null as missing for required fields", () => {
    const result = verifyContract(
      { status: 201, body: { id: "ch_1", status: null, amount_cents: 1, currency: "usd", customer: { id: 1, email: "e@x.io" } } },
      chargeContract,
    );
    expect(result).toEqual({ ok: false, violations: ["body.status: missing"] });
  });
});
