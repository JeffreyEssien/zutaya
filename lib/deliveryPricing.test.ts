import { describe, expect, it } from "vitest";
import {
  applyDiscount,
  fuzzyMatchLagosArea,
  getAllLagosAreas,
  LAGOS_ZONES,
  lookupLagosZone,
} from "@/lib/deliveryPricing";

describe("lookupLagosZone", () => {
  it("resolves a known area to its zone and fee", () => {
    const zone = lookupLagosZone("Lekki Phase 1");
    expect(zone?.key).toBe("lagos_island");
    expect(zone?.fee).toBe(5000);
  });

  it("is case-insensitive", () => {
    expect(lookupLagosZone("lekki phase 1")?.key).toBe("lagos_island");
    expect(lookupLagosZone("IKEJA")?.key).toBe("lagos_mainland");
  });

  it("returns null for an area in no zone", () => {
    expect(lookupLagosZone("Abuja")).toBeNull();
    expect(lookupLagosZone("")).toBeNull();
  });
});

describe("fuzzyMatchLagosArea", () => {
  it("returns null for blank input", () => {
    expect(fuzzyMatchLagosArea("   ")).toBeNull();
  });

  it("prefers an exact match and echoes the canonical area name", () => {
    const m = fuzzyMatchLagosArea("eti-osa");
    expect(m?.area).toBe("Eti-Osa");
    expect(m?.zone.key).toBe("lagos_island");
  });

  it("falls back to a starts-with match before a contains match", () => {
    // "lekki" starts "Lekki Phase 1" — should win over any substring match.
    const m = fuzzyMatchLagosArea("lekki");
    expect(m?.area).toBe("Lekki Phase 1");
  });

  it("uses a contains match when nothing starts with the needle", () => {
    // "phase" appears inside "Lekki Phase 1" but starts nothing.
    const m = fuzzyMatchLagosArea("phase");
    expect(m?.area).toBe("Lekki Phase 1");
  });

  it("returns null when there is no match at all", () => {
    expect(fuzzyMatchLagosArea("zzzznotreal")).toBeNull();
  });
});

describe("applyDiscount", () => {
  it("leaves the fee unchanged for a zero or negative discount", () => {
    expect(applyDiscount(5000, 0)).toBe(5000);
    expect(applyDiscount(5000, -10)).toBe(5000);
  });

  it("leaves the fee unchanged for a discount above 100%", () => {
    expect(applyDiscount(5000, 150)).toBe(5000);
  });

  it("applies a valid percentage and rounds to the nearest naira", () => {
    expect(applyDiscount(5000, 20)).toBe(4000);
    expect(applyDiscount(3500, 10)).toBe(3150);
    // 5000 * (1 - 0.33) = 3350
    expect(applyDiscount(5000, 33)).toBe(3350);
  });

  it("a 100% discount makes delivery free", () => {
    expect(applyDiscount(6000, 100)).toBe(0);
  });
});

describe("zone data integrity", () => {
  it("every area maps back to exactly one zone", () => {
    const all = getAllLagosAreas();
    for (const { area, zone } of all) {
      expect(lookupLagosZone(area)?.key).toBe(zone.key);
    }
  });

  it("has no duplicate area across zones", () => {
    const seen = new Set<string>();
    for (const zone of LAGOS_ZONES) {
      for (const area of zone.areas) {
        const k = area.toLowerCase();
        expect(seen.has(k), `duplicate area: ${area}`).toBe(false);
        seen.add(k);
      }
    }
  });
});
