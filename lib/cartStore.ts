"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem, Product, PrepOption, CartItemProcessing, ZutayaPackage } from "@/types";
import { validateCoupon } from "@/lib/queries";

interface CartStore {
    items: CartItem[];
    isOpen: boolean;
    discount: number; // Coupon percentage (e.g., 20 for 20%)
    couponCode: string | null;
    open: () => void;
    close: () => void;
    toggle: () => void;
    addItem: (product: Product, variant?: CartItem["variant"], selectedPrepOptions?: PrepOption[], processing?: CartItemProcessing, completionMode?: CartItem["completionMode"], quantity?: number) => void;
    addPackageToCart: (pkg: ZutayaPackage, boxes?: number) => void;
    removeItem: (productId: string, variantName?: string, bundleId?: string) => void;
    removePackage: (packageId: string) => void;
    updateQuantity: (productId: string, variantName: string | undefined, quantity: number, bundleId?: string) => void;
    clearCart: () => void;
    totalItems: () => number;
    applyCoupon: (code: string) => Promise<boolean>;
    removeCoupon: () => void;
    subtotal: () => number;
    total: () => number;
}

export const useCartStore = create<CartStore>()(
    persist(
        (set, get) => ({
            items: [],
            isOpen: false,
            discount: 0,
            couponCode: null,

            open: () => set({ isOpen: true }),
            close: () => set({ isOpen: false }),
            toggle: () => set((s) => ({ isOpen: !s.isOpen })),

            addItem: (product, variant, selectedPrepOptions, processing, completionMode, quantity = 1) => {
                set((state) => {
                    // Weight-priced products carry decimal kg quantities; everything
                    // else is whole units. Never let a line drop below the amount asked.
                    const addQty = quantity > 0 ? quantity : 1;
                    const hasProcessing = processing && Object.keys(processing).length > 0;
                    // Only merge with non-grouped items of the same product without custom processing
                    const existingItem = state.items.find(
                        (item) => item.product.id === product.id && item.variant?.name === variant?.name && !item.bundleId && !item.packageId && !item.processing && !hasProcessing
                    );

                    const availableStock = (variant?.stock !== undefined) ? variant.stock : product.stock;

                    if (existingItem) {
                        const newQuantity = existingItem.quantity + addQty;
                        if (newQuantity > availableStock) return {};
                        return {
                            items: state.items.map((item) =>
                                item === existingItem
                                    ? { ...item, quantity: newQuantity }
                                    : item
                            ),
                        };
                    }

                    if (addQty > availableStock) return {};

                    return { items: [...state.items, { product, variant, quantity: addQty, selectedPrepOptions: selectedPrepOptions || undefined, processing: hasProcessing ? processing : undefined, completionMode: completionMode || "cook_myself" }] };
                });
            },

            // Add a curated Zútaya Package as a grouped set of line items. Each line
            // carries the real product id + variant/inventory so stock auto-deducts at
            // checkout, while the group is charged the package's flat price.
            addPackageToCart: (pkg, boxes = 1) => {
                const qtyBoxes = Math.max(1, Math.floor(boxes));
                const packageId = `pkg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
                set((state) => {
                    const lines: CartItem[] = pkg.items
                        .filter((it) => it.productId && it.quantity > 0)
                        .map((it) => {
                            // Minimal Product shape — only the fields the cart/order/stock path reads.
                            const product = {
                                id: it.productId as string,
                                name: it.label || it.productName || "Package item",
                                slug: it.productSlug || "",
                                price: 0,
                                images: it.productImage ? [it.productImage] : [],
                                inventoryId: it.inventoryItemId || undefined,
                                variants: [],
                                stock: Number.MAX_SAFE_INTEGER,
                                description: "",
                                category: "",
                                brand: "",
                                isFeatured: false,
                                isNew: false,
                            } as unknown as Product;
                            return {
                                product,
                                variant: it.variantName ? { name: it.variantName } : undefined,
                                quantity: it.quantity * qtyBoxes,
                                packageId,
                                packageName: pkg.name,
                                packagePrice: pkg.price,
                                packageBoxes: qtyBoxes,
                            } as CartItem;
                        });
                    if (lines.length === 0) return {};
                    return { items: [...state.items, ...lines] };
                });
            },

            removeItem: (productId, variantName, bundleId) => {
                set((state) => {
                    if (bundleId) {
                        return { items: state.items.filter((item) => item.bundleId !== bundleId) };
                    }
                    return {
                        items: state.items.filter((item) => !(item.product.id === productId && item.variant?.name === variantName && !item.bundleId && !item.packageId)),
                    };
                });
            },

            removePackage: (packageId) => {
                set((state) => ({ items: state.items.filter((item) => item.packageId !== packageId) }));
            },

            updateQuantity: (productId, variantName, quantity, bundleId) => {
                set((state) => ({
                    items: state.items.map((item) => {
                        if (item.product.id === productId && item.variant?.name === variantName && item.bundleId === bundleId && !item.packageId) {
                            const stock = (item.variant && item.variant.stock !== undefined) ? item.variant.stock : item.product.stock;
                            const newQuantity = Math.min(Math.max(0, quantity), stock);
                            return { ...item, quantity: newQuantity };
                        }
                        return item;
                    }).filter((item) => item.quantity > 0),
                }));
            },

            clearCart: () => set({ items: [], discount: 0, couponCode: null }),

            totalItems: () => get().items.reduce((s, i) => s + i.quantity, 0),

            applyCoupon: async (code: string) => {
                try {
                    const coupon = await validateCoupon(code);
                    if (coupon) {
                        set({ discount: coupon.discountPercent, couponCode: coupon.code });
                        return true;
                    }
                } catch (error) {
                    console.error(error);
                }
                return false;
            },

            removeCoupon: () => set({ discount: 0, couponCode: null }),

            // Standalone items priced per-line; each package group contributes its
            // flat price once (price-per-box × boxes), not the sum of its lines.
            subtotal: () => {
                const { items } = get();
                const seenPackages = new Set<string>();
                let sum = 0;
                for (const item of items) {
                    if (item.packageId) {
                        if (seenPackages.has(item.packageId)) continue;
                        seenPackages.add(item.packageId);
                        sum += (item.packagePrice || 0) * (item.packageBoxes || 1);
                    } else {
                        const price = item.variant?.price || item.product.price;
                        sum += price * item.quantity;
                    }
                }
                return sum;
            },

            total: () => {
                const sub = get().subtotal();
                const couponDisc = sub * (get().discount / 100);
                return Math.max(0, sub - couponDisc);
            },
        }),
        {
            name: "cart-storage",
        }
    )
);
