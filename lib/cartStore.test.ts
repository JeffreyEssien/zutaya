import { beforeEach, describe, expect, it } from "vitest";
import { cartQuantityBounds, useCartStore } from "@/lib/cartStore";
import type { Product, ZutayaPackage } from "@/types";

// Minimal Product factory — only the fields the cart math reads.
function product(over: Partial<Product> = {}): Product {
  return {
    id: "p1",
    name: "Goat Meat",
    slug: "goat-meat",
    price: 10_000,
    stock: 5,
    images: [],
    variants: [],
    description: "",
    category: "",
    brand: "",
    isFeatured: false,
    isNew: false,
    ...over,
  } as unknown as Product;
}

// Minimal package factory — only the fields addPackageToCart/subtotal read.
function pkg(over: Partial<ZutayaPackage> = {}): ZutayaPackage {
  return {
    id: "pkg-db-1",
    name: "Starter Box",
    slug: "starter-box",
    price: 45_000,
    items: [
      { productId: "a", quantity: 1, label: "1kg goat" },
      { productId: "b", quantity: 1, label: "1kg beef" },
      { productId: "c", quantity: 2, label: "kidney" },
    ],
    ...over,
  } as unknown as ZutayaPackage;
}

beforeEach(() => {
  // Reset the persisted store to a clean slate before every test.
  useCartStore.setState({ items: [], discount: 0, couponCode: null, isOpen: false });
});

describe("standalone item pricing", () => {
  it("prices a line as price × quantity", () => {
    const s = useCartStore.getState();
    s.addItem(product({ price: 10_000 }));
    s.addItem(product({ price: 10_000 })); // merges → qty 2
    expect(useCartStore.getState().subtotal()).toBe(20_000);
  });

  it("prefers a variant price over the base product price", () => {
    const s = useCartStore.getState();
    s.addItem(product({ price: 10_000 }), { name: "500g", price: 6_000, stock: 10 });
    expect(useCartStore.getState().subtotal()).toBe(6_000);
  });

  it("never lets quantity exceed available stock", () => {
    const s = useCartStore.getState();
    const p = product({ price: 1_000, stock: 2 });
    s.addItem(p);
    s.addItem(p);
    s.addItem(p); // third add is refused — stock is 2
    const items = useCartStore.getState().items;
    expect(items[0].quantity).toBe(2);
    expect(useCartStore.getState().subtotal()).toBe(2_000);
  });

  it("refuses to add an out-of-stock product at all", () => {
    useCartStore.getState().addItem(product({ stock: 0 }));
    expect(useCartStore.getState().items).toHaveLength(0);
  });
});

describe("weight-priced items (decimal quantities)", () => {
  it("adds a chosen kg amount and prices it per kg", () => {
    // ₦4,000/kg × 2.5kg = ₦10,000
    useCartStore
      .getState()
      .addItem(
        product({ price: 4_000, stock: 50, priceUnit: "per_kg" }),
        undefined,
        undefined,
        undefined,
        undefined,
        2.5,
      );
    const items = useCartStore.getState().items;
    expect(items[0].quantity).toBe(2.5);
    expect(useCartStore.getState().subtotal()).toBe(10_000);
  });

  it("accumulates decimal weights on repeat adds", () => {
    const p = product({ price: 4_000, stock: 50, priceUnit: "per_kg" });
    useCartStore.getState().addItem(p, undefined, undefined, undefined, undefined, 1.5);
    useCartStore.getState().addItem(p, undefined, undefined, undefined, undefined, 2);
    expect(useCartStore.getState().items[0].quantity).toBe(3.5);
    expect(useCartStore.getState().subtotal()).toBe(14_000);
  });

  it("refuses to add more weight than is in stock", () => {
    useCartStore
      .getState()
      .addItem(
        product({ price: 4_000, stock: 2, priceUnit: "per_kg" }),
        undefined,
        undefined,
        undefined,
        undefined,
        2.5,
      );
    expect(useCartStore.getState().items).toHaveLength(0);
  });
});

describe("cartQuantityBounds", () => {
  it("uses 0.5 kg steps and the product's min for weight items", () => {
    const b = cartQuantityBounds({
      product: product({ priceUnit: "per_kg", minWeightKg: 2, stock: 30 }),
      variant: undefined,
    });
    expect(b).toMatchObject({ isWeight: true, step: 0.5, min: 2, max: 30, unit: "kg" });
  });

  it("caps the weight max at 50 kg even with more stock", () => {
    const b = cartQuantityBounds({
      product: product({ priceUnit: "per_kg", stock: 200 }),
      variant: undefined,
    });
    expect(b.max).toBe(50);
    expect(b.min).toBe(1); // falls back to global min when product min unset
  });

  it("uses whole steps and no unit for non-weight items", () => {
    const b = cartQuantityBounds({ product: product({ stock: 8 }), variant: undefined });
    expect(b).toMatchObject({ isWeight: false, step: 1, min: 1, max: 8, unit: "" });
  });
});

describe("adjustItemQuantity (kg-aware stepper)", () => {
  function addKg(over: Partial<Product>, qty: number) {
    useCartStore
      .getState()
      .addItem(
        product({ priceUnit: "per_kg", price: 4_000, stock: 50, ...over }),
        undefined,
        undefined,
        undefined,
        undefined,
        qty,
      );
  }

  it("steps a weight item up by 0.5 kg", () => {
    addKg({}, 1);
    useCartStore.getState().adjustItemQuantity("p1", undefined, 1);
    expect(useCartStore.getState().items[0].quantity).toBe(1.5);
  });

  it("removes the line when stepping below the minimum", () => {
    addKg({}, 1); // min is 1 kg
    useCartStore.getState().adjustItemQuantity("p1", undefined, -1);
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it("respects a product's own minWeightKg", () => {
    addKg({ minWeightKg: 2 }, 2);
    useCartStore.getState().adjustItemQuantity("p1", undefined, -1); // 1.5 < 2 → removed
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it("caps at available stock", () => {
    addKg({ stock: 2 }, 2);
    useCartStore.getState().adjustItemQuantity("p1", undefined, 1);
    expect(useCartStore.getState().items[0].quantity).toBe(2);
  });

  it("caps at the 50 kg max even with more stock", () => {
    addKg({ stock: 100 }, 49.5);
    useCartStore.getState().adjustItemQuantity("p1", undefined, 1);
    useCartStore.getState().adjustItemQuantity("p1", undefined, 1);
    expect(useCartStore.getState().items[0].quantity).toBe(50);
  });

  it("steps whole units and removes a unit item at 1", () => {
    useCartStore
      .getState()
      .addItem(product({ price: 1_000, stock: 5 }), undefined, undefined, undefined, undefined, 2);
    useCartStore.getState().adjustItemQuantity("p1", undefined, -1);
    expect(useCartStore.getState().items[0].quantity).toBe(1);
    useCartStore.getState().adjustItemQuantity("p1", undefined, -1);
    expect(useCartStore.getState().items).toHaveLength(0);
  });
});

describe("package flat-price math (the core invariant)", () => {
  it("charges the flat package price ONCE, not the sum of its lines", () => {
    useCartStore.getState().addPackageToCart(pkg({ price: 45_000 }), 1);
    const state = useCartStore.getState();
    // Three content lines were added...
    expect(state.items.filter((i) => i.packageId).length).toBe(3);
    // ...but subtotal is the single flat box price.
    expect(state.subtotal()).toBe(45_000);
  });

  it("multiplies the flat price by the number of boxes", () => {
    useCartStore.getState().addPackageToCart(pkg({ price: 45_000 }), 3);
    expect(useCartStore.getState().subtotal()).toBe(135_000);
  });

  it("scales each line's deducted quantity by the box count", () => {
    useCartStore.getState().addPackageToCart(pkg(), 2);
    const lines = useCartStore.getState().items;
    // Line "c" had quantity 2 per box × 2 boxes = 4 units to deduct.
    const kidney = lines.find((l) => l.product.name === "kidney");
    expect(kidney?.quantity).toBe(4);
    // Package lines carry a zero unit-price so they never double-count.
    expect(lines.every((l) => l.product.price === 0)).toBe(true);
  });

  it("sums two different packages independently", () => {
    const s = useCartStore.getState();
    s.addPackageToCart(pkg({ id: "x", price: 45_000 }), 1);
    s.addPackageToCart(pkg({ id: "y", price: 80_000 }), 1);
    expect(useCartStore.getState().subtotal()).toBe(125_000);
  });

  it("adds a package on top of standalone items", () => {
    const s = useCartStore.getState();
    s.addItem(product({ price: 10_000 }));
    s.addPackageToCart(pkg({ price: 45_000 }), 1);
    expect(useCartStore.getState().subtotal()).toBe(55_000);
  });
});

describe("removePackage", () => {
  it("removes every line belonging to that package group", () => {
    const s = useCartStore.getState();
    s.addPackageToCart(pkg(), 1);
    const packageId = useCartStore.getState().items[0].packageId;
    expect(packageId).toBeTruthy();
    useCartStore.getState().removePackage(packageId as string);
    expect(useCartStore.getState().items).toHaveLength(0);
  });

  it("leaves other items untouched", () => {
    const s = useCartStore.getState();
    s.addItem(product({ price: 10_000 }));
    s.addPackageToCart(pkg(), 1);
    const packageLine = useCartStore.getState().items.find((i) => i.packageId);
    expect(packageLine?.packageId).toBeTruthy();
    useCartStore.getState().removePackage(packageLine?.packageId as string);
    const left = useCartStore.getState().items;
    expect(left).toHaveLength(1);
    expect(left[0].packageId).toBeUndefined();
  });
});

describe("coupons stack on the subtotal", () => {
  it("applies a percentage discount in total()", () => {
    const s = useCartStore.getState();
    s.addPackageToCart(pkg({ price: 50_000 }), 1);
    useCartStore.setState({ discount: 20, couponCode: "SAVE20" });
    expect(useCartStore.getState().subtotal()).toBe(50_000);
    expect(useCartStore.getState().total()).toBe(40_000);
  });

  it("never produces a negative total", () => {
    const s = useCartStore.getState();
    s.addItem(product({ price: 1_000, stock: 1 }));
    useCartStore.setState({ discount: 100 });
    expect(useCartStore.getState().total()).toBe(0);
  });
});
