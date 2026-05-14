"use client";

import { motion } from "framer-motion";
import { useOrderStore } from "@/lib/orderStore";
import { formatCurrency } from "@/lib/formatCurrency";
import { SITE_NAME } from "@/lib/constants";

export default function Receipt() {
    const { lastOrder } = useOrderStore();
    if (!lastOrder) return null;

    const { id, customerName, email, createdAt, items, subtotal, shipping, total, shippingAddress, discountTotal, couponCode, deliveryFee, packagingFee, prepFee, deliveryZone, requestedDeliveryDate, requestedDeliverySlot, prepInstructions } = lastOrder;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-2xl mx-auto bg-[#222] border border-warm-cream/15 rounded-2xl overflow-hidden shadow-lg print:border-none print:shadow-none"
        >
            <ReceiptHeader orderId={id} date={createdAt} />
            <div className="px-8 py-7 space-y-7">
                <CustomerSection name={customerName} email={email} address={shippingAddress} />
                <ItemsTable items={items} />
                <TotalsSection
                    subtotal={subtotal}
                    shipping={shipping}
                    total={total}
                    discountTotal={discountTotal}
                    couponCode={couponCode}
                    deliveryFee={deliveryFee}
                    packagingFee={packagingFee}
                    prepFee={prepFee}
                />
                {(deliveryZone || requestedDeliveryDate || prepInstructions) && (
                    <div className="border-t border-warm-cream/10 pt-4 space-y-2">
                        {deliveryZone && (
                            <div className="flex justify-between text-xs text-warm-cream/50">
                                <span>Delivery Zone</span>
                                <span className="text-warm-cream font-medium">{deliveryZone}</span>
                            </div>
                        )}
                        {requestedDeliveryDate && (
                            <div className="flex justify-between text-xs text-warm-cream/50">
                                <span>Preferred Delivery</span>
                                <span className="text-warm-cream font-medium">
                                    {requestedDeliveryDate}{requestedDeliverySlot ? ` (${requestedDeliverySlot})` : ""}
                                </span>
                            </div>
                        )}
                        {prepInstructions && (
                            <div className="text-xs">
                                <span className="text-warm-cream/50">Prep Instructions:</span>
                                <p className="text-warm-cream mt-0.5 bg-amber-500/10 border border-amber-500/20 rounded px-2 py-1">{prepInstructions}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
            <ReceiptFooter />
        </motion.div>
    );
}

function ReceiptHeader({ orderId, date }: { orderId: string; date: string }) {
    return (
        <div className="bg-gradient-to-r from-brand-dark to-brand-purple text-white px-8 py-7">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="font-serif text-2xl tracking-widest">{SITE_NAME}</h2>
                    <p className="text-white/40 text-xs mt-1.5 uppercase tracking-wider">Order Receipt</p>
                </div>
                <div className="text-right">
                    <p className="font-mono text-sm bg-[#222]/10 px-3 py-1 rounded-full inline-block">{orderId}</p>
                    <p className="text-white/40 text-xs mt-2">
                        {new Date(date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                    </p>
                </div>
            </div>
        </div>
    );
}

function CustomerSection({ name, email, address }: {
    name: string; email: string; address: { address: string; city: string; state: string; zip: string; country: string };
}) {
    return (
        <div className="grid grid-cols-2 gap-8">
            <div>
                <Label>Billed To</Label>
                <p className="text-sm text-warm-cream font-medium mt-1">{name}</p>
                <p className="text-xs text-warm-cream/45 mt-0.5">{email}</p>
            </div>
            <div>
                <Label>Ship To</Label>
                <div className="text-sm text-warm-cream/70 mt-1 space-y-0.5">
                    <p>{address.address}</p>
                    <p>{address.city}, {address.state} {address.zip}</p>
                    <p>{address.country}</p>
                </div>
            </div>
        </div>
    );
}

function ItemsTable({ items }: { items: { product: { id?: string; name: string; price: number }; variant?: { name?: string; price?: number }; quantity: number; selectedPrepOptions?: { id: string; label: string; extraFee: number }[]; bundleId?: string }[] }) {
    return (
        <div>
            <Label>Items</Label>
            <table className="w-full text-sm mt-3">
                <thead>
                    <tr className="border-b border-warm-cream/15">
                        <th className="text-left py-2.5 font-medium text-warm-cream/40 text-xs uppercase tracking-wider">Product</th>
                        <th className="text-center py-2.5 font-medium text-warm-cream/40 text-xs uppercase tracking-wider">Qty</th>
                        <th className="text-right py-2.5 font-medium text-warm-cream/40 text-xs uppercase tracking-wider">Price</th>
                        <th className="text-right py-2.5 font-medium text-warm-cream/40 text-xs uppercase tracking-wider">Total</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-brand-lilac/8">
                    {items.map((item, idx) => {
                        const unitPrice = item.variant?.price || item.product.price;
                        return (
                            <tr key={`${item.product.id}-${item.variant?.name ?? ""}-${item.bundleId ?? ""}-${idx}`}>
                                <td className="py-3 text-warm-cream font-medium">
                                    {item.product.name}
                                    {item.variant?.name && (
                                        <span className="block text-[10px] text-warm-cream/40 font-normal mt-0.5">{item.variant.name}</span>
                                    )}
                                    {item.selectedPrepOptions && item.selectedPrepOptions.length > 0 && (
                                        <span className="block text-[10px] text-amber-400 font-normal mt-0.5">
                                            Prep: {item.selectedPrepOptions.map(p => p.label).join(", ")}
                                        </span>
                                    )}
                                </td>
                                <td className="py-3 text-center text-warm-cream/50">{item.quantity}</td>
                                <td className="py-3 text-right text-warm-cream/50">{formatCurrency(unitPrice)}</td>
                                <td className="py-3 text-right text-warm-cream font-semibold">{formatCurrency(unitPrice * item.quantity)}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

function TotalsSection({ subtotal, shipping, total, discountTotal, couponCode, deliveryFee, packagingFee, prepFee }: {
    subtotal: number; shipping: number; total: number;
    discountTotal?: number; couponCode?: string;
    deliveryFee?: number; packagingFee?: number; prepFee?: number;
}) {
    const delivery = deliveryFee ?? shipping;
    return (
        <div className="border-t border-warm-cream/15 pt-4 space-y-2.5">
            <TotalRow label="Subtotal" value={formatCurrency(subtotal)} />
            {discountTotal && discountTotal > 0 ? (
                <TotalRow label={`Discount${couponCode ? ` (${couponCode})` : ""}`} value={`-${formatCurrency(discountTotal)}`} discount />
            ) : null}
            <TotalRow label="Delivery Fee" value={delivery === 0 ? "Free" : formatCurrency(delivery)} />
            {packagingFee && packagingFee > 0 ? <TotalRow label="Premium Packaging" value={formatCurrency(packagingFee)} /> : null}
            {prepFee && prepFee > 0 ? <TotalRow label="Prep Fee" value={formatCurrency(prepFee)} /> : null}
            <div className="border-t border-warm-cream/10 pt-3 mt-3">
                <TotalRow label="Total Paid" value={formatCurrency(total)} bold />
            </div>
        </div>
    );
}

function ReceiptFooter() {
    return (
        <div className="bg-brand-black/[0.04] px-8 py-5 text-center border-t border-warm-cream/10">
            <p className="text-xs text-warm-cream/35">
                A confirmation email has been sent to your inbox. Thank you for shopping with {SITE_NAME}.
            </p>
        </div>
    );
}

function Label({ children }: { children: React.ReactNode }) {
    return <h3 className="text-[10px] font-semibold text-warm-cream/35 uppercase tracking-[0.2em]">{children}</h3>;
}

function TotalRow({ label, value, bold, discount }: { label: string; value: string; bold?: boolean; discount?: boolean }) {
    return (
        <div className={`flex justify-between text-sm ${bold ? "text-warm-cream font-bold text-base" : discount ? "text-emerald-400" : "text-warm-cream/55"}`}>
            <span>{label}</span>
            <span>{value}</span>
        </div>
    );
}
