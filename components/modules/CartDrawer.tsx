"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useCartStore } from "@/lib/cartStore";
import { formatCurrency } from "@/lib/formatCurrency";
import Button from "@/components/ui/Button";
import { X, Minus, Plus, Trash2, ShoppingBag, ArrowRight, Truck, Package } from "lucide-react";
import type { CartItem } from "@/types";

export default function CartDrawer() {
    const { items, isOpen, close, subtotal, discount, couponCode, bundleDiscountTotal, total } = useCartStore();
    const sub = subtotal();
    const bundleDisc = bundleDiscountTotal();
    const couponDisc = discount > 0 ? (sub - bundleDisc) * (discount / 100) : 0;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        onClick={close}
                        className="fixed inset-0 z-[55] bg-black/30 backdrop-blur-sm"
                    />
                    <motion.aside
                        initial={{ x: "100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", damping: 28, stiffness: 280 }}
                        className="fixed inset-y-0 right-0 z-[60] w-full max-w-md bg-white shadow-2xl flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-5 border-b border-brand-lilac/10">
                            <div className="flex items-center gap-3">
                                <ShoppingBag size={18} className="text-brand-purple" />
                                <h2 className="font-serif text-lg text-brand-dark">Cart</h2>
                                <span className="bg-brand-purple/10 text-brand-purple text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                                    {items.length}
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={close}
                                className="p-2 hover:bg-neutral-100 rounded-full transition-colors cursor-pointer"
                                aria-label="Close cart"
                            >
                                <X size={18} className="text-brand-dark/50" />
                            </button>
                        </div>

                        {/* Delivery info banner */}
                        {items.length > 0 && (
                            <div className="px-6 py-3 bg-gradient-to-r from-brand-lilac/[0.03] to-brand-purple/[0.03] border-b border-brand-lilac/8">
                                <p className="text-xs text-brand-dark/40 flex items-center gap-2">
                                    <Truck size={13} className="text-brand-purple shrink-0" />
                                    Delivery fee is calculated at checkout based on your location
                                </p>
                            </div>
                        )}

                        {/* Items */}
                        <div className="flex-1 overflow-y-auto px-6 py-4">
                            {items.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                                    <div className="p-5 bg-neutral-50 rounded-full mb-5">
                                        <ShoppingBag size={28} className="text-brand-dark/15" />
                                    </div>
                                    <p className="text-brand-dark/40 mb-1 font-medium">Your cart is empty</p>
                                    <p className="text-xs text-brand-dark/25 mb-6">Browse our collection and add items</p>
                                    <Link href="/shop" onClick={close}>
                                        <Button variant="outline" size="sm">
                                            <span className="flex items-center gap-1.5">Start Shopping <ArrowRight size={14} /></span>
                                        </Button>
                                    </Link>
                                </div>
                            ) : (
                                <CartItems />
                            )}
                        </div>

                        {/* Footer */}
                        {items.length > 0 && (
                            <div className="border-t border-brand-lilac/10 px-6 py-5 space-y-3 bg-neutral-50/30">
                                <div className="flex justify-between text-sm text-brand-dark/50">
                                    <span>Subtotal</span>
                                    <span className="font-medium text-brand-dark">{formatCurrency(sub)}</span>
                                </div>
                                {bundleDisc > 0 && (
                                    <div className="flex justify-between text-sm text-emerald-600">
                                        <span>Bundle Discount</span>
                                        <span className="font-medium">-{formatCurrency(bundleDisc)}</span>
                                    </div>
                                )}
                                {couponDisc > 0 && (
                                    <div className="flex justify-between text-sm text-emerald-600">
                                        <span>Coupon ({couponCode})</span>
                                        <span className="font-medium">-{formatCurrency(couponDisc)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-sm text-brand-dark/50">
                                    <span>Shipping</span>
                                    <span className="text-xs text-brand-dark/30 italic">Calculated at checkout</span>
                                </div>
                                <div className="flex justify-between font-semibold text-brand-dark pt-3 border-t border-brand-lilac/8">
                                    <span>Estimated Total</span>
                                    <span className="text-lg">{formatCurrency(total())}</span>
                                </div>
                                <Link href="/checkout" onClick={close} className="block pt-1">
                                    <Button className="w-full" size="lg">
                                        <span className="flex items-center justify-center gap-2">
                                            Checkout <ArrowRight size={16} />
                                        </span>
                                    </Button>
                                </Link>
                            </div>
                        )}
                    </motion.aside>
                </>
            )}
        </AnimatePresence>
    );
}

function CartItems() {
    const { items, updateQuantity, removeItem } = useCartStore();

    // Group items: standalone items first, then bundle groups
    const { standaloneItems, bundleGroups } = useMemo(() => {
        const standalone: CartItem[] = [];
        const bundles = new Map<string, { name: string; discount: number; items: CartItem[] }>();

        for (const item of items) {
            if (item.bundleId) {
                if (!bundles.has(item.bundleId)) {
                    bundles.set(item.bundleId, { name: item.bundleName || "Bundle", discount: item.bundleDiscount || 0, items: [] });
                }
                bundles.get(item.bundleId)!.items.push(item);
            } else {
                standalone.push(item);
            }
        }
        return { standaloneItems: standalone, bundleGroups: Array.from(bundles.entries()) };
    }, [items]);

    return (
        <div className="space-y-3">
            {/* Standalone items */}
            <AnimatePresence initial={false}>
                {standaloneItems.map((item) => (
                    <CartItemRow key={`${item.product.id}-${item.variant?.name || "default"}`} item={item} />
                ))}
            </AnimatePresence>

            {/* Bundle groups */}
            {bundleGroups.map(([bundleId, group]) => (
                <motion.div
                    key={bundleId}
                    layout
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="rounded-xl border border-emerald-200 bg-emerald-50/30 overflow-hidden"
                >
                    {/* Bundle header */}
                    <div className="flex items-center justify-between px-3 py-2 bg-emerald-50 border-b border-emerald-100">
                        <div className="flex items-center gap-2">
                            <Package size={13} className="text-emerald-600" />
                            <span className="text-xs font-semibold text-emerald-700">{group.name}</span>
                            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">
                                {group.discount}% OFF
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={() => removeItem("", undefined, bundleId)}
                            className="p-1 hover:bg-red-50 rounded-full transition-colors cursor-pointer group"
                            title="Remove bundle"
                        >
                            <Trash2 size={12} className="text-emerald-400 group-hover:text-red-500 transition-colors" />
                        </button>
                    </div>
                    {/* Bundle items */}
                    <div className="p-2 space-y-2">
                        {group.items.map((item) => (
                            <CartItemRow key={`${bundleId}-${item.product.id}-${item.variant?.name || "default"}`} item={item} compact />
                        ))}
                    </div>
                </motion.div>
            ))}
        </div>
    );
}

function CartItemRow({ item, compact }: { item: CartItem; compact?: boolean }) {
    const { updateQuantity, removeItem } = useCartStore();
    const price = item.variant?.price || item.product.price;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, x: 60, height: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className={`flex gap-3 ${compact ? "p-1.5" : "p-3 rounded-xl bg-white border border-brand-lilac/8 shadow-sm hover:shadow-md transition-shadow"}`}
        >
            <div className={`relative rounded-lg overflow-hidden bg-neutral-50 shrink-0 ${compact ? "h-14 w-11" : "h-20 w-16"}`}>
                <Image src={item.variant?.image || item.product.images[0]} alt={item.product.name} fill className="object-cover" sizes="64px" />
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div>
                    <p className={`font-medium text-brand-dark truncate ${compact ? "text-xs" : "text-sm"}`}>{item.product.name}</p>
                    {item.variant && <p className="text-[10px] text-brand-dark/35 mt-0.5">{item.variant.name}</p>}
                    {item.selectedPrepOptions && item.selectedPrepOptions.length > 0 && (
                        <p className="text-[10px] text-brand-purple/60 mt-0.5">
                            {item.selectedPrepOptions.map((o) => o.label).join(", ")}
                        </p>
                    )}
                    <p className={`font-semibold text-brand-dark mt-0.5 ${compact ? "text-xs" : "text-sm"}`}>{formatCurrency(price * item.quantity)}</p>
                </div>
                <div className="flex items-center justify-between mt-1.5">
                    <div className="flex items-center bg-neutral-50 rounded-full overflow-hidden border border-brand-dark/5">
                        <button type="button" onClick={() => updateQuantity(item.product.id, item.variant?.name, item.quantity - 1, item.bundleId)} className="w-7 h-7 flex items-center justify-center hover:bg-neutral-100 transition-colors cursor-pointer">
                            <Minus size={11} />
                        </button>
                        <span className="text-xs font-semibold w-7 text-center">{item.quantity}</span>
                        <button type="button" onClick={() => updateQuantity(item.product.id, item.variant?.name, item.quantity + 1, item.bundleId)} className="w-7 h-7 flex items-center justify-center hover:bg-neutral-100 transition-colors cursor-pointer">
                            <Plus size={11} />
                        </button>
                    </div>
                    {!compact && (
                        <button type="button" onClick={() => removeItem(item.product.id, item.variant?.name)} className="p-1.5 hover:bg-red-50 rounded-full transition-colors cursor-pointer group">
                            <Trash2 size={13} className="text-brand-dark/20 group-hover:text-red-500 transition-colors" />
                        </button>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
