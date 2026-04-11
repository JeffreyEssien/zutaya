"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem, Product, PrepOption } from "@/types";
import { validateCoupon } from "@/lib/queries";

interface BundleEntry {
    productId: string;
    quantity: number;
    prepOptions?: PrepOption[];
}

interface CartStore {
    items: CartItem[];
    isOpen: boolean;
    discount: number; // Coupon percentage (e.g., 20 for 20%)
    couponCode: string | null;
    open: () => void;
    close: () => void;
    toggle: () => void;
    addItem: (product: Product, variant?: CartItem["variant"], selectedPrepOptions?: PrepOption[]) => void;
    addBundleToCart: (products: Product[], entries: BundleEntry[], discountPercent: number, bundleName: string) => void;
    removeItem: (productId: string, variantName?: string, bundleId?: string) => void;
    updateQuantity: (productId: string, variantName: string | undefined, quantity: number, bundleId?: string) => void;
    clearCart: () => void;
    totalItems: () => number;
    applyCoupon: (code: string) => Promise<boolean>;
    removeCoupon: () => void;
    subtotal: () => number;
    bundleDiscountTotal: () => number;
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

            addItem: (product, variant, selectedPrepOptions) => {
                set((state) => {
                    // Only merge with non-bundle items of the same product
                    const existingItem = state.items.find(
                        (item) => item.product.id === product.id && item.variant?.name === variant?.name && !item.bundleId
                    );

                    const availableStock = (variant?.stock !== undefined) ? variant.stock : product.stock;

                    if (existingItem) {
                        const newQuantity = existingItem.quantity + 1;
                        if (newQuantity > availableStock) return {};
                        return {
                            items: state.items.map((item) =>
                                item === existingItem
                                    ? { ...item, quantity: newQuantity }
                                    : item
                            ),
                        };
                    }

                    if (1 > availableStock) return {};

                    return { items: [...state.items, { product, variant, quantity: 1, selectedPrepOptions: selectedPrepOptions || undefined }] };
                });
            },

            addBundleToCart: (products, entries, discountPercent, bundleName) => {
                const bundleId = `bundle-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
                set((state) => {
                    const bundleItems: CartItem[] = entries
                        .filter((e) => e.quantity > 0)
                        .map((entry) => {
                            const product = products.find((p) => p.id === entry.productId);
                            if (!product) return null;
                            return {
                                product,
                                quantity: entry.quantity,
                                selectedPrepOptions: entry.prepOptions && entry.prepOptions.length > 0 ? entry.prepOptions : undefined,
                                bundleId,
                                bundleDiscount: discountPercent,
                                bundleName,
                            } as CartItem;
                        })
                        .filter(Boolean) as CartItem[];

                    return { items: [...state.items, ...bundleItems] };
                });
            },

            removeItem: (productId, variantName, bundleId) => {
                set((state) => {
                    if (bundleId) {
                        // Remove entire bundle group
                        return { items: state.items.filter((item) => item.bundleId !== bundleId) };
                    }
                    return {
                        items: state.items.filter((item) => !(item.product.id === productId && item.variant?.name === variantName && !item.bundleId)),
                    };
                });
            },

            updateQuantity: (productId, variantName, quantity, bundleId) => {
                set((state) => ({
                    items: state.items.map((item) => {
                        if (item.product.id === productId && item.variant?.name === variantName && item.bundleId === bundleId) {
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

            subtotal: () => {
                const { items } = get();
                return items.reduce((total, item) => {
                    const price = item.variant?.price || item.product.price;
                    return total + price * item.quantity;
                }, 0);
            },

            bundleDiscountTotal: () => {
                const { items } = get();
                // Group items by bundleId and calculate per-bundle discounts
                const bundleGroups = new Map<string, { subtotal: number; discount: number }>();
                for (const item of items) {
                    if (item.bundleId && item.bundleDiscount) {
                        const price = item.variant?.price || item.product.price;
                        const itemTotal = price * item.quantity;
                        const existing = bundleGroups.get(item.bundleId) || { subtotal: 0, discount: item.bundleDiscount };
                        existing.subtotal += itemTotal;
                        bundleGroups.set(item.bundleId, existing);
                    }
                }
                let totalDiscount = 0;
                for (const group of bundleGroups.values()) {
                    totalDiscount += group.subtotal * (group.discount / 100);
                }
                return totalDiscount;
            },

            total: () => {
                const sub = get().subtotal();
                const bundleDisc = get().bundleDiscountTotal();
                const couponDisc = (sub - bundleDisc) * (get().discount / 100); // Coupon applies after bundle discounts
                return Math.max(0, sub - bundleDisc - couponDisc);
            },
        }),
        {
            name: "cart-storage",
        }
    )
);
