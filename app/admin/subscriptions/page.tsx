"use client";

import { useState, useEffect } from "react";
import type { Subscription } from "@/types";

const FREQUENCY_LABELS: Record<string, string> = {
    weekly: "Weekly",
    biweekly: "Bi-weekly",
    monthly: "Monthly",
};

const STATUS_COLORS: Record<string, string> = {
    active: "bg-brand-green/10 text-brand-green",
    paused: "bg-yellow-100 text-yellow-700",
    cancelled: "bg-red-100 text-red-600",
};

export default function AdminSubscriptionsPage() {
    const [subs, setSubs] = useState<Subscription[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const fetchSubs = async () => {
        const res = await fetch("/api/subscriptions");
        if (res.ok) {
            const data = await res.json();
            setSubs(data);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchSubs();
    }, []);

    const updateStatus = async (id: string, status: string) => {
        await fetch("/api/subscriptions", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, status }),
        });
        fetchSubs();
    };

    if (loading) {
        return <div className="p-8 text-center text-warm-cream/40">Loading subscriptions...</div>;
    }

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <h1 className="text-2xl font-bold text-warm-cream mb-6">Subscriptions</h1>

            <div className="bg-white/[0.04] rounded-xl shadow-sm border border-warm-cream/20 overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-warm-cream text-warm-cream/40">
                        <tr>
                            <th className="text-left px-4 py-3 font-medium">Customer</th>
                            <th className="text-left px-4 py-3 font-medium">Frequency</th>
                            <th className="text-left px-4 py-3 font-medium">Next Order</th>
                            <th className="text-left px-4 py-3 font-medium">Items</th>
                            <th className="text-left px-4 py-3 font-medium">Status</th>
                            <th className="text-right px-4 py-3 font-medium">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {subs.map((sub) => (
                            <>
                                <tr key={sub.id} className="border-t border-warm-cream/10">
                                    <td className="px-4 py-3">
                                        <div className="font-medium text-warm-cream">{sub.customerName}</div>
                                        <div className="text-xs text-warm-cream/40">{sub.customerEmail}</div>
                                    </td>
                                    <td className="px-4 py-3 text-warm-cream/40">
                                        {FREQUENCY_LABELS[sub.frequency] || sub.frequency}
                                    </td>
                                    <td className="px-4 py-3 text-warm-cream/40">
                                        {new Date(sub.nextOrderDate).toLocaleDateString("en-NG", {
                                            month: "short",
                                            day: "numeric",
                                            year: "numeric",
                                        })}
                                    </td>
                                    <td className="px-4 py-3">
                                        <button
                                            onClick={() => setExpandedId(expandedId === sub.id ? null : sub.id)}
                                            className="text-brand-red text-xs hover:underline"
                                        >
                                            {sub.items?.length || 0} items
                                        </button>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${STATUS_COLORS[sub.status] || "bg-warm-cream/5 text-warm-cream/40"}`}>
                                            {sub.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        {sub.status === "active" && (
                                            <>
                                                <button
                                                    onClick={() => updateStatus(sub.id, "paused")}
                                                    className="text-yellow-600 text-xs hover:underline mr-2"
                                                >
                                                    Pause
                                                </button>
                                                <button
                                                    onClick={() => updateStatus(sub.id, "cancelled")}
                                                    className="text-red-500 text-xs hover:underline"
                                                >
                                                    Cancel
                                                </button>
                                            </>
                                        )}
                                        {sub.status === "paused" && (
                                            <button
                                                onClick={() => updateStatus(sub.id, "active")}
                                                className="text-brand-green text-xs hover:underline"
                                            >
                                                Resume
                                            </button>
                                        )}
                                    </td>
                                </tr>
                                {expandedId === sub.id && (
                                    <tr key={`${sub.id}-items`} className="bg-warm-cream/50">
                                        <td colSpan={6} className="px-4 py-3">
                                            <div className="text-xs space-y-1">
                                                {sub.items?.map((item, idx) => (
                                                    <div key={idx} className="flex justify-between text-warm-cream/40">
                                                        <span>{item.productName} x{item.quantity}</span>
                                                        <span>&#8358;{(item.price * item.quantity).toLocaleString()}</span>
                                                    </div>
                                                ))}
                                                <div className="flex justify-between font-semibold text-warm-cream border-t border-warm-cream/20 pt-1">
                                                    <span>Total per delivery</span>
                                                    <span>
                                                        &#8358;{(sub.items?.reduce((s, i) => s + i.price * i.quantity, 0) || 0).toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </>
                        ))}
                        {subs.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-4 py-8 text-center text-warm-cream/40">
                                    No subscriptions yet.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
