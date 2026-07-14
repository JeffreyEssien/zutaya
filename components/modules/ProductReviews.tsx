"use client";

import { useState } from "react";
import type { ProductReview, ReviewSummary } from "@/types";
import { StarRating, StarInput } from "@/components/ui/StarRating";
import { BadgeCheck, Check } from "lucide-react";

interface Props {
    productId: string;
    productName: string;
    initialReviews: ProductReview[];
    summary: ReviewSummary;
}

function formatDate(iso: string) {
    try {
        return new Date(iso).toLocaleDateString("en-NG", { year: "numeric", month: "short", day: "numeric" });
    } catch {
        return "";
    }
}

export default function ProductReviews({ productId, productName, initialReviews, summary }: Props) {
    const [showForm, setShowForm] = useState(false);
    const [rating, setRating] = useState(0);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [title, setTitle] = useState("");
    const [body, setBody] = useState("");
    const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
    const [msg, setMsg] = useState("");

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (status === "loading") return;
        if (rating < 1) { setStatus("error"); setMsg("Please pick a star rating."); return; }
        setStatus("loading");
        try {
            const res = await fetch("/api/reviews", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ productId, authorName: name, email, rating, title, body }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || "Failed");
            setStatus("done");
            setMsg("Thank you! Your review will appear once it's approved.");
        } catch (err: any) {
            setStatus("error");
            setMsg(err?.message || "Something went wrong. Please try again.");
        }
    };

    const total = summary.count || 1;

    return (
        <section id="reviews" className="max-w-7xl mx-auto px-6 py-12 border-t border-warm-cream/10">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
                <div>
                    <h2 className="font-serif text-2xl sm:text-3xl text-warm-cream mb-2">Customer Reviews</h2>
                    {summary.count > 0 ? (
                        <div className="flex items-center gap-3">
                            <span className="text-3xl font-bold text-warm-cream">{summary.average.toFixed(1)}</span>
                            <div>
                                <StarRating value={summary.average} size={18} />
                                <p className="text-xs text-warm-cream/50 mt-0.5">{summary.count} review{summary.count > 1 ? "s" : ""}</p>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-warm-cream/50">No reviews yet — be the first to review {productName}.</p>
                    )}
                </div>
                <button
                    onClick={() => setShowForm((s) => !s)}
                    className="self-start rounded-full border border-warm-cream/20 px-5 py-2.5 text-sm font-semibold text-warm-cream hover:bg-warm-cream/5 transition-colors"
                >
                    {showForm ? "Close" : "Write a review"}
                </button>
            </div>

            {/* Distribution bars */}
            {summary.count > 0 && (
                <div className="grid sm:grid-cols-2 gap-x-12 gap-y-1.5 mb-10 max-w-xl">
                    {[5, 4, 3, 2, 1].map((star) => {
                        const c = summary.distribution[star] || 0;
                        return (
                            <div key={star} className="flex items-center gap-2 text-xs text-warm-cream/60">
                                <span className="w-8 shrink-0">{star}★</span>
                                <div className="flex-1 h-1.5 rounded-full bg-warm-cream/10 overflow-hidden">
                                    <div className="h-full bg-gold-accent rounded-full" style={{ width: `${(c / total) * 100}%` }} />
                                </div>
                                <span className="w-6 text-right shrink-0">{c}</span>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Submit form */}
            {showForm && (
                <div className="mb-10 rounded-2xl border border-warm-cream/10 bg-raised p-5 sm:p-6 max-w-2xl">
                    {status === "done" ? (
                        <p className="flex items-center gap-2 text-brand-green"><Check size={18} /> {msg}</p>
                    ) : (
                        <form onSubmit={submit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-warm-cream/70 mb-1.5">Your rating</label>
                                <StarInput value={rating} onChange={(v) => { setRating(v); if (status === "error") setStatus("idle"); }} />
                            </div>
                            <div className="grid sm:grid-cols-2 gap-3">
                                <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name"
                                    className="rounded-lg bg-base border border-warm-cream/15 px-3.5 py-2.5 text-sm text-warm-cream placeholder:text-warm-cream/40 focus:outline-none focus:border-brand-red/50" />
                                <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Your email (not shown)"
                                    className="rounded-lg bg-base border border-warm-cream/15 px-3.5 py-2.5 text-sm text-warm-cream placeholder:text-warm-cream/40 focus:outline-none focus:border-brand-red/50" />
                            </div>
                            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (optional)"
                                className="w-full rounded-lg bg-base border border-warm-cream/15 px-3.5 py-2.5 text-sm text-warm-cream placeholder:text-warm-cream/40 focus:outline-none focus:border-brand-red/50" />
                            <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Tell others about your experience…" rows={4}
                                className="w-full rounded-lg bg-base border border-warm-cream/15 px-3.5 py-2.5 text-sm text-warm-cream placeholder:text-warm-cream/40 focus:outline-none focus:border-brand-red/50 resize-y" />
                            {status === "error" && <p className="text-xs text-red-400">{msg}</p>}
                            <button type="submit" disabled={status === "loading"}
                                className="rounded-full bg-brand-red px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-red/90 transition-colors disabled:opacity-60">
                                {status === "loading" ? "Submitting…" : "Submit review"}
                            </button>
                            <p className="text-[11px] text-warm-cream/40">Reviews are checked before they appear. Your email is only used to verify your purchase and is never published.</p>
                        </form>
                    )}
                </div>
            )}

            {/* Review list */}
            {initialReviews.length > 0 && (
                <div className="space-y-6 max-w-3xl">
                    {initialReviews.map((r) => (
                        <div key={r.id} className="border-b border-warm-cream/10 pb-6 last:border-0">
                            <div className="flex items-center justify-between gap-3 mb-1.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-semibold text-warm-cream">{r.authorName}</span>
                                    {r.verifiedPurchase && (
                                        <span className="inline-flex items-center gap-1 text-[11px] text-brand-green">
                                            <BadgeCheck size={13} /> Verified Purchase
                                        </span>
                                    )}
                                </div>
                                <span className="text-xs text-warm-cream/40 shrink-0">{formatDate(r.createdAt)}</span>
                            </div>
                            <StarRating value={r.rating} size={14} className="mb-2" />
                            {r.title && <p className="text-sm font-semibold text-warm-cream mb-1">{r.title}</p>}
                            {r.body && <p className="text-sm text-warm-cream/70 leading-relaxed whitespace-pre-line">{r.body}</p>}
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}
