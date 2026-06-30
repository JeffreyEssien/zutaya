import { describe, expect, it } from "vitest";
import { formatLineQuantity, isWeightLine } from "@/lib/quantity";
import type { CartItem, Product } from "@/types";

const weightProduct = { priceUnit: "per_kg" } as unknown as Product;
const unitProduct = { priceUnit: "per_piece" } as unknown as Product;

describe("isWeightLine / formatLineQuantity", () => {
  it("formats a weight line with the kg unit", () => {
    const item = { product: weightProduct, quantity: 2.5 } as CartItem;
    expect(isWeightLine(item)).toBe(true);
    expect(formatLineQuantity(item)).toBe("2.5 kg");
  });

  it("treats a per_kg line with a chosen variant as discrete units (no kg)", () => {
    const item = { product: weightProduct, variant: { name: "500g" }, quantity: 3 } as CartItem;
    expect(isWeightLine(item)).toBe(false);
    expect(formatLineQuantity(item)).toBe("3");
  });

  it("formats a unit line as a plain number", () => {
    const item = { product: unitProduct, quantity: 2 } as CartItem;
    expect(formatLineQuantity(item)).toBe("2");
  });
});
