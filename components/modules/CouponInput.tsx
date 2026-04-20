"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCartStore } from "@/lib/cartStore";
import Button from "@/components/ui/Button";
import { Tag, X, Check, ChevronDown } from "lucide-react";

export default function CouponInput() {
    const { applyCoupon, removeCoupon, discount, couponCode } = useCartStore();
    const [code, setCode] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [expanded, setExpanded] = useState(false);

    const handleApply = async () => {
        if (!code) return;
        setLoading(true);
        const success = await applyCoupon(code);
        setLoading(false);
        if (success) {
            setError("");
            setCode("");
        } else {
            setError("Invalid coupon code");
        }
    };

    if (discount > 0) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center justify-between bg-emerald-50 border border-emerald-200/60 rounded-xl px-4 py-3"
            >
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center">
                        <Check size={12} className="text-emerald-600" />
                    </div>
                    <div>
                        <span className="text-sm text-emerald-700 font-medium">{couponCode}</span>
                        <span className="text-xs text-emerald-600 ml-1.5">({discount}% off)</span>
                    </div>
                </div>
                <button
                    onClick={removeCoupon}
                    className="p-1.5 hover:bg-emerald-100 rounded-full transition-colors cursor-pointer"
                >
                    <X size={14} className="text-emerald-600" />
                </button>
            </motion.div>
        );
    }

    return (
        <div>
            <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-2 text-xs text-warm-cream/40 hover:text-brand-green transition-colors cursor-pointer mb-2"
            >
                <Tag size={12} />
                <span>Have a coupon code?</span>
                <ChevronDown size={12} className={`transition-transform duration-300 ${expanded ? "rotate-180" : ""}`} />
            </button>
            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                    >
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={code}
                                onChange={(e) => { setCode(e.target.value); setError(""); }}
                                placeholder="Enter code"
                                className={`flex-1 bg-[#222] border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green/40 uppercase tracking-wide transition-all ${error ? "border-red-300 shake" : "border-brand-dark/10"}`}
                            />
                            <Button size="sm" variant="outline" onClick={handleApply} loading={loading}>
                                Apply
                            </Button>
                        </div>
                        {error && (
                            <motion.p
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-red-500 text-[10px] mt-1.5 ml-1"
                            >
                                {error}
                            </motion.p>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
