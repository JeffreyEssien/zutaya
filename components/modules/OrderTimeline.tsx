"use client";

import { motion } from "framer-motion";
import { Package, CreditCard as ProcessingIcon, BoxIcon, Truck, CheckCircle2, Clock, CreditCard, ShieldCheck } from "lucide-react";

interface OrderTimelineProps {
    status: "pending" | "processing" | "packed" | "out_for_delivery" | "delivered";
    paymentMethod?: "whatsapp" | "bank_transfer";
    paymentStatus?: "awaiting_payment" | "payment_submitted" | "payment_confirmed";
    createdAt: string;
}

const STEPS = [
    { key: "pending", label: "Pending", icon: Package },
    { key: "processing", label: "Processing", icon: ProcessingIcon },
    { key: "packed", label: "Packed", icon: BoxIcon },
    { key: "out_for_delivery", label: "Out for Delivery", icon: Truck },
    { key: "delivered", label: "Delivered", icon: CheckCircle2 },
] as const;

const STATUS_ORDER: Record<string, number> = {
    pending: 0, processing: 1, packed: 2, out_for_delivery: 3, delivered: 4,
};

const PAYMENT_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof Clock }> = {
    awaiting_payment: { label: "Awaiting Payment", color: "text-amber-600", bg: "bg-amber-50 border-amber-200", icon: Clock },
    payment_submitted: { label: "Payment Submitted", color: "text-blue-600", bg: "bg-blue-50 border-blue-200", icon: CreditCard },
    payment_confirmed: { label: "Payment Confirmed", color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200", icon: ShieldCheck },
};

export default function OrderTimeline({ status, paymentMethod, paymentStatus, createdAt }: OrderTimelineProps) {
    const currentIndex = STATUS_ORDER[status] ?? 0;
    const orderDate = new Date(createdAt).toLocaleDateString("en-US", {
        year: "numeric", month: "long", day: "numeric",
    });
    const orderTime = new Date(createdAt).toLocaleTimeString("en-US", {
        hour: "2-digit", minute: "2-digit",
    });

    const progressPercent = currentIndex === 0 ? 0 : (currentIndex / (STEPS.length - 1)) * 100;

    return (
        <div className="space-y-6">
            {/* Status Timeline */}
            <div className="relative">
                {/* Desktop: Horizontal */}
                <div className="hidden sm:block">
                    <div className="flex items-start justify-between relative">
                        {/* Connector line (behind icons) */}
                        <div className="absolute top-5 left-[10%] right-[10%] h-[2px] bg-brand-dark/8 z-0" />
                        <motion.div
                            className="absolute top-5 left-[10%] h-[2px] bg-brand-green z-0"
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPercent}%` }}
                            style={{ maxWidth: "80%" }}
                            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
                        />

                        {STEPS.map((step, i) => {
                            const isCompleted = i < currentIndex;
                            const isActive = i === currentIndex;
                            const isUpcoming = i > currentIndex;
                            const Icon = step.icon;

                            return (
                                <motion.div
                                    key={step.key}
                                    className="flex flex-col items-center flex-1 relative z-10"
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.15 * i, duration: 0.5 }}
                                >
                                    {/* Icon circle */}
                                    <div className="relative">
                                        <div className={`
                                            w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500
                                            ${isCompleted ? "bg-brand-green text-white shadow-md shadow-brand-green/20" : ""}
                                            ${isActive ? "bg-brand-red/10 text-brand-red ring-2 ring-brand-red/30 ring-offset-2 ring-offset-white" : ""}
                                            ${isUpcoming ? "bg-brand-dark/5 text-brand-dark/25" : ""}
                                        `}>
                                            <Icon size={18} strokeWidth={isCompleted || isActive ? 2.5 : 1.5} />
                                        </div>
                                        {/* Animated pulse ring for active step */}
                                        {isActive && (
                                            <span className="absolute inset-0 rounded-full animate-ping bg-brand-red/20" style={{ animationDuration: "2s" }} />
                                        )}
                                    </div>

                                    {/* Label */}
                                    <span className={`
                                        mt-3 text-xs font-medium tracking-wide text-center
                                        ${isCompleted ? "text-brand-green" : ""}
                                        ${isActive ? "text-brand-dark" : ""}
                                        ${isUpcoming ? "text-brand-dark/30" : ""}
                                    `}>
                                        {step.label}
                                    </span>

                                    {/* Active indicator */}
                                    {isActive && (
                                        <motion.span
                                            className="mt-1.5 text-[10px] text-brand-red/60 font-medium"
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: 0.6 }}
                                        >
                                            Current
                                        </motion.span>
                                    )}

                                    {/* Date for first step */}
                                    {i === 0 && (
                                        <span className="mt-1 text-[10px] text-brand-dark/30">
                                            {orderDate}
                                        </span>
                                    )}
                                </motion.div>
                            );
                        })}
                    </div>
                </div>

                {/* Mobile: Vertical */}
                <div className="block sm:hidden">
                    <div className="relative pl-8">
                        {/* Vertical connector */}
                        <div className="absolute left-[15px] top-5 bottom-5 w-[2px] bg-brand-dark/8" />
                        <motion.div
                            className="absolute left-[15px] top-5 w-[2px] bg-brand-green"
                            initial={{ height: 0 }}
                            animate={{ height: `${progressPercent}%` }}
                            style={{ maxHeight: "calc(100% - 40px)" }}
                            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
                        />

                        <div className="space-y-8">
                            {STEPS.map((step, i) => {
                                const isCompleted = i < currentIndex;
                                const isActive = i === currentIndex;
                                const isUpcoming = i > currentIndex;
                                const Icon = step.icon;

                                return (
                                    <motion.div
                                        key={step.key}
                                        className="flex items-start gap-4 relative"
                                        initial={{ opacity: 0, x: -12 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.15 * i, duration: 0.5 }}
                                    >
                                        {/* Icon */}
                                        <div className="relative">
                                            <div className={`
                                                absolute -left-8 w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10
                                                ${isCompleted ? "bg-brand-green text-white shadow-md shadow-brand-green/20" : ""}
                                                ${isActive ? "bg-brand-red/10 text-brand-red ring-2 ring-brand-red/30" : ""}
                                                ${isUpcoming ? "bg-white border border-brand-dark/10 text-brand-dark/25" : ""}
                                            `}>
                                                <Icon size={14} strokeWidth={isCompleted || isActive ? 2.5 : 1.5} />
                                            </div>
                                            {isActive && (
                                                <span className="absolute -left-8 top-0 w-8 h-8 rounded-full animate-ping bg-brand-red/20" style={{ animationDuration: "2s" }} />
                                            )}
                                        </div>

                                        {/* Text */}
                                        <div className="pt-1">
                                            <p className={`text-sm font-medium ${isCompleted || isActive ? "text-brand-dark" : "text-brand-dark/30"}`}>
                                                {step.label}
                                            </p>
                                            {i === 0 && (
                                                <p className="text-[11px] text-brand-dark/35 mt-0.5">{orderDate} at {orderTime}</p>
                                            )}
                                            {isActive && (
                                                <motion.span
                                                    className="inline-block mt-1 text-[10px] text-brand-red font-medium bg-brand-red/5 px-2 py-0.5 rounded-full"
                                                    initial={{ opacity: 0, scale: 0.8 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    transition={{ delay: 0.6 }}
                                                >
                                                    Current Status
                                                </motion.span>
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Payment Status Badge (for bank transfer orders) */}
            {paymentMethod === "bank_transfer" && paymentStatus && (
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8, duration: 0.4 }}
                    className="mt-4"
                >
                    {(() => {
                        const config = PAYMENT_CONFIG[paymentStatus];
                        if (!config) return null;
                        const PayIcon = config.icon;
                        return (
                            <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${config.bg}`}>
                                <PayIcon size={16} className={config.color} />
                                <div>
                                    <p className={`text-sm font-medium ${config.color}`}>{config.label}</p>
                                    <p className="text-[11px] text-brand-dark/40 mt-0.5">
                                        {paymentStatus === "awaiting_payment" && "Please complete your bank transfer to proceed."}
                                        {paymentStatus === "payment_submitted" && "Your payment is being verified by our team."}
                                        {paymentStatus === "payment_confirmed" && "Payment verified! Your order is being prepared."}
                                    </p>
                                </div>
                            </div>
                        );
                    })()}
                </motion.div>
            )}
        </div>
    );
}
