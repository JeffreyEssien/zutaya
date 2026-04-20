"use client";

import { Coupon } from "@/types";
import { deleteCoupon, toggleCouponStatus } from "@/lib/queries";
import { useRouter } from "next/navigation";
import Badge from "@/components/ui/Badge";
import { useState } from "react";
import { logAction } from "@/lib/auditClient";

export default function CouponList({ initialCoupons }: { initialCoupons: Coupon[] }) {
    const router = useRouter();
    const [loadingIds, setLoadingIds] = useState<string[]>([]);

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this coupon?")) return;
        try {
            await deleteCoupon(id);
            logAction("delete", "coupon", id, "Deleted coupon");
            router.refresh();
        } catch (e) {
            alert("Failed to delete");
        }
    };

    const handleToggle = async (id: string, currentStatus: boolean) => {
        setLoadingIds(prev => [...prev, id]);
        try {
            await toggleCouponStatus(id, !currentStatus);
            logAction("update", "coupon", id, `Coupon ${!currentStatus ? "activated" : "deactivated"}`);
            router.refresh();
        } catch (e) {
            alert("Failed to update status");
        } finally {
            setLoadingIds(prev => prev.filter(x => x !== id));
        }
    };

    if (initialCoupons.length === 0) {
        return <div className="p-8 text-center text-warm-cream/40 text-sm">No coupons found. Create one above.</div>;
    }

    return (
        <div>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-warm-cream/20 bg-warm-cream/5">
                            <th className="text-left px-4 py-3 font-medium text-warm-cream/60">Code</th>
                            <th className="text-left px-4 py-3 font-medium text-warm-cream/60">Discount</th>
                            <th className="text-left px-4 py-3 font-medium text-warm-cream/60">Status</th>
                            <th className="text-left px-4 py-3 font-medium text-warm-cream/60">Usage</th>
                            <th className="text-right px-4 py-3 font-medium text-warm-cream/60">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-warm-cream/10">
                        {initialCoupons.map((c) => (
                            <tr key={c.id} className="hover:bg-warm-cream/5 transition-colors">
                                <td className="px-4 py-3 font-mono font-medium text-warm-cream">{c.code}</td>
                                <td className="px-4 py-3 text-warm-cream">{c.discountPercent}%</td>
                                <td className="px-4 py-3">
                                    <button
                                        onClick={() => handleToggle(c.id, c.isActive)}
                                        disabled={loadingIds.includes(c.id)}
                                        className="disabled:opacity-50"
                                    >
                                        <Badge variant={c.isActive ? "success" : "warning"}>
                                            {c.isActive ? "Active" : "Inactive"}
                                        </Badge>
                                    </button>
                                </td>
                                <td className="px-4 py-3 text-warm-cream/60">{c.usageCount}</td>
                                <td className="px-4 py-3 text-right">
                                    <button
                                        onClick={() => handleDelete(c.id)}
                                        className="text-red-500 hover:text-red-700 text-xs hover:underline"
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden flex flex-col gap-3">
                {initialCoupons.map((c) => (
                    <div key={c.id} className="bg-white/[0.04] rounded-xl border border-warm-cream/20 p-4 shadow-sm flex flex-col gap-3">
                        <div className="flex justify-between items-center pb-3 border-b border-warm-cream/10">
                            <span className="font-mono font-medium text-warm-cream text-lg px-2 py-1 bg-warm-cream/10 rounded-md border border-warm-cream/20">
                                {c.code}
                            </span>
                            <button
                                onClick={() => handleToggle(c.id, c.isActive)}
                                disabled={loadingIds.includes(c.id)}
                                className="disabled:opacity-50"
                            >
                                <Badge variant={c.isActive ? "success" : "warning"}>
                                    {c.isActive ? "Active" : "Inactive"}
                                </Badge>
                            </button>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <div className="flex flex-col">
                                <span className="text-[10px] uppercase text-warm-cream/40">Discount</span>
                                <span className="font-medium text-warm-cream text-base">{c.discountPercent}% off</span>
                            </div>
                            <div className="flex flex-col items-center">
                                <span className="text-[10px] uppercase text-warm-cream/40">Usages</span>
                                <span className="font-medium text-warm-cream">{c.usageCount}</span>
                            </div>
                            <button
                                onClick={() => handleDelete(c.id)}
                                className="text-red-500 hover:text-red-700 text-xs font-medium px-3 py-1.5 bg-red-50 rounded-md border border-red-100"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
