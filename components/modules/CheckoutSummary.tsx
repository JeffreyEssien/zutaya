"use client";

import SafeImage from "@/components/ui/SafeImage";
import { motion } from "framer-motion";
import { useCartStore, cartQuantityBounds } from "@/lib/cartStore";
import { formatCurrency } from "@/lib/formatCurrency";
import CouponInput from "@/components/modules/CouponInput";
import { Package, MapPin, ShieldCheck } from "lucide-react";

interface CheckoutSummaryProps {
    shippingFee: number;
    packagingFee?: number;
    processingFee?: number;
}

export default function CheckoutSummary({ shippingFee, packagingFee = 0, processingFee = 0 }: CheckoutSummaryProps) {
    const { items, subtotal, discount, couponCode } = useCartStore();

    const sub = subtotal();
    const shipping = shippingFee;
    const couponDisc = discount > 0 ? sub * (discount / 100) : 0;
    const prepFee = items.reduce((sum, item) => {
        if (item.selectedPrepOptions && item.selectedPrepOptions.length > 0) {
            return sum + item.selectedPrepOptions.reduce((s, o) => s + o.extraFee, 0) * item.quantity;
        }
        return sum;
    }, 0);
    const baseTotal = Math.max(0, sub - couponDisc) + shipping + packagingFee + prepFee;
    const total = baseTotal + processingFee;

    // Standalone items render individually; each package group renders as one
    // summary row at its flat price (its lines are descriptive only).
    const standaloneItems = items.filter((i) => !i.packageId);
    const packageGroups = Array.from(
        items.reduce((map, item) => {
            if (!item.packageId) return map;
            const g = map.get(item.packageId) || {
                name: item.packageName || "Zútaya Package",
                price: item.packagePrice || 0,
                boxes: item.packageBoxes || 1,
                image: item.product.images?.[0],
                contents: [] as string[],
            };
            g.contents.push(`${item.product.name}${item.variant ? ` · ${item.variant.name}` : ""} ×${item.quantity}`);
            map.set(item.packageId, g);
            return map;
        }, new Map<string, { name: string; price: number; boxes: number; image?: string; contents: string[] }>()),
    );

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
                {standaloneItems.map((item, i) => (
                    <motion.li
                        key={`${item.product.id}-${item.variant?.name ?? ""}`}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 + i * 0.05 }}
                        className="flex gap-3"
                    >
                        <div className="relative h-14 w-12 rounded-lg overflow-hidden bg-warm-cream/5 shrink-0 border border-warm-cream/10">
                            <SafeImage src={item.product.images?.[0]} alt={item.product.name} fill sizes="48px" className="object-cover" />
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-dark text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                                {item.quantity}
                            </span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm text-warm-cream font-medium truncate">{item.product.name}</p>
                            {item.variant && <p className="text-[10px] text-warm-cream/35">{item.variant.name}</p>}
                            <p className="text-[10px] text-warm-cream/45">
                                {cartQuantityBounds(item).unit ? `${item.quantity} kg` : `Qty: ${item.quantity}`}
                            </p>
                        </div>
                        <p className="text-sm text-warm-cream font-medium shrink-0">
                            {formatCurrency((item.variant?.price || item.product.price) * item.quantity)}
                        </p>
                    </motion.li>
                ))}

                {packageGroups.map(([packageId, group]) => (
                    <li key={packageId} className="flex gap-3">
                        <div className="relative h-14 w-12 rounded-lg overflow-hidden bg-warm-cream/5 shrink-0 border border-brand-green/20">
                            <SafeImage src={group.image} alt={group.name} fill sizes="48px" className="object-cover" />
                            <span className="absolute -top-1 -right-1 w-5 h-4 bg-brand-green text-white text-[8px] font-bold rounded-full flex items-center justify-center px-1">
                                <Package size={9} />
                            </span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm text-warm-cream font-medium truncate">
                                {group.name}{group.boxes > 1 ? ` ×${group.boxes}` : ""}
                            </p>
                            <p className="text-[10px] text-warm-cream/35 line-clamp-2">{group.contents.join(", ")}</p>
                        </div>
                        <p className="text-sm text-warm-cream font-medium shrink-0">{formatCurrency(group.price * group.boxes)}</p>
                    </li>
                ))}
            </ul>

            <div className="mb-5">
                <CouponInput />
            </div>

            <div className="border-t border-warm-cream/10 pt-4 space-y-2.5">
                <Row label="Subtotal" value={formatCurrency(sub)} />
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
                {processingFee > 0 && (
                    <div className="flex justify-between text-sm text-warm-cream/50">
                        <span className="flex items-center gap-1.5">
                            <ShieldCheck size={12} className="text-warm-cream/30" />
                            Processing Fee
                        </span>
                        <span className="font-medium text-warm-cream/70">{formatCurrency(processingFee)}</span>
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
