"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem, Product, PrepOption } from "@/types";
import { validateCoupon } from "@/lib/queries";

interface CartStore {
    // ... existing types

    items: CartItem[];
    isOpen: boolean;
    discount: number; // Percentage (e.g., 20 for 20%)
    couponCode: string | null;
    open: () => void;
    close: () => void;
    toggle: () => void;
    addItem: (product: Product, variant?: CartItem["variant"], selectedPrepOptions?: PrepOption[]) => void;
    removeItem: (productId: string, variantName?: string) => void;
    updateQuantity: (productId: string, variantName: string | undefined, quantity: number) => void;
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

            addItem: (product, variant, selectedPrepOptions) => {
                set((state) => {
                    const existingItem = state.items.find(
                        (item) => item.product.id === product.id && item.variant?.name === variant?.name
                    );

                    // Specific variant stock takes precedence; fallback to product stock; default 0 if unknown
                    const availableStock = (variant?.stock !== undefined) ? variant.stock : product.stock;

                    if (existingItem) {
                        const newQuantity = existingItem.quantity + 1;
                        if (newQuantity > availableStock) {
                            // Using sonner for toast would require importing toast, but this is a hook/store.
                            // We can't easily use the hook here. 
                            // We'll console warn for now, and rely on the UI component to show toast if we return false?
                            // Zustand actions usually void.
                            // Let's just block it. The UI (ProductCard) usually checks disabled state.
                            // But for "add one more", we need feedback.
                            // We can use the global toast function if exported, or just fail silently as a safeguard.
                            // User demanded "he shouldnt even be able to add", so blocking is primary.
                            return {};
                        }
                        return {
                            items: state.items.map((item) =>
                                item.product.id === product.id && item.variant?.name === variant?.name
                                    ? { ...item, quantity: newQuantity }
                                    : item
                            ),
                        };
                    }

                    if (1 > availableStock) {
                        return {};
                    }

                    return { items: [...state.items, { product, variant, quantity: 1, selectedPrepOptions: selectedPrepOptions || undefined }] };
                });
            },

            removeItem: (productId, variantName) => {
                set((state) => ({
                    items: state.items.filter((item) => !(item.product.id === productId && item.variant?.name === variantName)),
                }));
            },

            updateQuantity: (productId, variantName, quantity) => {
                set((state) => {
                    return {
                        items: state.items.map((item) => {
                            if (item.product.id === productId && item.variant?.name === variantName) {
                                const stock = (item.variant && item.variant.stock !== undefined) ? item.variant.stock : item.product.stock;
                                const newQuantity = Math.min(Math.max(0, quantity), stock);
                                return { ...item, quantity: newQuantity };
                            }
                            return item;
                        }).filter((item) => item.quantity > 0),
                    };
                });
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

            total: () => {
                const sub = get().subtotal();
                const discountAmount = sub * (get().discount / 100);
                return Math.max(0, sub - discountAmount);
            },
        }),
        {
            name: "cart-storage",
        }
    )
);
