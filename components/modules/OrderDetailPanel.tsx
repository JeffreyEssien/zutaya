import { useState } from "react";
import Link from "next/link";
import type { Order } from "@/types";
import { formatCurrency } from "@/lib/formatCurrency";
import { updateOrderStatus, updateOrderNotes, updatePaymentInfo } from "@/lib/queries";
import { WHATSAPP_NUMBER } from "@/lib/constants";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

const statusVariant: Record<Order["status"], "warning" | "info" | "success"> = {
    pending: "warning",
    processing: "info",
    packed: "info",
    out_for_delivery: "info",
    delivered: "success",
};

interface OrderDetailPanelProps {
    order: Order;
    onClose: () => void;
    onUpdate?: () => void; // Callback to refresh data
}

export default function OrderDetailPanel({ order, onClose, onUpdate }: OrderDetailPanelProps) {
    const addr = order.shippingAddress;
    const [notes, setNotes] = useState(order.notes || "");
    const [isSavingNotes, setIsSavingNotes] = useState(false);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    const [isApprovingPayment, setIsApprovingPayment] = useState(false);

    const handleStatusUpdate = async (status: Order["status"]) => {
        if (!confirm(`Mark order as ${status}?`)) return;
        setIsUpdatingStatus(true);
        try {
            await updateOrderStatus(order.id, status);
            if (onUpdate) onUpdate();
        } catch (error) {
            alert("Failed to update status");
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    const handleSaveNotes = async () => {
        setIsSavingNotes(true);
        try {
            await updateOrderNotes(order.id, notes);
            alert("Notes saved");
            if (onUpdate) onUpdate();
        } catch (error) {
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
            if (onUpdate) onUpdate();
        } catch (error) {
            alert("Failed to approve payment");
        } finally {
            setIsApprovingPayment(false);
        }
    };

    const openWhatsApp = (message: string) => {
        const phone = order.phone.replace(/^0/, "234").replace(/\D/g, "");
        window.open(
            `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
            "_blank"
        );
    };

    const messageCustomer = () => {
        openWhatsApp(
            `Hi ${order.customerName.split(" ")[0]}! 👋\n\nRegarding your Zúta Ya order *${order.id}*, `
        );
    };

    const sendWhatsAppStatusUpdate = (status: string) => {
        const messages: Record<string, string> = {
            processing: `Hi ${order.customerName.split(" ")[0]}! ✅\n\nYour payment for order *${order.id}* (₦${order.total.toLocaleString()}) has been *confirmed*!\n\nWe're now preparing your order. We'll notify you once it's packed.\n\nThank you for choosing Zúta Ya!`,
            packed: `Hi ${order.customerName.split(" ")[0]}! 📦\n\nGreat news! Your order *${order.id}* has been packed and is ready for delivery.\n\n*Order Total:* ₦${order.total.toLocaleString()}\n*Delivering To:* ${order.shippingAddress.address}, ${order.shippingAddress.city}\n\nWe'll let you know once it's out for delivery. Thank you for choosing Zúta Ya!`,
            out_for_delivery: `Hi ${order.customerName.split(" ")[0]}! 🚚\n\nYour order *${order.id}* is out for delivery!\n\n*Delivering To:* ${order.shippingAddress.address}, ${order.shippingAddress.city}\n\nPlease ensure someone is available to receive the package. Thank you for choosing Zúta Ya!`,
            delivered: `Hi ${order.customerName.split(" ")[0]}! 🎉\n\nYour order *${order.id}* has been delivered!\n\nWe hope you enjoy your fresh cuts. If you have any questions, feel free to reach out.\n\nThank you for choosing Zúta Ya!`,
            payment_confirmed: `Hi ${order.customerName.split(" ")[0]}! ✅\n\nYour payment for order *${order.id}* (₦${order.total.toLocaleString()}) has been *confirmed*!\n\nWe're now preparing your order. We'll notify you once it's packed.\n\nThank you for choosing Zúta Ya!`,
        };
        openWhatsApp(messages[status] || `Hi! Regarding your order ${order.id}...`);
    };

    return (
        <>
            {/* Mobile backdrop overlay */}
            <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm xl:hidden" onClick={onClose} />

            {/* Panel: full-screen modal on mobile, sticky sidebar on desktop */}
            <div className="fixed inset-0 z-50 overflow-y-auto xl:relative xl:inset-auto xl:z-auto">
                <div className="min-h-full flex items-end xl:items-start xl:min-h-0">
                    <div className="w-full bg-white rounded-t-2xl xl:rounded-t-none xl:rounded-lg border border-brand-lilac/20 p-5 sm:p-6 space-y-5 sm:space-y-6 xl:sticky xl:top-24 animate-slideUp xl:animate-none shadow-xl xl:shadow-none">
                        <div className="flex items-center justify-between">
                            <h2 className="font-serif text-lg text-brand-dark">{order.id.slice(0, 8)}...</h2>
                            <div className="flex gap-2">
                                <Link
                                    href={`/admin/orders/${order.id}/print`}
                                    target="_blank"
                                    className="text-xs font-medium text-brand-purple hover:underline flex items-center gap-1"
                                >
                                    <span>🖨️ Print</span>
                                </Link>
                                <button type="button" onClick={onClose} className="text-brand-dark/40 hover:text-brand-dark cursor-pointer p-1">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="grid grid-cols-2 gap-3">
                            {order.status === "pending" && (
                                <Button
                                    size="sm"
                                    onClick={() => handleStatusUpdate("processing")}
                                    disabled={isUpdatingStatus}
                                >
                                    Mark Processing
                                </Button>
                            )}
                            {order.status === "processing" && (
                                <Button
                                    size="sm"
                                    onClick={() => handleStatusUpdate("packed")}
                                    disabled={isUpdatingStatus}
                                >
                                    Mark Packed
                                </Button>
                            )}
                            {order.status === "packed" && (
                                <Button
                                    size="sm"
                                    onClick={() => handleStatusUpdate("out_for_delivery")}
                                    disabled={isUpdatingStatus}
                                >
                                    Mark Out for Delivery
                                </Button>
                            )}
                            {order.status === "out_for_delivery" && (
                                <Button
                                    size="sm"
                                    onClick={() => handleStatusUpdate("delivered")}
                                    disabled={isUpdatingStatus}
                                >
                                    Mark Delivered
                                </Button>
                            )}
                            <button
                                onClick={messageCustomer}
                                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-[#25D366] bg-[#25D366]/8 hover:bg-[#25D366]/15 border border-[#25D366]/20 transition-colors cursor-pointer"
                            >
                                💬 Message Customer
                            </button>
                            <Button
                                size="sm"
                                variant="outline"
                                className="text-red-500 border-red-200 hover:bg-red-50 hover:border-red-300"
                                onClick={() => {
                                    if (confirm("Are you sure you want to cancel this order?")) {
                                        alert("Cancel logic not yet implemented in DB");
                                    }
                                }}
                            >
                                Cancel Order
                            </Button>
                        </div>

                        {/* WhatsApp Status Notifications */}
                        {(order.status !== "pending" || order.paymentStatus === "payment_confirmed") && (
                            <div className="space-y-2">
                                <p className="text-[10px] font-semibold text-brand-dark/40 uppercase tracking-wider">WhatsApp Notifications</p>
                                <div className="flex flex-wrap gap-2">
                                    {order.paymentStatus === "payment_confirmed" && (
                                        <button
                                            onClick={() => sendWhatsAppStatusUpdate("payment_confirmed")}
                                            className="text-xs px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
                                        >
                                            ✅ Send Payment Confirmed
                                        </button>
                                    )}
                                    {order.status === "packed" && (
                                        <button
                                            onClick={() => sendWhatsAppStatusUpdate("packed")}
                                            className="text-xs px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors cursor-pointer"
                                        >
                                            📦 Send Packed Update
                                        </button>
                                    )}
                                    {order.status === "out_for_delivery" && (
                                        <button
                                            onClick={() => sendWhatsAppStatusUpdate("out_for_delivery")}
                                            className="text-xs px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors cursor-pointer"
                                        >
                                            🚚 Send Out for Delivery Update
                                        </button>
                                    )}
                                    {order.status === "delivered" && (
                                        <button
                                            onClick={() => sendWhatsAppStatusUpdate("delivered")}
                                            className="text-xs px-3 py-1.5 rounded-full bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition-colors cursor-pointer"
                                        >
                                            🎉 Send Delivered Update
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        <Section title="Status">
                            <Badge variant={statusVariant[order.status]}>{order.status}</Badge>
                            <p className="text-xs text-brand-dark/50 mt-1">
                                Placed on {new Date(order.createdAt).toLocaleString()}
                            </p>
                        </Section>

                        {/* Payment Info */}
                        {order.paymentMethod && (
                            <Section title="Payment">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-brand-dark/50">Method:</span>
                                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${order.paymentMethod === "bank_transfer"
                                            ? "bg-blue-50 text-blue-700"
                                            : "bg-green-50 text-green-700"
                                            }`}>
                                            {order.paymentMethod === "bank_transfer" ? "Bank Transfer" : "WhatsApp"}
                                        </span>
                                    </div>
                                    {order.senderName && (
                                        <div>
                                            <span className="text-xs text-brand-dark/50">Sender:</span>
                                            <p className="text-sm text-brand-dark font-medium">{order.senderName}</p>
                                        </div>
                                    )}
                                    {order.paymentStatus && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-brand-dark/50">Payment:</span>
                                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${order.paymentStatus === "payment_confirmed"
                                                ? "bg-emerald-50 text-emerald-700"
                                                : order.paymentStatus === "payment_submitted"
                                                    ? "bg-amber-50 text-amber-700"
                                                    : "bg-red-50 text-red-700"
                                                }`}>
                                                {order.paymentStatus === "payment_confirmed"
                                                    ? "✓ Confirmed"
                                                    : order.paymentStatus === "payment_submitted"
                                                        ? "⏳ Awaiting Approval"
                                                        : "⏳ Awaiting Payment"}
                                            </span>
                                        </div>
                                    )}
                                    {order.paymentMethod === "bank_transfer" &&
                                        order.paymentStatus === "payment_submitted" && (
                                            <Button
                                                size="sm"
                                                onClick={handleApprovePayment}
                                                disabled={isApprovingPayment}
                                                className="mt-2 w-full bg-emerald-600 hover:bg-emerald-700"
                                            >
                                                {isApprovingPayment ? "Approving..." : "✓ Approve Payment"}
                                            </Button>
                                        )}
                                </div>
                            </Section>
                        )}

                        <Section title="Internal Notes">
                            <textarea
                                className="w-full text-sm p-3 border border-brand-lilac/20 rounded-md bg-neutral-50 focus:bg-white focus:outline-none focus:border-brand-purple focus:ring-1 focus:ring-brand-purple transition-all"
                                rows={3}
                                placeholder="Add private notes here..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            />
                            <div className="flex justify-end mt-2">
                                <button
                                    onClick={handleSaveNotes}
                                    disabled={isSavingNotes || notes === order.notes}
                                    className="text-xs font-medium text-brand-purple hover:text-brand-dark disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSavingNotes ? "Saving..." : "Save Note"}
                                </button>
                            </div>
                        </Section>

                        <Section title="Customer">
                            <p className="text-sm text-brand-dark font-medium">{order.customerName}</p>
                            <p className="text-xs text-brand-dark/60">{order.email}</p>
                            <p className="text-xs text-brand-dark/60">{order.phone}</p>
                        </Section>

                        <Section title="Delivery Address">
                            <p className="text-sm text-brand-dark">{addr.address}</p>
                            <p className="text-sm text-brand-dark">{addr.city}, {addr.state} {addr.zip}</p>
                            <p className="text-sm text-brand-dark">{addr.country}</p>
                        </Section>

                        {order.items.length > 0 && (
                            <Section title="Items">
                                <ul className="space-y-2">
                                    {order.items.map((item) => (
                                        <li key={`${item.product.id}-${item.variant?.name}`} className="flex justify-between text-sm gap-2">
                                            <span className="text-brand-dark/80 min-w-0 truncate">
                                                {item.product.name}
                                                {item.variant && <span className="text-brand-dark/60 ml-1">({item.variant.name})</span>}
                                                <span className="text-brand-dark/40 ml-1">×{item.quantity}</span>
                                            </span>
                                            <span className="text-brand-dark font-medium shrink-0">
                                                {formatCurrency((item.variant?.price || item.product.price) * item.quantity)}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </Section>
                        )}

                        <Section title="Totals">
                            <div className="space-y-1">
                                <Row label="Subtotal" value={formatCurrency(order.subtotal)} />
                                <Row label="Shipping" value={order.shipping === 0 ? "Free" : formatCurrency(order.shipping)} />
                                <div className="border-t border-brand-lilac/10 pt-2 mt-2">
                                    <Row label="Total" value={formatCurrency(order.total)} bold />
                                </div>
                            </div>
                        </Section>
                    </div>
                </div>
            </div>
        </>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div>
            <h3 className="text-xs font-semibold text-brand-dark/40 uppercase tracking-wider mb-2">{title}</h3>
            {children}
        </div>
    );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
    return (
        <div className={`flex justify-between text-sm ${bold ? "font-medium text-brand-dark" : "text-brand-dark/70"}`}>
            <span>{label}</span>
            <span>{value}</span>
        </div>
    );
}
