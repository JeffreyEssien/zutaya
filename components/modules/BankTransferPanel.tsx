"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { formatCurrency } from "@/lib/formatCurrency";
import { BANK_NAME, BANK_ACCOUNT_NUMBER, BANK_ACCOUNT_NAME } from "@/lib/constants";
import Button from "@/components/ui/Button";
import { Building2, Copy, Check, CreditCard, ArrowRight, User } from "lucide-react";
import { toast } from "sonner";

interface BankTransferPanelProps {
    orderId: string;
    totalAmount: number;
    onPaymentConfirmed: () => void;
}

export default function BankTransferPanel({ orderId, totalAmount, onPaymentConfirmed }: BankTransferPanelProps) {
    const [senderName, setSenderName] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [copied, setCopied] = useState<string | null>(null);

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        setCopied(label);
        toast.success(`${label} copied!`);
        setTimeout(() => setCopied(null), 2000);
    };

    const handleConfirmPayment = async () => {
        if (!senderName.trim()) {
            toast.error("Please enter the name on your sending account.");
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch(`/api/orders/${orderId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    senderName: senderName.trim(),
                    paymentStatus: "payment_submitted",
                }),
            });

            if (!res.ok) throw new Error("Failed to confirm payment");

            toast.success("Payment confirmation sent! Admin will verify shortly.");
            onPaymentConfirmed();
        } catch (err) {
            console.error(err);
            toast.error("Failed to submit confirmation. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-lg mx-auto"
        >
            {/* Header */}
            <div className="text-center mb-8">
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 15 }}
                    className="w-16 h-16 rounded-full bg-brand-green/10 flex items-center justify-center mx-auto mb-4"
                >
                    <Building2 size={28} className="text-brand-green" />
                </motion.div>
                <h2 className="font-serif text-2xl text-warm-cream mb-2">Complete Your Payment</h2>
                <p className="text-warm-cream/50 text-sm">
                    Transfer the exact amount below to complete your order.
                </p>
            </div>

            {/* Amount Card */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-gradient-to-br from-brand-dark to-brand-purple text-white rounded-2xl p-6 mb-6 text-center"
            >
                <p className="text-white/50 text-xs uppercase tracking-wider mb-1">Amount to Pay</p>
                <p className="text-3xl font-bold tracking-tight">{formatCurrency(totalAmount)}</p>
                <p className="text-white/40 text-xs mt-2 font-mono">Order: {orderId}</p>
            </motion.div>

            {/* Bank Details */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-[#222] border border-warm-cream/15 rounded-2xl overflow-hidden mb-6"
            >
                <div className="px-6 py-4 border-b border-warm-cream/10 bg-brand-black/[0.03]">
                    <div className="flex items-center gap-2">
                        <CreditCard size={14} className="text-brand-green" />
                        <h3 className="text-sm font-semibold text-warm-cream">Bank Account Details</h3>
                    </div>
                </div>
                <div className="px-6 py-5 space-y-4">
                    <DetailRow
                        label="Bank Name"
                        value={BANK_NAME}
                        onCopy={() => copyToClipboard(BANK_NAME, "Bank Name")}
                        isCopied={copied === "Bank Name"}
                    />
                    <DetailRow
                        label="Account Number"
                        value={BANK_ACCOUNT_NUMBER}
                        onCopy={() => copyToClipboard(BANK_ACCOUNT_NUMBER, "Account Number")}
                        isCopied={copied === "Account Number"}
                        mono
                    />
                    <DetailRow
                        label="Account Name"
                        value={BANK_ACCOUNT_NAME}
                        onCopy={() => copyToClipboard(BANK_ACCOUNT_NAME, "Account Name")}
                        isCopied={copied === "Account Name"}
                    />
                </div>
            </motion.div>

            {/* Sender Name Input */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-[#222] border border-warm-cream/15 rounded-2xl p-6 mb-6"
            >
                <div className="flex items-center gap-2 mb-4">
                    <User size={14} className="text-brand-green" />
                    <h3 className="text-sm font-semibold text-warm-cream">Payment Confirmation</h3>
                </div>
                <label className="block text-xs text-warm-cream/50 mb-2">
                    Name on the account you sent payment from
                </label>
                <input
                    type="text"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full border border-warm-cream/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green/40 transition-all"
                />
                <p className="text-[10px] text-warm-cream/30 mt-2">
                    This helps the admin verify your payment faster.
                </p>
            </motion.div>

            {/* Confirm Button */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
            >
                <Button
                    size="lg"
                    className="w-full"
                    onClick={handleConfirmPayment}
                    loading={submitting}
                >
                    <span className="flex items-center gap-2">
                        I&apos;ve Made Payment <ArrowRight size={16} />
                    </span>
                </Button>
                <p className="text-center text-[10px] text-warm-cream/30 mt-3">
                    After confirming, the admin will verify your payment and approve your order.
                </p>
            </motion.div>
        </motion.div>
    );
}

function DetailRow({ label, value, onCopy, isCopied, mono }: {
    label: string; value: string; onCopy: () => void; isCopied: boolean; mono?: boolean;
}) {
    return (
        <div className="flex items-center justify-between">
            <div>
                <p className="text-[10px] text-warm-cream/40 uppercase tracking-wider">{label}</p>
                <p className={`text-sm text-warm-cream font-medium mt-0.5 ${mono ? "font-mono tracking-wider" : ""}`}>
                    {value}
                </p>
            </div>
            <button
                type="button"
                onClick={onCopy}
                className="p-2 hover:bg-warm-cream/5 rounded-lg transition-colors cursor-pointer"
                title={`Copy ${label}`}
            >
                {isCopied ? (
                    <Check size={14} className="text-emerald-500" />
                ) : (
                    <Copy size={14} className="text-warm-cream/30" />
                )}
            </button>
        </div>
    );
}
