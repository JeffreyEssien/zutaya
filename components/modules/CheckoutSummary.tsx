"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { useCartStore } from "@/lib/cartStore";
import { formatCurrency } from "@/lib/formatCurrency";
import CouponInput from "@/components/modules/CouponInput";
import { Package, MapPin } from "lucide-react";

interface CheckoutSummaryProps {
    shippingFee: number;
    packagingFee?: number;
}

export default function CheckoutSummary({ shippingFee, packagingFee = 0 }: CheckoutSummaryProps) {
    const { items, subtotal, discount, couponCode, bundleDiscountTotal, total: cartTotal } = useCartStore();

    const sub = subtotal();
    const shipping = shippingFee;
    const bundleDisc = bundleDiscountTotal();
    const couponDisc = discount > 0 ? (sub - bundleDisc) * (discount / 100) : 0;
    const prepFee = items.reduce((sum, item) => {
        if (item.selectedPrepOptions && item.selectedPrepOptions.length > 0) {
            return sum + item.selectedPrepOptions.reduce((s, o) => s + o.extraFee, 0) * item.quantity;
        }
        return sum;
    }, 0);
    const total = Math.max(0, sub - bundleDisc - couponDisc) + shipping + packagingFee + prepFee;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="glass-card p-6 sticky top-24"
        >
            <div className="flex items-center gap-2 mb-6">
                <Package size={16} className="text-brand-green" />
                <h2 className="font-serif text-lg text-warm-cream">Order Summary</h2>
            </div>

            <ul className="space-y-4 mb-6">
                {items.map((item, i) => (
                    <motion.li
                        key={`${item.product.id}-${item.variant?.name ?? ""}-${item.bundleId ?? ""}`}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 + i * 0.05 }}
                        className="flex gap-3"
                    >
                        <div className="relative h-14 w-12 rounded-lg overflow-hidden bg-warm-cream/5 shrink-0 border border-warm-cream/10">
                            <Image src={item.product.images[0]} alt={item.product.name} fill sizes="48px" className="object-cover" />
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-dark text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                                {item.quantity}
                            </span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm text-warm-cream font-medium truncate">{item.product.name}</p>
                            {item.variant && <p className="text-[10px] text-warm-cream/35">{item.variant.name}</p>}
                            {item.bundleName && (
                                <p className="text-[10px] text-emerald-600 font-medium">{item.bundleName} ({item.bundleDiscount}% off)</p>
                            )}
                        </div>
                        <p className="text-sm text-warm-cream font-medium shrink-0">
                            {formatCurrency((item.variant?.price || item.product.price) * item.quantity)}
                        </p>
                    </motion.li>
                ))}
            </ul>

            <div className="mb-5">
                <CouponInput />
            </div>

            <div className="border-t border-warm-cream/10 pt-4 space-y-2.5">
                <Row label="Subtotal" value={formatCurrency(sub)} />
                {bundleDisc > 0 && (
                    <div className="flex justify-between text-sm">
                        <span className="text-emerald-600">Bundle Discount</span>
                        <span className="text-emerald-600 font-medium">-{formatCurrency(bundleDisc)}</span>
                    </div>
                )}
                {couponDisc > 0 && (
                    <div className="flex justify-between text-sm">
                        <span className="text-emerald-600">Coupon ({couponCode})</span>
                        <span className="text-emerald-600 font-medium">-{formatCurrency(couponDisc)}</span>
                    </div>
                )}
                <div className="flex justify-between text-sm text-warm-cream/50">
                    <span className="flex items-center gap-1.5">
                        <MapPin size={12} className="text-warm-cream/30" />
                        Delivery
                    </span>
                    <span className="font-medium text-warm-cream/70">
                        {shipping > 0 ? formatCurrency(shipping) : (
                            <span className="text-warm-cream/30 italic text-xs">Select location</span>
                        )}
                    </span>
                </div>
                {packagingFee > 0 && (
                    <div className="flex justify-between text-sm text-warm-cream/50">
                        <span className="flex items-center gap-1.5">
                            <Package size={12} className="text-warm-cream/30" />
                            Premium Packaging
                        </span>
                        <span className="font-medium text-warm-cream/70">{formatCurrency(packagingFee)}</span>
                    </div>
                )}
                {prepFee > 0 && (
                    <div className="flex justify-between text-sm text-warm-cream/50">
                        <span>Prep Fee</span>
                        <span className="font-medium text-warm-cream/70">{formatCurrency(prepFee)}</span>
                    </div>
                )}
            </div>

            <div className="border-t border-warm-cream/10 mt-4 pt-4">
                <div className="flex justify-between font-semibold text-warm-cream">
                    <span>Total</span>
                    <span className="text-xl">{formatCurrency(total)}</span>
                </div>
            </div>
        </motion.div>
    );
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between text-sm text-warm-cream/50">
            <span>{label}</span>
            <span className="font-medium text-warm-cream/70">{value}</span>
        </div>
    );
}
