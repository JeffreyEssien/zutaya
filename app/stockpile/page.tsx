"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { formatCurrency } from "@/lib/formatCurrency";
import Button from "@/components/ui/Button";
import { Package, Clock, Truck, Search, Archive, ShoppingBag, AlertTriangle, CheckCircle2, ArrowRight, Copy, Check } from "lucide-react";
import type { Stockpile } from "@/types";

export default function StockpilePage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-gradient-to-b from-brand-lilac/5 to-white flex items-center justify-center"><p className="text-brand-dark/30 text-sm">Loading...</p></div>}>
            <StockpileContent />
        </Suspense>
    );
}

function StockpileContent() {
    const searchParams = useSearchParams();
    const [query, setQuery] = useState("");
    const [stockpile, setStockpile] = useState<Stockpile | null>(null);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [copied, setCopied] = useState(false);
    const [successBanner, setSuccessBanner] = useState(false);

    // Auto-search from URL params (email or id)
    useEffect(() => {
        const email = searchParams.get("email");
        const id = searchParams.get("id");
        const added = searchParams.get("added");

        if (added === "true") setSuccessBanner(true);

        if (email) {
            setQuery(email);
            doSearch(email, "email");
        } else if (id) {
            setQuery(id);
            doSearch(id, "id");
        }
    }, [searchParams]);

    async function doSearch(value: string, type: "email" | "id") {
        setLoading(true);
        setSearched(true);
        try {
            const param = type === "email" ? `email=${encodeURIComponent(value)}` : `id=${encodeURIComponent(value)}`;
            const res = await fetch(`/api/stockpile?${param}`);
            const data = await res.json();
            setStockpile(data?.id ? data : null);
        } catch {
            setStockpile(null);
        }
        setLoading(false);
    }

    function handleSearch(e: React.FormEvent) {
        e.preventDefault();
        const v = query.trim();
        if (!v) return;
        // Detect if input looks like a UUID or email
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}/i.test(v);
        doSearch(v, isUuid ? "id" : "email");
    }

    function copyStockpileId() {
        if (!stockpile) return;
        navigator.clipboard.writeText(stockpile.id);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    const daysLeft = stockpile?.expiresAt
        ? Math.max(0, Math.ceil((new Date(stockpile.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        : 0;

    const statusColors: Record<string, string> = {
        active: "bg-emerald-50 text-emerald-700 border-emerald-200",
        shipped: "bg-blue-50 text-blue-700 border-blue-200",
        expired: "bg-red-50 text-red-700 border-red-200",
        cancelled: "bg-neutral-100 text-neutral-500 border-neutral-200",
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-brand-lilac/5 to-white">
            {/* Hero */}
            <div className="bg-gradient-to-br from-brand-dark via-brand-dark to-brand-purple text-white py-16 px-6">
                <div className="max-w-2xl mx-auto text-center">
                    <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full mb-6">
                        <Archive size={16} />
                        <span className="text-xs font-medium tracking-wide uppercase">Stockpile</span>
                    </div>
                    <h1 className="font-serif text-3xl md:text-4xl mb-3">Pay Now, Ship Together</h1>
                    <p className="text-white/60 text-sm md:text-base max-w-lg mx-auto leading-relaxed">
                        Build up your order over time. Pay for items as you shop, and when you're ready,
                        ship everything together with a single delivery fee. Items held for up to 14 days.
                    </p>
                </div>
            </div>

            <div className="max-w-2xl mx-auto px-6 -mt-6">
                {/* Success Banner */}
                {successBanner && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-4 flex items-center gap-3">
                        <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                        <div>
                            <p className="text-sm font-medium text-emerald-800">Items added to your stockpile!</p>
                            <p className="text-xs text-emerald-600 mt-0.5">Keep shopping or request shipping when you're ready.</p>
                        </div>
                        <button onClick={() => setSuccessBanner(false)} className="ml-auto text-emerald-400 hover:text-emerald-600 text-lg cursor-pointer">×</button>
                    </div>
                )}

                {/* Search Card */}
                <div className="bg-white rounded-2xl shadow-lg border border-brand-lilac/10 p-6 mb-8">
                    <form onSubmit={handleSearch} className="flex gap-3">
                        <div className="flex-1">
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Enter your email or stockpile ID"
                                className="w-full px-4 py-3 rounded-xl border border-brand-lilac/15 bg-neutral-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple/30 transition-all"
                                required
                            />
                        </div>
                        <Button type="submit" disabled={loading} className="shrink-0">
                            <span className="flex items-center gap-2">
                                <Search size={16} />
                                {loading ? "Searching..." : "Find"}
                            </span>
                        </Button>
                    </form>
                    <p className="text-[10px] text-brand-dark/30 mt-2 text-center">
                        Search by your email address or your stockpile ID
                    </p>
                </div>

                {/* Results */}
                {searched && !loading && (
                    <>
                        {!stockpile ? (
                            <div className="bg-white rounded-2xl border border-brand-lilac/10 p-12 text-center">
                                <div className="inline-flex p-4 bg-neutral-50 rounded-full mb-4">
                                    <Package size={28} className="text-brand-dark/15" />
                                </div>
                                <h3 className="font-medium text-brand-dark mb-2">No active stockpile found</h3>
                                <p className="text-sm text-brand-dark/40 max-w-sm mx-auto mb-6">
                                    You don't have an active stockpile yet. Start shopping and choose "Add to Stockpile"
                                    at checkout to begin building your bundle!
                                </p>
                                <a href="/shop">
                                    <Button variant="outline" size="sm">
                                        <span className="flex items-center gap-2">Start Shopping <ArrowRight size={14} /></span>
                                    </Button>
                                </a>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Status Banner */}
                                <div className={`rounded-2xl border p-5 ${statusColors[stockpile.status] || statusColors.active}`}>
                                    <div className="flex items-center justify-between flex-wrap gap-3">
                                        <div className="flex items-center gap-3">
                                            {stockpile.status === "active" && <Clock size={20} />}
                                            {stockpile.status === "shipped" && <CheckCircle2 size={20} />}
                                            {stockpile.status === "expired" && <AlertTriangle size={20} />}
                                            <div>
                                                <p className="font-semibold capitalize">{stockpile.status}</p>
                                                {stockpile.status === "active" && (
                                                    <p className="text-xs opacity-70">
                                                        {daysLeft} day{daysLeft !== 1 ? "s" : ""} remaining to ship
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        {/* Stockpile ID badge with copy */}
                                        <button
                                            onClick={copyStockpileId}
                                            className="flex items-center gap-1.5 text-xs font-mono opacity-60 hover:opacity-100 transition-opacity cursor-pointer bg-white/30 px-2.5 py-1 rounded-lg"
                                            title="Copy Stockpile ID"
                                        >
                                            {copied ? <Check size={12} /> : <Copy size={12} />}
                                            {stockpile.id.slice(0, 8)}...
                                        </button>
                                    </div>
                                    {stockpile.status === "active" && daysLeft <= 3 && (
                                        <p className="text-xs mt-3 opacity-80">
                                            ⚠️ Your stockpile expires soon! Request shipping before your items are released.
                                        </p>
                                    )}
                                </div>

                                {/* Stats */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div className="bg-white rounded-xl border border-brand-lilac/10 p-4 text-center">
                                        <p className="text-2xl font-bold text-brand-dark">{stockpile.items.length}</p>
                                        <p className="text-[10px] text-brand-dark/40 uppercase tracking-wider mt-1">Items</p>
                                    </div>
                                    <div className="bg-white rounded-xl border border-brand-lilac/10 p-4 text-center">
                                        <p className="text-2xl font-bold text-brand-dark">{formatCurrency(stockpile.totalItemsValue)}</p>
                                        <p className="text-[10px] text-brand-dark/40 uppercase tracking-wider mt-1">Total Paid</p>
                                    </div>
                                    <div className="bg-white rounded-xl border border-brand-lilac/10 p-4 text-center">
                                        <p className="text-2xl font-bold text-brand-purple">{daysLeft}</p>
                                        <p className="text-[10px] text-brand-dark/40 uppercase tracking-wider mt-1">Days Left</p>
                                    </div>
                                </div>

                                {/* Items */}
                                <div className="bg-white rounded-2xl border border-brand-lilac/10 overflow-hidden">
                                    <div className="px-5 py-4 border-b border-brand-lilac/10">
                                        <h3 className="font-medium text-brand-dark flex items-center gap-2">
                                            <ShoppingBag size={16} className="text-brand-purple" />
                                            Stockpiled Items
                                        </h3>
                                    </div>
                                    <div className="divide-y divide-brand-lilac/5">
                                        {stockpile.items.map((item) => (
                                            <div key={item.id} className="flex items-center gap-4 p-4 hover:bg-neutral-50/50 transition-colors">
                                                <div className="relative h-14 w-14 rounded-lg overflow-hidden bg-neutral-50 shrink-0">
                                                    {item.productImage ? (
                                                        <Image src={item.productImage} alt={item.productName} fill className="object-cover" sizes="56px" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            <Package size={20} className="text-brand-dark/10" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-brand-dark truncate">{item.productName}</p>
                                                    {item.variantName && (
                                                        <p className="text-[10px] text-brand-dark/40 mt-0.5">{item.variantName}</p>
                                                    )}
                                                    <p className="text-xs text-brand-dark/30 mt-0.5">Qty: {item.quantity}</p>
                                                </div>
                                                <p className="text-sm font-semibold text-brand-dark shrink-0">
                                                    {formatCurrency(item.pricePaid * item.quantity)}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Actions */}
                                {stockpile.status === "active" && (
                                    <div className="flex flex-col sm:flex-row gap-3">
                                        <a href="/shop" className="flex-1">
                                            <Button variant="outline" className="w-full">
                                                <span className="flex items-center justify-center gap-2">
                                                    <ShoppingBag size={16} /> Keep Shopping
                                                </span>
                                            </Button>
                                        </a>
                                        <a href={`/checkout?stockpile=${stockpile.id}`} className="flex-1">
                                            <Button className="w-full">
                                                <span className="flex items-center justify-center gap-2">
                                                    <Truck size={16} /> Request Shipping
                                                </span>
                                            </Button>
                                        </a>
                                    </div>
                                )}

                                {/* Stockpile ID Card */}
                                <div className="bg-brand-purple/[0.03] border border-brand-purple/10 rounded-xl p-4">
                                    <p className="text-xs text-brand-dark/40 mb-1">Your Stockpile ID</p>
                                    <div className="flex items-center gap-2">
                                        <code className="text-sm font-mono text-brand-purple bg-brand-purple/5 px-3 py-1.5 rounded-lg flex-1 overflow-x-auto">
                                            {stockpile.id}
                                        </code>
                                        <button
                                            onClick={copyStockpileId}
                                            className="px-3 py-1.5 bg-brand-purple/10 hover:bg-brand-purple/20 text-brand-purple text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                                        >
                                            {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-brand-dark/30 mt-2">
                                        Save this ID — you can use it to look up your stockpile anytime.
                                    </p>
                                </div>

                                {/* How it works */}
                                <div className="bg-neutral-50 rounded-2xl p-6 mt-4">
                                    <h4 className="font-medium text-brand-dark text-sm mb-4">How Stockpile Works</h4>
                                    <div className="space-y-3">
                                        {[
                                            { step: "1", text: "Shop & pay for items individually — each is securely held for you" },
                                            { step: "2", text: "Keep adding items over the next 14 days as you discover more favourites" },
                                            { step: "3", text: "When ready, request shipping — pay one delivery fee for everything" },
                                        ].map((s) => (
                                            <div key={s.step} className="flex items-start gap-3">
                                                <span className="w-6 h-6 shrink-0 bg-brand-purple/10 text-brand-purple text-xs font-bold rounded-full flex items-center justify-center">
                                                    {s.step}
                                                </span>
                                                <p className="text-sm text-brand-dark/60 leading-relaxed">{s.text}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* How it works (before search) */}
                {!searched && (
                    <div className="grid md:grid-cols-3 gap-4 mt-4">
                        {[
                            { icon: ShoppingBag, title: "Shop & Pay", desc: "Pay for items as you find them. No rush — they're held safely." },
                            { icon: Archive, title: "Items Held", desc: "Your paid items are stored for up to 14 days while you keep shopping." },
                            { icon: Truck, title: "Ship Together", desc: "When ready, ship everything at once with a single delivery fee." },
                        ].map((card) => (
                            <div key={card.title} className="bg-white rounded-2xl border border-brand-lilac/10 p-6 text-center">
                                <div className="inline-flex p-3 bg-brand-purple/5 rounded-xl mb-3">
                                    <card.icon size={22} className="text-brand-purple" />
                                </div>
                                <h3 className="font-medium text-brand-dark text-sm mb-1">{card.title}</h3>
                                <p className="text-xs text-brand-dark/40 leading-relaxed">{card.desc}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <div className="h-16" />
        </div>
    );
}
