"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Header from "@/components/modules/Header";
import Footer from "@/components/modules/Footer";
import OrderTimeline from "@/components/modules/OrderTimeline";
import Button from "@/components/ui/Button";
import { Search, ArrowLeft, Package, MapPin, CreditCard, ShoppingBag, ArrowRight } from "lucide-react";

interface TrackedOrder {
    id: string;
    customerName: string;
    email: string;
    items: {
        product: { id: string; name: string; price: number; images: string[] };
        variant?: { name: string; price?: number };
        quantity: number;
    }[];
    subtotal: number;
    shipping: number;
    total: number;
    status: "pending" | "shipped" | "delivered";
    createdAt: string;
    shippingAddress: {
        firstName: string;
        lastName: string;
        address: string;
        city: string;
        state: string;
        zip: string;
        country: string;
    };
    couponCode?: string;
    discountTotal?: number;
    paymentMethod?: "whatsapp" | "bank_transfer";
    paymentStatus?: "awaiting_payment" | "payment_submitted" | "payment_confirmed";
}

function TrackContent() {
    const searchParams = useSearchParams();
    const prefillId = searchParams.get("id") || "";

    const [orderId, setOrderId] = useState(prefillId);
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [order, setOrder] = useState<TrackedOrder | null>(null);

    // Update orderId if URL changes
    useEffect(() => {
        if (prefillId) setOrderId(prefillId);
    }, [prefillId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!orderId.trim() || !email.trim()) {
            setError("Please enter both your Order ID and email address.");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("/api/orders/track", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderId: orderId.trim(), email: email.trim() }),
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                setError(data.error || "Order not found. Please check your Order ID and email.");
                setOrder(null);
            } else {
                setOrder(data.order);
            }
        } catch {
            setError("Something went wrong. Please check your connection and try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setOrder(null);
        setError("");
    };

    const formatDate = (date: string) =>
        new Date(date).toLocaleDateString("en-US", {
            year: "numeric", month: "long", day: "numeric",
        });

    return (
        <>
            <Header />
            <main className="min-h-[70vh] max-w-7xl mx-auto px-6 py-12 md:py-20">
                <AnimatePresence mode="wait">
                    {!order ? (
                        /* ────────────── LOOKUP FORM ────────────── */
                        <motion.div
                            key="form"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                            className="max-w-md mx-auto"
                        >
                            {/* Icon */}
                            <div className="text-center mb-8">
                                <motion.div
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 15 }}
                                    className="w-16 h-16 rounded-full bg-brand-purple/5 flex items-center justify-center mx-auto mb-5"
                                >
                                    <Package size={28} className="text-brand-purple" strokeWidth={1.5} />
                                </motion.div>
                                <h1 className="font-serif text-3xl md:text-4xl text-brand-dark mb-3">
                                    Track Your Order
                                </h1>
                                <p className="text-sm text-brand-dark/45 max-w-sm mx-auto leading-relaxed">
                                    Enter your order ID and the email you used at checkout to see your order status.
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                {/* Order ID */}
                                <div className="relative">
                                    <input
                                        id="orderId"
                                        type="text"
                                        value={orderId}
                                        onChange={(e) => { setOrderId(e.target.value); setError(""); }}
                                        placeholder=" "
                                        className={`peer w-full border rounded-xl px-4 pt-5 pb-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple/40 transition-all bg-white font-mono ${error ? "border-red-300" : "border-brand-dark/10"}`}
                                    />
                                    <label
                                        htmlFor="orderId"
                                        className="absolute left-4 top-2 text-[10px] text-brand-dark/40 transition-all pointer-events-none peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm peer-focus:top-2 peer-focus:text-[10px] peer-focus:text-brand-purple uppercase tracking-wide font-medium"
                                    >
                                        Order ID
                                    </label>
                                </div>

                                {/* Email */}
                                <div className="relative">
                                    <input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => { setEmail(e.target.value); setError(""); }}
                                        placeholder=" "
                                        className={`peer w-full border rounded-xl px-4 pt-5 pb-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple/40 transition-all bg-white ${error ? "border-red-300" : "border-brand-dark/10"}`}
                                    />
                                    <label
                                        htmlFor="email"
                                        className="absolute left-4 top-2 text-[10px] text-brand-dark/40 transition-all pointer-events-none peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm peer-focus:top-2 peer-focus:text-[10px] peer-focus:text-brand-purple uppercase tracking-wide font-medium"
                                    >
                                        Email Address
                                    </label>
                                </div>

                                {/* Error */}
                                <AnimatePresence>
                                    {error && (
                                        <motion.p
                                            initial={{ opacity: 0, y: -4 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -4 }}
                                            className="text-red-500 text-xs px-1"
                                        >
                                            {error}
                                        </motion.p>
                                    )}
                                </AnimatePresence>

                                <Button type="submit" size="lg" className="w-full" loading={loading}>
                                    <span className="flex items-center gap-2">
                                        <Search size={16} />
                                        Track Order
                                    </span>
                                </Button>
                            </form>

                            {/* Help text */}
                            <p className="text-center text-[11px] text-brand-dark/25 mt-6">
                                Your Order ID was included in your confirmation email.
                            </p>
                        </motion.div>
                    ) : (
                        /* ────────────── ORDER RESULTS ────────────── */
                        <motion.div
                            key="results"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                        >
                            {/* Back button */}
                            <button
                                onClick={handleReset}
                                className="flex items-center gap-1.5 text-xs text-brand-dark/35 hover:text-brand-purple transition-colors cursor-pointer mb-8"
                            >
                                <ArrowLeft size={12} />
                                Track another order
                            </button>

                            {/* Header */}
                            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
                                <div>
                                    <p className="text-[10px] text-brand-dark/30 uppercase tracking-[0.2em] font-medium mb-2">
                                        Order Tracking
                                    </p>
                                    <h1 className="font-serif text-2xl md:text-3xl text-brand-dark">
                                        {order.id}
                                    </h1>
                                    <p className="text-sm text-brand-dark/40 mt-1">
                                        Placed on {formatDate(order.createdAt)}
                                    </p>
                                </div>
                                <div className={`
                                    inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold self-start
                                    ${order.status === "pending" ? "bg-amber-50 text-amber-700" : ""}
                                    ${order.status === "shipped" ? "bg-blue-50 text-blue-700" : ""}
                                    ${order.status === "delivered" ? "bg-emerald-50 text-emerald-700" : ""}
                                `}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${order.status === "pending" ? "bg-amber-500" : ""} ${order.status === "shipped" ? "bg-blue-500" : ""} ${order.status === "delivered" ? "bg-emerald-500" : ""}`} />
                                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                                </div>
                            </div>

                            {/* Timeline */}
                            <motion.div
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.15 }}
                                className="bg-white border border-brand-dark/5 rounded-2xl p-6 md:p-8 mb-6 shadow-sm"
                            >
                                <OrderTimeline
                                    status={order.status}
                                    paymentMethod={order.paymentMethod}
                                    paymentStatus={order.paymentStatus}
                                    createdAt={order.createdAt}
                                />
                            </motion.div>

                            {/* Content Grid */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Items */}
                                <motion.div
                                    initial={{ opacity: 0, y: 16 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.25 }}
                                    className="lg:col-span-2 bg-white border border-brand-dark/5 rounded-2xl p-6 shadow-sm"
                                >
                                    <h2 className="flex items-center gap-2 text-sm font-semibold text-brand-dark mb-5">
                                        <ShoppingBag size={16} className="text-brand-purple" />
                                        Order Items
                                    </h2>

                                    <div className="divide-y divide-brand-dark/5">
                                        {order.items.map((item) => {
                                            const price = item.variant?.price || item.product.price;
                                            return (
                                                <div key={`${item.product.id}-${item.variant?.name ?? ""}`} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
                                                    {/* Product image */}
                                                    {item.product.images?.[0] ? (
                                                        <div className="w-14 h-14 rounded-xl bg-neutral-50 overflow-hidden shrink-0">
                                                            <img
                                                                src={item.product.images[0]}
                                                                alt={item.product.name}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div className="w-14 h-14 rounded-xl bg-brand-purple/5 flex items-center justify-center shrink-0">
                                                            <Package size={20} className="text-brand-purple/30" />
                                                        </div>
                                                    )}

                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-brand-dark truncate">
                                                            {item.product.name}
                                                        </p>
                                                        {item.variant && (
                                                            <p className="text-[11px] text-brand-dark/40 mt-0.5">
                                                                {item.variant.name}
                                                            </p>
                                                        )}
                                                        <p className="text-[11px] text-brand-dark/35 mt-0.5">
                                                            Qty: {item.quantity}
                                                        </p>
                                                    </div>

                                                    <p className="text-sm font-semibold text-brand-dark shrink-0">
                                                        ₦{(price * item.quantity).toLocaleString()}
                                                    </p>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Totals */}
                                    <div className="mt-5 pt-5 border-t border-brand-dark/5 space-y-2">
                                        <div className="flex justify-between text-sm text-brand-dark/50">
                                            <span>Subtotal</span>
                                            <span>₦{order.subtotal.toLocaleString()}</span>
                                        </div>
                                        {order.discountTotal ? (
                                            <div className="flex justify-between text-sm text-emerald-600">
                                                <span>Discount{order.couponCode ? ` (${order.couponCode})` : ""}</span>
                                                <span>-₦{order.discountTotal.toLocaleString()}</span>
                                            </div>
                                        ) : null}
                                        <div className="flex justify-between text-sm text-brand-dark/50">
                                            <span>Shipping</span>
                                            <span>{order.shipping === 0 ? "Free" : `₦${order.shipping.toLocaleString()}`}</span>
                                        </div>
                                        <div className="flex justify-between text-base font-bold text-brand-dark pt-2 border-t border-brand-dark/5">
                                            <span>Total</span>
                                            <span>₦{order.total.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </motion.div>

                                {/* Sidebar: Shipping + Payment */}
                                <motion.div
                                    initial={{ opacity: 0, y: 16 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.35 }}
                                    className="space-y-6"
                                >
                                    {/* Shipping Address */}
                                    <div className="bg-white border border-brand-dark/5 rounded-2xl p-6 shadow-sm">
                                        <h2 className="flex items-center gap-2 text-sm font-semibold text-brand-dark mb-4">
                                            <MapPin size={16} className="text-brand-purple" />
                                            Shipping Address
                                        </h2>
                                        <div className="text-sm text-brand-dark/60 space-y-1 leading-relaxed">
                                            <p className="font-medium text-brand-dark">{order.customerName}</p>
                                            <p>{order.shippingAddress.address}</p>
                                            <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zip}</p>
                                            <p>{order.shippingAddress.country}</p>
                                        </div>
                                    </div>

                                    {/* Payment Info */}
                                    <div className="bg-white border border-brand-dark/5 rounded-2xl p-6 shadow-sm">
                                        <h2 className="flex items-center gap-2 text-sm font-semibold text-brand-dark mb-4">
                                            <CreditCard size={16} className="text-brand-purple" />
                                            Payment
                                        </h2>
                                        <div className="text-sm text-brand-dark/60 space-y-2">
                                            <div className="flex justify-between">
                                                <span className="text-brand-dark/40">Method</span>
                                                <span className="font-medium text-brand-dark capitalize">
                                                    {order.paymentMethod === "bank_transfer" ? "Bank Transfer" : order.paymentMethod === "whatsapp" ? "WhatsApp" : "—"}
                                                </span>
                                            </div>
                                            {order.paymentMethod === "bank_transfer" && order.paymentStatus && (
                                                <div className="flex justify-between">
                                                    <span className="text-brand-dark/40">Status</span>
                                                    <span className={`font-medium capitalize ${order.paymentStatus === "payment_confirmed" ? "text-emerald-600" :
                                                            order.paymentStatus === "payment_submitted" ? "text-blue-600" : "text-amber-600"
                                                        }`}>
                                                        {order.paymentStatus.replace(/_/g, " ")}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Continue Shopping */}
                                    <a href="/shop">
                                        <Button variant="outline" className="w-full">
                                            <span className="flex items-center gap-2">
                                                Continue Shopping <ArrowRight size={14} />
                                            </span>
                                        </Button>
                                    </a>
                                </motion.div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
            <Footer />
        </>
    );
}

export default function TrackPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-brand-purple/20 border-t-brand-purple rounded-full animate-spin" />
            </div>
        }>
            <TrackContent />
        </Suspense>
    );
}
