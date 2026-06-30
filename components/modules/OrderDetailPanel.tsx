"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { Order } from "@/types";
import { formatCurrency } from "@/lib/formatCurrency";
import { formatLineQuantity } from "@/lib/quantity";
import { updateOrderStatus, updateOrderNotes } from "@/lib/queries";
import Button from "@/components/ui/Button";
import { logAction } from "@/lib/auditClient";
import {
    X, Printer, MessageCircle, CheckCircle2, Package, Truck, PartyPopper,
    CreditCard, User, MapPin, ChefHat, ShoppingBag, Receipt, StickyNote, ShieldAlert,
    Clock, Send, Ban, Copy, Check, RotateCcw, AlertTriangle, RefreshCw,
} from "lucide-react";

interface PaymentRecord {
    id: string;
    reference: string;
    status: string;
    channel: string | null;
    amount_kobo: number;
    processing_fee_kobo: number;
    total_charged_kobo: number;
    paystack_fees_kobo: number | null;
    paid_at: string | null;
    failed_at: string | null;
    failure_reason: string | null;
    refund_status: string | null;
    refunded_amount_kobo: number;
    refunded_at: string | null;
    created_at: string;
}

const statusVariant: Record<Order["status"], "warning" | "info" | "success"> = {
    pending: "warning",
    processing: "info",
    packed: "info",
    out_for_delivery: "info",
    delivered: "success",
};

const statusIcon: Record<Order["status"], React.ReactNode> = {
    pending: <Clock size={14} />,
    processing: <ChefHat size={14} />,
    packed: <Package size={14} />,
    out_for_delivery: <Truck size={14} />,
    delivered: <CheckCircle2 size={14} />,
};

interface OrderDetailPanelProps {
    order: Order;
    onClose: () => void;
    onUpdate?: () => void;
}

export default function OrderDetailPanel({ order, onClose, onUpdate }: OrderDetailPanelProps) {
    const addr = order.shippingAddress;
    const [notes, setNotes] = useState(order.notes || "");
    const [isSavingNotes, setIsSavingNotes] = useState(false);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [copied, setCopied] = useState(false);
    const [payments, setPayments] = useState<PaymentRecord[]>([]);
    const [isRefunding, setIsRefunding] = useState(false);
    const [showRefundForm, setShowRefundForm] = useState(false);
    const [refundAmount, setRefundAmount] = useState<string>("");
    const [refundReason, setRefundReason] = useState("");
    const [reverifying, setReverifying] = useState<string | null>(null);

    const refreshPayments = async () => {
        const fresh = await fetch(`/api/admin/payments?orderId=${encodeURIComponent(order.id)}`).then((r) => r.json());
        if (fresh.success) setPayments(fresh.payments ?? []);
    };

    const handleReverify = async (reference: string) => {
        setReverifying(reference);
        try {
            const res = await fetch("/api/admin/payments/reverify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reference }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                alert(data.error || "Re-verify failed");
                return;
            }
            const msg = data.changed
                ? `Updated! Paystack says: ${data.paystackStatus}. Local status: ${data.localStatus}.`
                : `No change. Paystack confirms: ${data.paystackStatus}.`;
            alert(msg);
            logAction("update", "order", order.id, `Re-verified payment ${reference.slice(-12)} → ${data.paystackStatus}`);
            await refreshPayments();
            if (onUpdate) onUpdate();
        } catch {
            alert("Re-verify request failed.");
        } finally {
            setReverifying(null);
        }
    };

    useEffect(() => {
        let active = true;
        fetch(`/api/admin/payments?orderId=${encodeURIComponent(order.id)}`)
            .then((r) => r.json())
            .then((data) => {
                if (active && data.success) setPayments(data.payments ?? []);
            })
            .catch(() => {});
        return () => {
            active = false;
        };
    }, [order.id]);

    const paidPayment = payments.find((p) => p.status === "paid" || p.status === "partially_refunded");
    const refundable = paidPayment
        ? paidPayment.total_charged_kobo - paidPayment.refunded_amount_kobo
        : 0;

    const handleStatusUpdate = async (status: Order["status"]) => {
        if (!confirm(`Mark order as ${status}?`)) return;
        setIsUpdatingStatus(true);
        try {
            await updateOrderStatus(order.id, status);
            logAction("update", "order", order.id, `Status changed to ${status}`);
            if (onUpdate) onUpdate();
        } catch {
            alert("Failed to update status");
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    const handleSaveNotes = async () => {
        setIsSavingNotes(true);
        try {
            await updateOrderNotes(order.id, notes);
            logAction("update", "order", order.id, "Updated order notes");
            alert("Notes saved");
            if (onUpdate) onUpdate();
        } catch {
            alert("Failed to save notes");
        } finally {
            setIsSavingNotes(false);
        }
    };

    const handleRefund = async () => {
        if (!paidPayment) return;
        const requestedKobo = refundAmount.trim()
            ? Math.round(Number(refundAmount) * 100)
            : refundable;
        if (!requestedKobo || requestedKobo <= 0 || requestedKobo > refundable) {
            alert(`Refund amount must be between ₦0.01 and ₦${(refundable / 100).toLocaleString()}.`);
            return;
        }
        const confirmMsg =
            requestedKobo === refundable
                ? `Refund the full ₦${(refundable / 100).toLocaleString()} to the customer via Paystack?`
                : `Refund ₦${(requestedKobo / 100).toLocaleString()} (partial) via Paystack?`;
        if (!confirm(`${confirmMsg}\n\nThis can take up to 10 business days to settle.`)) return;

        setIsRefunding(true);
        try {
            const res = await fetch("/api/paystack/refund", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    reference: paidPayment.reference,
                    amountKobo: requestedKobo,
                    reason: refundReason || undefined,
                }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                alert(data.error || "Refund failed");
                return;
            }
            logAction("update", "order", order.id, `Refund initiated: ₦${(requestedKobo / 100).toLocaleString()}`);
            setShowRefundForm(false);
            setRefundAmount("");
            setRefundReason("");
            if (onUpdate) onUpdate();
            await refreshPayments();
        } catch {
            alert("Refund request failed — check console.");
        } finally {
            setIsRefunding(false);
        }
    };

    const openWhatsApp = (message: string) => {
        const phone = order.phone.replace(/^0/, "234").replace(/\D/g, "");
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank");
    };

    const copyOrderDetails = () => {
        const date = new Date(order.createdAt);
        const dateStr = date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
        const timeStr = date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

        const itemLines = order.items.map(item => {
            const price = item.variant?.price || item.product.price;
            let line = `  • ${item.product.name}`;
            if (item.variant?.name) line += ` (${item.variant.name})`;
            line += ` × ${formatLineQuantity(item)} — ${formatCurrency(price * item.quantity)}`;
            if (item.selectedPrepOptions && item.selectedPrepOptions.length > 0) {
                line += `\n    Prep: ${item.selectedPrepOptions.map(p => p.label).join(", ")}`;
            }
            return line;
        }).join("\n");

        const parts = [
            `ORDER: ${order.id}`,
            `Date: ${dateStr} at ${timeStr}`,
            `Status: ${order.status.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}`,
            "",
            `CUSTOMER`,
            `  Name: ${order.customerName}`,
            `  Email: ${order.email}`,
            `  Phone: ${order.phone}`,
            "",
            `DELIVERY`,
            `  Address: ${addr.address}, ${addr.city}, ${addr.state} ${addr.zip}`,
        ];

        if (order.deliveryZone) parts.push(`  Zone: ${order.deliveryZone}`);
        if (order.requestedDeliveryDate) {
            parts.push(`  Preferred Date: ${order.requestedDeliveryDate}${order.requestedDeliverySlot ? ` (${order.requestedDeliverySlot})` : ""}`);
        }

        parts.push("", "ITEMS", itemLines);

        if (order.prepInstructions) {
            parts.push("", `PREP INSTRUCTIONS`, `  ${order.prepInstructions}`);
        }

        parts.push("", "BILL SUMMARY");
        parts.push(`  Subtotal: ${formatCurrency(subtotal)}`);
        if (discountAmount > 0) parts.push(`  Discount${order.couponCode ? ` (${order.couponCode})` : ""}: -${formatCurrency(discountAmount)}`);
        parts.push(`  Delivery: ${deliveryFee === 0 ? "Free" : formatCurrency(deliveryFee)}`);
        if (packagingFee > 0) parts.push(`  Packaging: ${formatCurrency(packagingFee)}`);
        if (prepFee > 0) parts.push(`  Prep Fee: ${formatCurrency(prepFee)}`);
        parts.push(`  TOTAL: ${formatCurrency(order.total)}`);

        if (order.paymentMethod) {
            parts.push("", `PAYMENT`);
            const methodLabel =
                order.paymentMethod === "paystack" ? "Paystack" :
                order.paymentMethod === "bank_transfer" ? "Bank Transfer (legacy)" :
                order.paymentMethod === "whatsapp" ? "WhatsApp (legacy)" : order.paymentMethod;
            parts.push(`  Method: ${methodLabel}`);
            if (order.paystackReference) parts.push(`  Ref: ${order.paystackReference}`);
            if (order.paymentStatus) {
                const ps =
                    order.paymentStatus === "payment_confirmed" ? "Paid" :
                    order.paymentStatus === "failed" ? "Failed" :
                    order.paymentStatus === "refunded" ? "Refunded" :
                    order.paymentStatus === "partially_refunded" ? "Partially Refunded" :
                    order.paymentStatus === "awaiting_payment" ? "Awaiting Payment" : order.paymentStatus;
                parts.push(`  Status: ${ps}`);
            }
        }

        navigator.clipboard.writeText(parts.join("\n"));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const messageCustomer = () => {
        openWhatsApp(`Hi ${order.customerName.split(" ")[0]}! 👋\n\nRegarding your Zúta Ya order *${order.id}*, `);
    };

    const sendWhatsAppStatusUpdate = (status: string) => {
        const messages: Record<string, string> = {
            packed: `Hi ${order.customerName.split(" ")[0]}! 📦\n\nGreat news! Your order *${order.id}* has been packed and is ready for delivery.\n\n*Order Total:* ₦${order.total.toLocaleString()}\n*Delivering To:* ${addr.address}, ${addr.city}\n\nWe'll let you know once it's out for delivery. Thank you for choosing Zúta Ya!`,
            out_for_delivery: `Hi ${order.customerName.split(" ")[0]}! 🚚\n\nYour order *${order.id}* is out for delivery!\n\n*Delivering To:* ${addr.address}, ${addr.city}\n\nPlease ensure someone is available to receive the package. Thank you for choosing Zúta Ya!`,
            delivered: `Hi ${order.customerName.split(" ")[0]}! 🎉\n\nYour order *${order.id}* has been delivered!\n\nWe hope you enjoy your fresh cuts. If you have any questions, feel free to reach out.\n\nThank you for choosing Zúta Ya!`,
        };
        openWhatsApp(messages[status] || `Hi! Regarding your order ${order.id}...`);
    };

    const nextStatus: Order["status"] | null =
        order.status === "pending" ? "processing" :
        order.status === "processing" ? "packed" :
        order.status === "packed" ? "out_for_delivery" :
        order.status === "out_for_delivery" ? "delivered" :
        null;

    const nextStatusLabel: Record<string, string> = {
        processing: "Mark Processing",
        packed: "Mark Packed",
        out_for_delivery: "Out for Delivery",
        delivered: "Mark Delivered",
    };

    const nextStatusIcon: Record<string, React.ReactNode> = {
        processing: <ChefHat size={14} />,
        packed: <Package size={14} />,
        out_for_delivery: <Truck size={14} />,
        delivered: <PartyPopper size={14} />,
    };

    const subtotal = order.subtotal;
    const discountAmount = order.discountTotal ?? 0;
    const deliveryFee = order.deliveryFee ?? order.shipping ?? 0;
    const packagingFee = order.packagingFee ?? 0;
    const prepFee = order.prepFee ?? 0;

    // Group items by legacy bundle (historical) and Zútaya Package
    const bundleGroups: Record<string, typeof order.items> = {};
    const packageGroups: Record<string, typeof order.items> = {};
    const standaloneItems: typeof order.items = [];
    for (const item of order.items) {
        if (item.packageId) {
            if (!packageGroups[item.packageId]) packageGroups[item.packageId] = [];
            packageGroups[item.packageId].push(item);
        } else if (item.bundleId) {
            if (!bundleGroups[item.bundleId]) bundleGroups[item.bundleId] = [];
            bundleGroups[item.bundleId].push(item);
        } else {
            standaloneItems.push(item);
        }
    }

    return (
        <>
            {/* Mobile backdrop */}
            <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm xl:hidden" onClick={onClose} />

            {/* Panel */}
            <div className="fixed inset-0 z-50 overflow-y-auto xl:relative xl:inset-auto xl:z-auto">
                <div className="min-h-full flex items-end xl:items-start xl:min-h-0">
                    <div className="w-full bg-white/[0.04] rounded-t-2xl xl:rounded-t-none xl:rounded-xl border border-warm-cream/15 xl:sticky xl:top-24 animate-slideUp xl:animate-none shadow-2xl xl:shadow-md xl:max-h-[calc(100vh-7rem)] xl:overflow-y-auto">

                        {/* ═══ Header ═══ */}
                        <div className="bg-gradient-to-r from-brand-dark to-brand-green px-5 sm:px-6 py-4">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="font-mono text-sm text-white/80 bg-white/10 px-2.5 py-0.5 rounded-full inline-block">
                                        {order.id}
                                    </p>
                                    <p className="text-white/50 text-[11px] mt-2">
                                        {new Date(order.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
                                        {" · "}
                                        {new Date(order.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={copyOrderDetails}
                                        className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                                        title="Copy order details"
                                    >
                                        {copied ? <Check size={16} className="text-emerald-300" /> : <Copy size={16} />}
                                    </button>
                                    <Link
                                        href={`/admin/orders/${order.id}/print`}
                                        target="_blank"
                                        className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                                        title="Print order"
                                    >
                                        <Printer size={16} />
                                    </Link>
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            </div>
                            {/* Status + Payment badges row */}
                            <div className="flex flex-wrap items-center gap-2 mt-3">
                                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                                    order.status === "delivered" ? "bg-emerald-400/20 text-emerald-200" :
                                    order.status === "pending" ? "bg-amber-400/20 text-amber-200" :
                                    "bg-white/15 text-white/90"
                                }`}>
                                    {statusIcon[order.status]}
                                    {order.status.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                                </span>
                                {order.paymentStatus && (
                                    <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${
                                        order.paymentStatus === "payment_confirmed"
                                            ? "bg-emerald-400/20 text-emerald-200"
                                            : order.paymentStatus === "refunded" || order.paymentStatus === "partially_refunded"
                                                ? "bg-purple-400/20 text-purple-200"
                                                : order.paymentStatus === "failed"
                                                    ? "bg-red-400/20 text-red-200"
                                                    : "bg-amber-400/20 text-amber-200"
                                    }`}>
                                        <CreditCard size={11} />
                                        {order.paymentStatus === "payment_confirmed" ? "Paid" :
                                         order.paymentStatus === "refunded" ? "Refunded" :
                                         order.paymentStatus === "partially_refunded" ? "Partially Refunded" :
                                         order.paymentStatus === "failed" ? "Failed" :
                                         "Awaiting Payment"}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="px-5 sm:px-6 py-5 space-y-5">

                            {/* ═══ Quick Actions ═══ */}
                            {(() => {
                                const waNotify =
                                    order.status === "packed" ? { key: "packed", label: "Notify: Packed", color: "blue" } :
                                    order.status === "out_for_delivery" ? { key: "out_for_delivery", label: "Notify: Dispatched", color: "indigo" } :
                                    order.status === "delivered" ? { key: "delivered", label: "Notify: Delivered", color: "purple" } :
                                    null;
                                const waColors: Record<string, string> = {
                                    blue: "text-blue-300 bg-blue-500/10 hover:bg-blue-500/15 border-blue-500/25",
                                    indigo: "text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/15 border-indigo-500/25",
                                    purple: "text-purple-300 bg-purple-500/10 hover:bg-purple-500/15 border-purple-500/25",
                                };
                                return (
                                    <div className="space-y-2">
                                        {/* Primary: advance status (full width) */}
                                        {nextStatus && (
                                            <Button
                                                size="sm"
                                                className="w-full gap-1.5"
                                                onClick={() => handleStatusUpdate(nextStatus)}
                                                disabled={isUpdatingStatus}
                                            >
                                                {isUpdatingStatus ? "Updating..." : (
                                                    <>{nextStatusIcon[nextStatus]} {nextStatusLabel[nextStatus]}</>
                                                )}
                                            </Button>
                                        )}

                                        {/* Refund (full width when paid) */}
                                        {paidPayment && refundable > 0 && (
                                            <Button
                                                size="sm"
                                                className="w-full bg-purple-600 hover:bg-purple-700 gap-1.5"
                                                onClick={() => setShowRefundForm((v) => !v)}
                                            >
                                                <RotateCcw size={14} />
                                                {showRefundForm ? "Cancel Refund" : `Refund up to ₦${(refundable / 100).toLocaleString()}`}
                                            </Button>
                                        )}

                                        {/* Communication row: Message + contextual WA notify */}
                                        <div className={`grid gap-2 ${waNotify ? "grid-cols-2" : "grid-cols-1"}`}>
                                            <button
                                                onClick={messageCustomer}
                                                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-[#25D366] bg-[#25D366]/10 hover:bg-[#25D366]/15 border border-[#25D366]/25 transition-colors cursor-pointer"
                                            >
                                                <MessageCircle size={13} /> Message Customer
                                            </button>
                                            {waNotify && (
                                                <button
                                                    onClick={() => sendWhatsAppStatusUpdate(waNotify.key)}
                                                    className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${waColors[waNotify.color]}`}
                                                >
                                                    <Send size={12} /> {waNotify.label}
                                                </button>
                                            )}
                                        </div>

                                        {/* Cancel — destructive, footer placement */}
                                        {order.status !== "delivered" && (
                                            <button
                                                onClick={() => {
                                                    if (confirm("Are you sure you want to cancel this order?")) {
                                                        alert("Cancel logic not yet implemented in DB");
                                                    }
                                                }}
                                                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 mt-1 rounded-lg text-[11px] text-red-400/80 hover:text-red-300 hover:bg-red-500/10 transition-colors cursor-pointer"
                                            >
                                                <Ban size={12} /> Cancel Order
                                            </button>
                                        )}
                                    </div>
                                );
                            })()}

                            <Divider />

                            {/* ═══ Customer & Delivery - side by side on wider panels ═══ */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                {/* Customer */}
                                <Card icon={<User size={14} />} title="Customer">
                                    <p className="text-sm text-warm-cream font-medium">{order.customerName}</p>
                                    <p className="text-xs text-warm-cream/50 mt-0.5">{order.email}</p>
                                    <p className="text-xs text-warm-cream/50">{order.phone}</p>
                                    {order.paymentMethod && (
                                        <div className="mt-2 pt-2 border-t border-warm-cream/10">
                                            <DetailRow
                                                label="Payment"
                                                value={
                                                    order.paymentMethod === "paystack" ? "Paystack" :
                                                    order.paymentMethod === "bank_transfer" ? "Bank Transfer (legacy)" :
                                                    order.paymentMethod === "whatsapp" ? "WhatsApp (legacy)" :
                                                    order.paymentMethod
                                                }
                                            />
                                            {paidPayment?.channel && (
                                                <DetailRow label="Channel" value={paidPayment.channel.replace(/_/g, " ")} />
                                            )}
                                            {order.paystackReference && (
                                                <DetailRow label="Ref" value={order.paystackReference.slice(0, 22) + "…"} />
                                            )}
                                        </div>
                                    )}
                                </Card>

                                {/* Delivery */}
                                <Card icon={<MapPin size={14} />} title="Delivery">
                                    <p className="text-sm text-warm-cream leading-snug">{addr.address}</p>
                                    <p className="text-xs text-warm-cream/60">{addr.city}, {addr.state} {addr.zip}</p>
                                    <div className="mt-2 pt-2 border-t border-warm-cream/10 space-y-1">
                                        {order.deliveryZone && <DetailRow label="Zone" value={order.deliveryZone} />}
                                        <DetailRow label="Fee" value={deliveryFee === 0 ? "Free" : formatCurrency(deliveryFee)} />
                                        {order.requestedDeliveryDate && (
                                            <DetailRow
                                                label="Date"
                                                value={`${order.requestedDeliveryDate}${order.requestedDeliverySlot ? ` (${order.requestedDeliverySlot})` : ""}`}
                                            />
                                        )}
                                        {order.deliveryDiscount && order.deliveryDiscount.percent > 0 && (
                                            <DetailRow
                                                label="Discount"
                                                value={`${order.deliveryDiscount.percent}% off`}
                                                highlight="green"
                                            />
                                        )}
                                    </div>
                                </Card>
                            </div>

                            {/* ═══ Preparation Instructions ═══ */}
                            {(order.prepInstructions || prepFee > 0 || packagingFee > 0) && (
                                <>
                                    <Divider />
                                    <Card icon={<ChefHat size={14} />} title="Preparation">
                                        <div className="space-y-2">
                                            {order.prepInstructions && (
                                                <div className="bg-amber-500/10 border border-amber-500/20/60 rounded-lg px-3 py-2.5">
                                                    <p className="text-[10px] font-semibold text-amber-800/60 uppercase tracking-wider mb-1">Customer Instructions</p>
                                                    <p className="text-sm text-amber-900 leading-relaxed">{order.prepInstructions}</p>
                                                </div>
                                            )}
                                            {packagingFee > 0 && <DetailRow label="Premium Packaging" value={formatCurrency(packagingFee)} />}
                                            {prepFee > 0 && <DetailRow label="Prep Fee" value={formatCurrency(prepFee)} />}
                                        </div>
                                    </Card>
                                </>
                            )}

                            <Divider />

                            {/* ═══ Order Items ═══ */}
                            <Card icon={<ShoppingBag size={14} />} title={`Items (${order.items.length})`}>
                                <div className="space-y-0">
                                    {/* Zútaya Package groups */}
                                    {Object.entries(packageGroups).map(([packageId, items]) => {
                                        const boxes = items[0].packageBoxes || 1;
                                        const flat = (items[0].packagePrice || 0) * boxes;
                                        return (
                                            <div key={packageId} className="mb-3 last:mb-0">
                                                <div className="flex items-center justify-between gap-2 mb-1.5">
                                                    <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-green bg-brand-green/10 px-2 py-0.5 rounded-full">
                                                        📦 {items[0].packageName || "Zútaya Package"}{boxes > 1 ? ` ×${boxes}` : ""}
                                                    </span>
                                                    <span className="text-sm text-warm-cream font-semibold tabular-nums">{formatCurrency(flat)}</span>
                                                </div>
                                                <div className="border-l-2 border-brand-green/20 pl-3 space-y-1.5">
                                                    {items.map((item, idx) => (
                                                        <ItemRow key={`${packageId}-${idx}`} item={item} hidePrice />
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* Bundle groups (legacy historical orders) */}
                                    {Object.entries(bundleGroups).map(([bundleId, items]) => (
                                        <div key={bundleId} className="mb-3 last:mb-0">
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                                    {items[0].bundleName || "Bundle"}
                                                </span>
                                                {items[0].bundleDiscount && items[0].bundleDiscount > 0 && (
                                                    <span className="text-[10px] font-medium text-emerald-400">
                                                        {items[0].bundleDiscount}% off
                                                    </span>
                                                )}
                                            </div>
                                            <div className="border-l-2 border-emerald-500/20 pl-3 space-y-1.5">
                                                {items.map((item, idx) => (
                                                    <ItemRow key={`${bundleId}-${idx}`} item={item} />
                                                ))}
                                            </div>
                                        </div>
                                    ))}

                                    {/* Standalone items */}
                                    {standaloneItems.length > 0 && Object.keys(bundleGroups).length > 0 && (
                                        <p className="text-[10px] font-semibold uppercase tracking-wider text-warm-cream/40 mb-1.5 mt-3">Individual Items</p>
                                    )}
                                    <div className="space-y-1.5">
                                        {standaloneItems.map((item, idx) => (
                                            <ItemRow key={`standalone-${idx}`} item={item} />
                                        ))}
                                    </div>
                                </div>
                            </Card>

                            <Divider />

                            {/* ═══ Bill Summary ═══ */}
                            <Card icon={<Receipt size={14} />} title="Bill Summary">
                                <div className="space-y-1.5">
                                    <BillRow label="Subtotal" value={formatCurrency(subtotal)} />
                                    {discountAmount > 0 && (
                                        <BillRow
                                            label={`Discount${order.couponCode ? ` (${order.couponCode})` : ""}`}
                                            value={`-${formatCurrency(discountAmount)}`}
                                            highlight="green"
                                        />
                                    )}
                                    <BillRow label="Delivery" value={deliveryFee === 0 ? "Free" : formatCurrency(deliveryFee)} />
                                    {packagingFee > 0 && <BillRow label="Packaging" value={formatCurrency(packagingFee)} />}
                                    {prepFee > 0 && <BillRow label="Prep Fee" value={formatCurrency(prepFee)} />}
                                    {order.processingFee != null && order.processingFee > 0 && (
                                        <BillRow label="Processing Fee" value={formatCurrency(order.processingFee)} />
                                    )}
                                    <div className="border-t border-warm-cream/15 pt-2.5 mt-2.5">
                                        <div className="flex justify-between text-warm-cream">
                                            <span className="text-sm font-bold">Total Charged</span>
                                            <span className="text-base font-bold">{formatCurrency(order.total)}</span>
                                        </div>
                                    </div>
                                </div>
                            </Card>

                            {/* ═══ Payment Ledger ═══ */}
                            <Card icon={<CreditCard size={14} />} title={`Payment Ledger (${payments.length})`}>
                                {payments.length === 0 ? (
                                    <p className="text-[11px] text-warm-cream/35 italic">No payment attempts recorded.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {payments.map((p) => (
                                            <div key={p.id} className="rounded-lg border border-warm-cream/10 bg-white/[0.02] px-3 py-2 text-[11px]">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="font-mono text-warm-cream/70 truncate">{p.reference}</span>
                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider ${
                                                            p.status === "paid" ? "bg-emerald-500/15 text-emerald-300" :
                                                            p.status === "failed" ? "bg-red-500/15 text-red-300" :
                                                            p.status === "abandoned" ? "bg-zinc-500/15 text-zinc-300" :
                                                            p.status === "refunded" ? "bg-purple-500/15 text-purple-300" :
                                                            p.status === "partially_refunded" ? "bg-purple-500/15 text-purple-300" :
                                                            "bg-amber-500/15 text-amber-300"
                                                        }`}>
                                                            {p.status.replace(/_/g, " ")}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleReverify(p.reference)}
                                                            disabled={reverifying === p.reference}
                                                            title="Force re-verify with Paystack"
                                                            className="p-1 rounded-md text-warm-cream/50 hover:text-brand-green hover:bg-brand-green/10 transition-colors disabled:opacity-40 cursor-pointer"
                                                        >
                                                            <RefreshCw size={11} className={reverifying === p.reference ? "animate-spin" : ""} />
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-x-2 mt-1.5 text-warm-cream/55">
                                                    <span>Charged</span><span className="text-right text-warm-cream/80">{formatCurrency(p.total_charged_kobo / 100)}</span>
                                                    {p.channel && (<><span>Channel</span><span className="text-right text-warm-cream/80">{p.channel.replace(/_/g, " ")}</span></>)}
                                                    {p.paystack_fees_kobo != null && (<><span>Paystack fee</span><span className="text-right text-warm-cream/80">{formatCurrency(p.paystack_fees_kobo / 100)}</span></>)}
                                                    {p.paid_at && (<><span>Paid</span><span className="text-right text-warm-cream/80">{new Date(p.paid_at).toLocaleString()}</span></>)}
                                                    {p.refund_status && (<><span>Refund</span><span className="text-right text-purple-300">{p.refund_status} · {formatCurrency(p.refunded_amount_kobo / 100)}</span></>)}
                                                    {p.failure_reason && (<><span>Failure</span><span className="text-right text-red-300 truncate">{p.failure_reason}</span></>)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </Card>

                            {/* ═══ Refund Form ═══ */}
                            {showRefundForm && paidPayment && (
                                <div className="rounded-lg border border-purple-500/30 bg-purple-500/[0.05] p-4 space-y-3">
                                    <div className="flex items-center gap-2 text-purple-300 text-sm font-medium">
                                        <RotateCcw size={14} />
                                        Issue Refund via Paystack
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-[11px] text-warm-cream/60">
                                            Amount (₦) — leave blank for full refund
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            max={refundable / 100}
                                            value={refundAmount}
                                            onChange={(e) => setRefundAmount(e.target.value)}
                                            placeholder={`Up to ${(refundable / 100).toLocaleString()}`}
                                            className="w-full text-sm px-3 py-2 rounded-lg bg-[#111]/80 border border-warm-cream/15 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400/40"
                                        />
                                        <label className="block text-[11px] text-warm-cream/60 mt-2">Reason (internal note)</label>
                                        <input
                                            type="text"
                                            value={refundReason}
                                            onChange={(e) => setRefundReason(e.target.value)}
                                            placeholder="e.g. wrong cut, customer complaint"
                                            className="w-full text-sm px-3 py-2 rounded-lg bg-[#111]/80 border border-warm-cream/15 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400/40"
                                        />
                                    </div>
                                    <div className="flex items-start gap-2 text-[10px] text-warm-cream/45 bg-warm-cream/[0.03] rounded-md px-2 py-1.5">
                                        <AlertTriangle size={11} className="mt-0.5 shrink-0" />
                                        Funds settle to the customer in up to 10 business days.
                                    </div>
                                    <Button
                                        size="sm"
                                        className="w-full bg-purple-600 hover:bg-purple-700"
                                        onClick={handleRefund}
                                        disabled={isRefunding}
                                    >
                                        {isRefunding ? "Initiating refund…" : "Confirm Refund"}
                                    </Button>
                                </div>
                            )}

                            {/* ═══ Policy Banner ═══ */}
                            <div className="flex items-start gap-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3.5 py-2.5">
                                <ShieldAlert size={14} className="text-amber-300 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-[10px] font-bold text-amber-300 uppercase tracking-wider">Refund Policy</p>
                                    <p className="text-[10px] text-amber-200/70 leading-relaxed mt-0.5">
                                        Refunds are issued at Zúta Ya's discretion. Once dispatched, meat orders are non-returnable due to cold-chain integrity.
                                    </p>
                                </div>
                            </div>

                            {/* ═══ Internal Notes ═══ */}
                            <Card icon={<StickyNote size={14} />} title="Internal Notes">
                                <textarea
                                    className="w-full text-sm p-3 border border-warm-cream/15 rounded-lg bg-[#111]/80 focus:bg-white/[0.04] focus:outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green/30 transition-all resize-none"
                                    rows={3}
                                    placeholder="Add private notes about this order..."
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                />
                                <div className="flex justify-end mt-2">
                                    <button
                                        onClick={handleSaveNotes}
                                        disabled={isSavingNotes || notes === (order.notes || "")}
                                        className="text-xs font-medium px-3 py-1.5 rounded-md text-brand-green hover:bg-brand-green/5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                                    >
                                        {isSavingNotes ? "Saving..." : "Save Note"}
                                    </button>
                                </div>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

/* ── Subcomponents ── */

function Card({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
    return (
        <div>
            <div className="flex items-center gap-1.5 mb-2.5">
                <span className="text-brand-green/60">{icon}</span>
                <h3 className="text-[11px] font-semibold text-warm-cream/45 uppercase tracking-wider">{title}</h3>
            </div>
            {children}
        </div>
    );
}

function Divider() {
    return <div className="border-t border-warm-cream/10" />;
}

function DetailRow({ label, value, highlight }: { label: string; value: string; highlight?: "green" }) {
    return (
        <div className="flex items-center justify-between text-xs">
            <span className="text-warm-cream/45">{label}</span>
            <span className={`font-medium ${highlight === "green" ? "text-emerald-400" : "text-warm-cream/80"}`}>{value}</span>
        </div>
    );
}

function BillRow({ label, value, highlight }: { label: string; value: string; highlight?: "green" }) {
    return (
        <div className="flex justify-between text-sm">
            <span className="text-warm-cream/55">{label}</span>
            <span className={`font-medium ${highlight === "green" ? "text-emerald-400" : "text-warm-cream/70"}`}>{value}</span>
        </div>
    );
}

function ItemRow({ item, hidePrice }: { item: Order["items"][number]; hidePrice?: boolean }) {
    if (!item.product) return null;
    const unitPrice = item.variant?.price || item.product.price;
    return (
        <div className="flex justify-between gap-3">
            <div className="min-w-0">
                <p className="text-sm text-warm-cream font-medium truncate">
                    {item.product.name}
                    <span className="text-warm-cream/40 font-normal ml-1">×{formatLineQuantity(item)}</span>
                </p>
                {item.variant?.name && (
                    <p className="text-[11px] text-warm-cream/45 mt-0.5">{item.variant.name}</p>
                )}
                {item.selectedPrepOptions && item.selectedPrepOptions.length > 0 && (
                    <p className="text-[11px] text-amber-400 mt-0.5">
                        Prep: {item.selectedPrepOptions.map(p => p.label).join(", ")}
                    </p>
                )}
            </div>
            {!hidePrice && (
                <span className="text-sm text-warm-cream font-semibold shrink-0 tabular-nums">
                    {formatCurrency(unitPrice * item.quantity)}
                </span>
            )}
        </div>
    );
}
