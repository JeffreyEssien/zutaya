"use client";

import { useState } from "react";
import Link from "next/link";
import type { Order } from "@/types";
import { formatCurrency } from "@/lib/formatCurrency";
import { updateOrderStatus, updateOrderNotes, updatePaymentInfo } from "@/lib/queries";
import { WHATSAPP_NUMBER } from "@/lib/constants";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { logAction } from "@/lib/auditClient";
import {
    X, Printer, MessageCircle, CheckCircle2, Package, Truck, PartyPopper,
    CreditCard, User, MapPin, ChefHat, ShoppingBag, Receipt, StickyNote, ShieldAlert,
    Clock, Send, Ban, Copy, Check
} from "lucide-react";

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
    const [isApprovingPayment, setIsApprovingPayment] = useState(false);
    const [copied, setCopied] = useState(false);

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

    const handleApprovePayment = async () => {
        if (!confirm("Approve this payment? This confirms you've received the bank transfer.")) return;
        setIsApprovingPayment(true);
        try {
            await updatePaymentInfo(order.id, { paymentStatus: "payment_confirmed" });
            logAction("update", "order", order.id, "Payment approved (bank transfer confirmed)");
            if (onUpdate) onUpdate();
        } catch {
            alert("Failed to approve payment");
        } finally {
            setIsApprovingPayment(false);
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
            line += ` × ${item.quantity} — ${formatCurrency(price * item.quantity)}`;
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
            parts.push(`  Method: ${order.paymentMethod === "bank_transfer" ? "Bank Transfer" : "WhatsApp"}`);
            if (order.senderName) parts.push(`  Sender: ${order.senderName}`);
            if (order.paymentStatus) {
                const ps = order.paymentStatus === "payment_confirmed" ? "Confirmed" : order.paymentStatus === "payment_submitted" ? "Awaiting Approval" : "Unpaid";
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
            processing: `Hi ${order.customerName.split(" ")[0]}! ✅\n\nYour payment for order *${order.id}* (₦${order.total.toLocaleString()}) has been *confirmed*!\n\nWe're now preparing your order. We'll notify you once it's packed.\n\nThank you for choosing Zúta Ya!`,
            packed: `Hi ${order.customerName.split(" ")[0]}! 📦\n\nGreat news! Your order *${order.id}* has been packed and is ready for delivery.\n\n*Order Total:* ₦${order.total.toLocaleString()}\n*Delivering To:* ${addr.address}, ${addr.city}\n\nWe'll let you know once it's out for delivery. Thank you for choosing Zúta Ya!`,
            out_for_delivery: `Hi ${order.customerName.split(" ")[0]}! 🚚\n\nYour order *${order.id}* is out for delivery!\n\n*Delivering To:* ${addr.address}, ${addr.city}\n\nPlease ensure someone is available to receive the package. Thank you for choosing Zúta Ya!`,
            delivered: `Hi ${order.customerName.split(" ")[0]}! 🎉\n\nYour order *${order.id}* has been delivered!\n\nWe hope you enjoy your fresh cuts. If you have any questions, feel free to reach out.\n\nThank you for choosing Zúta Ya!`,
            payment_confirmed: `Hi ${order.customerName.split(" ")[0]}! ✅\n\nYour payment for order *${order.id}* (₦${order.total.toLocaleString()}) has been *confirmed*!\n\nWe're now preparing your order. We'll notify you once it's packed.\n\nThank you for choosing Zúta Ya!`,
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

    // Group bundle items
    const bundleGroups: Record<string, typeof order.items> = {};
    const standaloneItems: typeof order.items = [];
    for (const item of order.items) {
        if (item.bundleId) {
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
                    <div className="w-full bg-white rounded-t-2xl xl:rounded-t-none xl:rounded-xl border border-brand-lilac/15 xl:sticky xl:top-24 animate-slideUp xl:animate-none shadow-2xl xl:shadow-md overflow-hidden">

                        {/* ═══ Header ═══ */}
                        <div className="bg-gradient-to-r from-brand-dark to-brand-purple px-5 sm:px-6 py-4">
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
                                {order.paymentMethod && (
                                    <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${
                                        order.paymentStatus === "payment_confirmed"
                                            ? "bg-emerald-400/20 text-emerald-200"
                                            : order.paymentStatus === "payment_submitted"
                                                ? "bg-amber-400/20 text-amber-200"
                                                : "bg-red-400/20 text-red-200"
                                    }`}>
                                        <CreditCard size={11} />
                                        {order.paymentStatus === "payment_confirmed"
                                            ? "Paid"
                                            : order.paymentStatus === "payment_submitted"
                                                ? "Awaiting Approval"
                                                : "Unpaid"}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="px-5 sm:px-6 py-5 space-y-5">

                            {/* ═══ Quick Actions ═══ */}
                            <div className="space-y-2.5">
                                <div className="grid grid-cols-2 gap-2">
                                    {nextStatus && (
                                        <Button
                                            size="sm"
                                            className="col-span-2 gap-1.5"
                                            onClick={() => handleStatusUpdate(nextStatus)}
                                            disabled={isUpdatingStatus}
                                        >
                                            {isUpdatingStatus ? "Updating..." : (
                                                <>{nextStatusIcon[nextStatus]} {nextStatusLabel[nextStatus]}</>
                                            )}
                                        </Button>
                                    )}

                                    {order.paymentMethod === "bank_transfer" &&
                                        order.paymentStatus === "payment_submitted" && (
                                        <Button
                                            size="sm"
                                            className="col-span-2 bg-emerald-600 hover:bg-emerald-700 gap-1.5"
                                            onClick={handleApprovePayment}
                                            disabled={isApprovingPayment}
                                        >
                                            <CheckCircle2 size={14} />
                                            {isApprovingPayment ? "Approving..." : "Approve Payment"}
                                        </Button>
                                    )}

                                    <button
                                        onClick={messageCustomer}
                                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-[#25D366] bg-[#25D366]/8 hover:bg-[#25D366]/15 border border-[#25D366]/20 transition-colors cursor-pointer"
                                    >
                                        <MessageCircle size={13} /> Message
                                    </button>

                                    {/* Contextual WhatsApp status update */}
                                    {order.paymentStatus === "payment_confirmed" && order.status === "pending" && (
                                        <button
                                            onClick={() => sendWhatsAppStatusUpdate("payment_confirmed")}
                                            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
                                        >
                                            <Send size={12} /> Confirm via WA
                                        </button>
                                    )}
                                    {order.status === "packed" && (
                                        <button
                                            onClick={() => sendWhatsAppStatusUpdate("packed")}
                                            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors cursor-pointer"
                                        >
                                            <Send size={12} /> Packed via WA
                                        </button>
                                    )}
                                    {order.status === "out_for_delivery" && (
                                        <button
                                            onClick={() => sendWhatsAppStatusUpdate("out_for_delivery")}
                                            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors cursor-pointer"
                                        >
                                            <Send size={12} /> Dispatched via WA
                                        </button>
                                    )}
                                    {order.status === "delivered" && (
                                        <button
                                            onClick={() => sendWhatsAppStatusUpdate("delivered")}
                                            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition-colors cursor-pointer"
                                        >
                                            <Send size={12} /> Delivered via WA
                                        </button>
                                    )}
                                </div>

                                {order.status !== "delivered" && (
                                    <button
                                        onClick={() => {
                                            if (confirm("Are you sure you want to cancel this order?")) {
                                                alert("Cancel logic not yet implemented in DB");
                                            }
                                        }}
                                        className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                    >
                                        <Ban size={12} /> Cancel Order
                                    </button>
                                )}
                            </div>

                            <Divider />

                            {/* ═══ Customer & Delivery - side by side on wider panels ═══ */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                {/* Customer */}
                                <Card icon={<User size={14} />} title="Customer">
                                    <p className="text-sm text-brand-dark font-medium">{order.customerName}</p>
                                    <p className="text-xs text-brand-dark/50 mt-0.5">{order.email}</p>
                                    <p className="text-xs text-brand-dark/50">{order.phone}</p>
                                    {order.paymentMethod && (
                                        <div className="mt-2 pt-2 border-t border-brand-lilac/10">
                                            <DetailRow label="Payment" value={order.paymentMethod === "bank_transfer" ? "Bank Transfer" : "WhatsApp"} />
                                            {order.senderName && <DetailRow label="Sender" value={order.senderName} />}
                                        </div>
                                    )}
                                </Card>

                                {/* Delivery */}
                                <Card icon={<MapPin size={14} />} title="Delivery">
                                    <p className="text-sm text-brand-dark leading-snug">{addr.address}</p>
                                    <p className="text-xs text-brand-dark/60">{addr.city}, {addr.state} {addr.zip}</p>
                                    <div className="mt-2 pt-2 border-t border-brand-lilac/10 space-y-1">
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
                                                <div className="bg-amber-50 border border-amber-200/60 rounded-lg px-3 py-2.5">
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
                                    {/* Bundle groups */}
                                    {Object.entries(bundleGroups).map(([bundleId, items]) => (
                                        <div key={bundleId} className="mb-3 last:mb-0">
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                                                    {items[0].bundleName || "Bundle"}
                                                </span>
                                                {items[0].bundleDiscount && items[0].bundleDiscount > 0 && (
                                                    <span className="text-[10px] font-medium text-emerald-600">
                                                        {items[0].bundleDiscount}% off
                                                    </span>
                                                )}
                                            </div>
                                            <div className="border-l-2 border-emerald-200 pl-3 space-y-1.5">
                                                {items.map((item, idx) => (
                                                    <ItemRow key={`${bundleId}-${idx}`} item={item} />
                                                ))}
                                            </div>
                                        </div>
                                    ))}

                                    {/* Standalone items */}
                                    {standaloneItems.length > 0 && Object.keys(bundleGroups).length > 0 && (
                                        <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-dark/40 mb-1.5 mt-3">Individual Items</p>
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
                                    <div className="border-t border-brand-lilac/15 pt-2.5 mt-2.5">
                                        <div className="flex justify-between text-brand-dark">
                                            <span className="text-sm font-bold">Total</span>
                                            <span className="text-base font-bold">{formatCurrency(order.total)}</span>
                                        </div>
                                    </div>
                                </div>
                            </Card>

                            {/* ═══ Policy Banner ═══ */}
                            <div className="flex items-start gap-2.5 bg-red-50/80 border border-red-100 rounded-lg px-3.5 py-2.5">
                                <ShieldAlert size={14} className="text-red-400 mt-0.5 shrink-0" />
                                <div>
                                    <p className="text-[10px] font-bold text-red-700 uppercase tracking-wider">No Returns / No Refunds</p>
                                    <p className="text-[10px] text-red-500/80 leading-relaxed mt-0.5">
                                        All meat sales are final. Due to the perishable nature of our products, we do not accept returns or issue refunds once dispatched.
                                    </p>
                                </div>
                            </div>

                            {/* ═══ Internal Notes ═══ */}
                            <Card icon={<StickyNote size={14} />} title="Internal Notes">
                                <textarea
                                    className="w-full text-sm p-3 border border-brand-lilac/15 rounded-lg bg-neutral-50/80 focus:bg-white focus:outline-none focus:border-brand-purple focus:ring-1 focus:ring-brand-purple/30 transition-all resize-none"
                                    rows={3}
                                    placeholder="Add private notes about this order..."
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                />
                                <div className="flex justify-end mt-2">
                                    <button
                                        onClick={handleSaveNotes}
                                        disabled={isSavingNotes || notes === (order.notes || "")}
                                        className="text-xs font-medium px-3 py-1.5 rounded-md text-brand-purple hover:bg-brand-purple/5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
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
                <span className="text-brand-purple/60">{icon}</span>
                <h3 className="text-[11px] font-semibold text-brand-dark/45 uppercase tracking-wider">{title}</h3>
            </div>
            {children}
        </div>
    );
}

function Divider() {
    return <div className="border-t border-brand-lilac/10" />;
}

function DetailRow({ label, value, highlight }: { label: string; value: string; highlight?: "green" }) {
    return (
        <div className="flex items-center justify-between text-xs">
            <span className="text-brand-dark/45">{label}</span>
            <span className={`font-medium ${highlight === "green" ? "text-emerald-600" : "text-brand-dark/80"}`}>{value}</span>
        </div>
    );
}

function BillRow({ label, value, highlight }: { label: string; value: string; highlight?: "green" }) {
    return (
        <div className="flex justify-between text-sm">
            <span className="text-brand-dark/55">{label}</span>
            <span className={`font-medium ${highlight === "green" ? "text-emerald-600" : "text-brand-dark/70"}`}>{value}</span>
        </div>
    );
}

function ItemRow({ item }: { item: Order["items"][number] }) {
    const unitPrice = item.variant?.price || item.product.price;
    return (
        <div className="flex justify-between gap-3">
            <div className="min-w-0">
                <p className="text-sm text-brand-dark font-medium truncate">
                    {item.product.name}
                    <span className="text-brand-dark/40 font-normal ml-1">×{item.quantity}</span>
                </p>
                {item.variant?.name && (
                    <p className="text-[11px] text-brand-dark/45 mt-0.5">{item.variant.name}</p>
                )}
                {item.selectedPrepOptions && item.selectedPrepOptions.length > 0 && (
                    <p className="text-[11px] text-amber-700 mt-0.5">
                        Prep: {item.selectedPrepOptions.map(p => p.label).join(", ")}
                    </p>
                )}
            </div>
            <span className="text-sm text-brand-dark font-semibold shrink-0 tabular-nums">
                {formatCurrency(unitPrice * item.quantity)}
            </span>
        </div>
    );
}
