"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { ProductReview } from "@/types";
import { StarRating } from "@/components/ui/StarRating";
import { BadgeCheck, Check, X, Trash2 } from "lucide-react";

interface Props {
    initialReviews: ProductReview[];
    productNames: Record<string, string>;
}

type Filter = "pending" | "approved" | "rejected" | "all";

export default function ReviewsAdminContent({ initialReviews, productNames }: Props) {
    const [reviews, setReviews] = useState(initialReviews);
    const [filter, setFilter] = useState<Filter>("pending");
    const [busy, setBusy] = useState<string | null>(null);

    const counts = useMemo(() => ({
        pending: reviews.filter((r) => r.status === "pending").length,
        approved: reviews.filter((r) => r.status === "approved").length,
        rejected: reviews.filter((r) => r.status === "rejected").length,
        all: reviews.length,
    }), [reviews]);

    const shown = filter === "all" ? reviews : reviews.filter((r) => r.status === filter);

    const moderate = async (id: string, action: "approve" | "reject") => {
        setBusy(id);
        try {
            const res = await fetch("/api/admin/reviews", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, action }),
            });
            if (!res.ok) throw new Error();
            setReviews((prev) => prev.map((r) => r.id === id ? { ...r, status: action === "approve" ? "approved" : "rejected" } : r));
            toast.success(action === "approve" ? "Review approved — now live" : "Review rejected");
        } catch {
            toast.error("Action failed");
        } finally {
            setBusy(null);
        }
    };

    const remove = async (id: string) => {
        if (!confirm("Delete this review permanently?")) return;
        setBusy(id);
        try {
            const res = await fetch("/api/admin/reviews", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id }),
            });
            if (!res.ok) throw new Error();
            setReviews((prev) => prev.filter((r) => r.id !== id));
            toast.success("Review deleted");
        } catch {
            toast.error("Delete failed");
        } finally {
            setBusy(null);
        }
    };

    const statusBadge = (s: ProductReview["status"]) => {
        const map = {
            pending: "bg-amber-500/15 text-amber-400",
            approved: "bg-green-500/15 text-green-400",
            rejected: "bg-red-500/15 text-red-400",
        } as const;
        return <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold ${map[s]}`}>{s}</span>;
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-serif text-warm-cream">Product Reviews</h1>
                <p className="text-sm text-warm-cream/50 mt-1">Approve reviews to publish them. Only approved reviews show on the store and count toward star ratings.</p>
            </div>

            <div className="flex flex-wrap gap-2">
                {(["pending", "approved", "rejected", "all"] as Filter[]).map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors ${filter === f ? "bg-brand-red text-white" : "bg-warm-cream/5 text-warm-cream/60 hover:bg-warm-cream/10"}`}
                    >
                        {f} <span className="opacity-70">({counts[f]})</span>
                    </button>
                ))}
            </div>

            {shown.length === 0 ? (
                <p className="text-sm text-warm-cream/40 py-12 text-center">No {filter === "all" ? "" : filter} reviews.</p>
            ) : (
                <div className="space-y-4">
                    {shown.map((r) => (
                        <div key={r.id} className="rounded-xl border border-warm-cream/10 bg-surface p-4 sm:p-5">
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-semibold text-warm-cream">{productNames[r.productId] || "Product"}</span>
                                    {statusBadge(r.status)}
                                    {r.verifiedPurchase && (
                                        <span className="inline-flex items-center gap-1 text-[11px] text-brand-green"><BadgeCheck size={13} /> Verified</span>
                                    )}
                                </div>
                                <StarRating value={r.rating} size={14} />
                            </div>
                            <div className="text-xs text-warm-cream/50 mb-2">
                                {r.authorName}{r.email ? ` · ${r.email}` : ""} · {new Date(r.createdAt).toLocaleDateString()}
                            </div>
                            {r.title && <p className="text-sm font-semibold text-warm-cream mb-1">{r.title}</p>}
                            {r.body && <p className="text-sm text-warm-cream/70 leading-relaxed whitespace-pre-line mb-3">{r.body}</p>}

                            <div className="flex flex-wrap gap-2">
                                {r.status !== "approved" && (
                                    <button disabled={busy === r.id} onClick={() => moderate(r.id, "approve")}
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-green-600/90 hover:bg-green-600 text-white text-xs font-semibold px-3 py-1.5 disabled:opacity-50">
                                        <Check size={14} /> Approve
                                    </button>
                                )}
                                {r.status !== "rejected" && (
                                    <button disabled={busy === r.id} onClick={() => moderate(r.id, "reject")}
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-warm-cream/10 hover:bg-warm-cream/20 text-warm-cream text-xs font-semibold px-3 py-1.5 disabled:opacity-50">
                                        <X size={14} /> Reject
                                    </button>
                                )}
                                <button disabled={busy === r.id} onClick={() => remove(r.id)}
                                    className="inline-flex items-center gap-1.5 rounded-lg text-red-400 hover:bg-red-500/10 text-xs font-semibold px-3 py-1.5 disabled:opacity-50">
                                    <Trash2 size={14} /> Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
