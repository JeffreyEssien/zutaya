// Pure, dependency-free quantity helpers shared by client UI AND the server-side
// email templates. A line is "weight" only when it's a per_kg product with no
// sized variant chosen (a variant is a discrete unit). Mirrors the rule in
// lib/cartStore.ts `cartQuantityBounds`.
//
// `product` is typed `unknown` and narrowed internally so every line shape works
// (CartItem, Receipt's narrower ReceiptItem, email items, etc.).
interface QuantityLine {
  product?: unknown;
  variant?: { name?: string } | null;
}

function priceUnitOf(product: unknown): string | undefined {
  if (product && typeof product === "object" && "priceUnit" in product) {
    const pu = (product as { priceUnit?: unknown }).priceUnit;
    return typeof pu === "string" ? pu : undefined;
  }
  return undefined;
}

export function isWeightLine(item: QuantityLine): boolean {
  return priceUnitOf(item.product) === "per_kg" && !item.variant;
}

/** Display a line quantity with its unit: "2.5 kg" for weight, "2" otherwise. */
export function formatLineQuantity(item: QuantityLine & { quantity: number }): string {
  return isWeightLine(item) ? `${item.quantity} kg` : `${item.quantity}`;
}
