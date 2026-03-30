"use client";

import { motion } from "framer-motion";
import { useOrderStore } from "@/lib/orderStore";
import { formatCurrency } from "@/lib/formatCurrency";
import { SITE_NAME } from "@/lib/constants";

export default function Receipt() {
    const { lastOrder } = useOrderStore();
    if (!lastOrder) return null;

    const { id, customerName, email, createdAt, items, subtotal, shipping, total, shippingAddress } = lastOrder;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-2xl mx-auto bg-white border border-brand-lilac/15 rounded-2xl overflow-hidden shadow-lg print:border-none print:shadow-none"
        >
            <ReceiptHeader orderId={id} date={createdAt} />
            <div className="px-8 py-7 space-y-7">
                <CustomerSection name={customerName} email={email} address={shippingAddress} />
                <ItemsTable items={items} />
                <TotalsSection subtotal={subtotal} shipping={shipping} total={total} />
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
                    <p className="font-mono text-sm bg-white/10 px-3 py-1 rounded-full inline-block">{orderId}</p>
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
                <p className="text-sm text-brand-dark font-medium mt-1">{name}</p>
                <p className="text-xs text-brand-dark/45 mt-0.5">{email}</p>
            </div>
            <div>
                <Label>Ship To</Label>
                <div className="text-sm text-brand-dark/70 mt-1 space-y-0.5">
                    <p>{address.address}</p>
                    <p>{address.city}, {address.state} {address.zip}</p>
                    <p>{address.country}</p>
                </div>
            </div>
        </div>
    );
}

function ItemsTable({ items }: { items: { product: { name: string; price: number }; variant?: { name?: string; price?: number }; quantity: number }[] }) {
    return (
        <div>
            <Label>Items</Label>
            <table className="w-full text-sm mt-3">
                <thead>
                    <tr className="border-b border-brand-lilac/15">
                        <th className="text-left py-2.5 font-medium text-brand-dark/40 text-xs uppercase tracking-wider">Product</th>
                        <th className="text-center py-2.5 font-medium text-brand-dark/40 text-xs uppercase tracking-wider">Qty</th>
                        <th className="text-right py-2.5 font-medium text-brand-dark/40 text-xs uppercase tracking-wider">Price</th>
                        <th className="text-right py-2.5 font-medium text-brand-dark/40 text-xs uppercase tracking-wider">Total</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-brand-lilac/8">
                    {items.map((item) => {
                        const unitPrice = item.variant?.price || item.product.price;
                        return (
                            <tr key={`${item.product.name}-${item.variant?.name ?? ""}`}>
                                <td className="py-3 text-brand-dark font-medium">
                                    {item.product.name}
                                    {item.variant?.name && (
                                        <span className="block text-[10px] text-brand-dark/40 font-normal mt-0.5">{item.variant.name}</span>
                                    )}
                                </td>
                                <td className="py-3 text-center text-brand-dark/50">{item.quantity}</td>
                                <td className="py-3 text-right text-brand-dark/50">{formatCurrency(unitPrice)}</td>
                                <td className="py-3 text-right text-brand-dark font-semibold">{formatCurrency(unitPrice * item.quantity)}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

function TotalsSection({ subtotal, shipping, total }: { subtotal: number; shipping: number; total: number }) {
    return (
        <div className="border-t border-brand-lilac/15 pt-4 space-y-2.5">
            <TotalRow label="Subtotal" value={formatCurrency(subtotal)} />
            <TotalRow label="Shipping" value={shipping === 0 ? "Free" : formatCurrency(shipping)} />
            <div className="border-t border-brand-lilac/10 pt-3 mt-3">
                <TotalRow label="Total Paid" value={formatCurrency(total)} bold />
            </div>
        </div>
    );
}

function ReceiptFooter() {
    return (
        <div className="bg-brand-lilac/[0.04] px-8 py-5 text-center border-t border-brand-lilac/10">
            <p className="text-xs text-brand-dark/35">
                A confirmation email has been sent to your inbox. Thank you for shopping with {SITE_NAME}.
            </p>
        </div>
    );
}

function Label({ children }: { children: React.ReactNode }) {
    return <h3 className="text-[10px] font-semibold text-brand-dark/35 uppercase tracking-[0.2em]">{children}</h3>;
}

function TotalRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
    return (
        <div className={`flex justify-between text-sm ${bold ? "text-brand-dark font-bold text-base" : "text-brand-dark/55"}`}>
            <span>{label}</span>
            <span>{value}</span>
        </div>
    );
}
