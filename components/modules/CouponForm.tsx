"use client";

import { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import { createCoupon } from "@/lib/queries";
import { logAction } from "@/lib/auditClient";

export default function CouponForm({ onSuccess }: { onSuccess: () => void }) {
    const [code, setCode] = useState("");
    const [discount, setDiscount] = useState("");
    const [loading, setLoading] = useState(false);
    const [warning, setWarning] = useState<string | null>(null);
    const [minMargin, setMinMargin] = useState<number>(100);

    // Fetch inventory to calculate safe margins
    useEffect(() => {
        import("@/lib/queries").then(({ getInventoryItems }) => {
            getInventoryItems().then(items => {
                let lowest = 100;
                items.forEach(item => {
                    if (item.sellingPrice > 0) {
                        const margin = ((item.sellingPrice - item.costPrice) / item.sellingPrice) * 100;
                        if (margin < lowest) lowest = margin;
                    }
                });
                setMinMargin(lowest);
            });
        });
    }, []);

    const handleDiscountChange = (val: string) => {
        setDiscount(val);
        const num = parseFloat(val);
        if (!isNaN(num)) {
            if (num > minMargin) {
                setWarning(`⚠️ Warning: This discount exceeds the margin of your lowest margin product (${minMargin.toFixed(1)}%). Some items may be sold at a loss.`);
            } else if (minMargin - num < 5) {
                setWarning(`⚠️ Caution: This reduces your lowest margin to ${(minMargin - num).toFixed(1)}%.`);
            } else {
                setWarning(null);
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await createCoupon({
                code,
                discountPercent: parseInt(discount),
                isActive: true,
            });
            logAction("create", "coupon", undefined, `Created coupon: ${code} (${discount}%)`);
            setCode("");
            setDiscount("");
            setWarning(null);
            onSuccess();
        } catch (error) {
            alert("Failed to create coupon. Code might already exist.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 bg-white p-4 rounded-lg border border-brand-lilac/20">
            <div className="flex gap-4 items-end">
                <div>
                    <label className="block text-xs text-brand-dark/60 mb-1">Coupon Code</label>
                    <input
                        required
                        value={code}
                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                        placeholder="e.g. SUMMER20"
                        className="border border-brand-lilac/20 rounded px-3 py-2 text-sm uppercase w-48"
                    />
                </div>
                <div>
                    <label className="block text-xs text-brand-dark/60 mb-1">Discount %</label>
                    <input
                        required
                        type="number"
                        min="1"
                        max="100"
                        value={discount}
                        onChange={(e) => handleDiscountChange(e.target.value)}
                        placeholder="20"
                        className="border border-brand-lilac/20 rounded px-3 py-2 text-sm w-24"
                    />
                </div>
                <Button type="submit" disabled={loading}>
                    {loading ? "Creating..." : "Create Coupon"}
                </Button>
            </div>
            {warning && (
                <div className={`text-xs px-3 py-2 rounded ${warning.includes("exceeds") ? "bg-red-50 text-red-600 border border-red-100" : "bg-amber-50 text-amber-600 border border-amber-100"}`}>
                    {warning}
                </div>
            )}
        </form>
    );
}
