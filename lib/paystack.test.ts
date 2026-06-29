import { describe, expect, it } from "vitest";
import {
  buildReference,
  customerProcessingFeeKobo,
  koboToNaira,
  nairaToKobo,
  parseReference,
  paystackFeeKobo,
} from "@/lib/paystack";

describe("currency helpers", () => {
  it("converts naira to kobo and back", () => {
    expect(nairaToKobo(45_000)).toBe(4_500_000);
    expect(koboToNaira(4_500_000)).toBe(45_000);
  });

  it("rounds fractional naira to whole kobo", () => {
    expect(nairaToKobo(19.99)).toBe(1999);
  });
});

describe("paystackFeeKobo", () => {
  it("waives the fee for transactions of ₦2,500 or less", () => {
    expect(paystackFeeKobo(250_000)).toBe(0);
  });

  it("applies 1.5% + ₦100 above the waiver threshold", () => {
    // ₦10,000 → 1.5% (₦150) + ₦100 = ₦250 → 25,000 kobo
    expect(paystackFeeKobo(1_000_000)).toBe(25_000);
  });

  it("caps the fee at ₦2,000", () => {
    // A huge transaction must not exceed the ₦2,000 (200,000 kobo) cap.
    expect(paystackFeeKobo(100_000_000)).toBe(200_000);
  });
});

describe("customerProcessingFeeKobo", () => {
  it("is zero when the underlying fee is waived", () => {
    expect(customerProcessingFeeKobo(200_000)).toBe(0);
  });

  it("converges so the customer pays roughly half the total fee", () => {
    const base = 1_000_000; // ₦10,000
    const customer = customerProcessingFeeKobo(base);
    const totalFee = paystackFeeKobo(base + customer);
    // Customer share should be about half of the fee on the grossed-up amount.
    expect(customer).toBeGreaterThan(0);
    expect(customer).toBeLessThanOrEqual(Math.ceil(totalFee / 2) + 1);
  });
});

describe("reference helpers", () => {
  it("builds an attempt-suffixed reference", () => {
    expect(buildReference("ZY-20260628-0001", 2)).toBe("ZY-20260628-0001-a2");
  });

  it("round-trips a reference back to order id + attempt", () => {
    expect(parseReference("ZY-20260628-0001-a3")).toEqual({
      orderId: "ZY-20260628-0001",
      attempt: 3,
    });
  });

  it("returns null for a malformed reference", () => {
    expect(parseReference("not-a-reference")).toBeNull();
  });
});
