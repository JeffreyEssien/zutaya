"use client";

import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/formatCurrency";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import {
    Archive, Clock, Truck, Package, Search, RefreshCw, CheckCircle2,
    AlertTriangle, XCircle, ChevronDown, ChevronUp, Mail, Copy, Check,
    Calendar, User, Phone, Hash, ShoppingBag, ExternalLink,
} from "lucide-react";
import type { Stockpile } from "@/types";

export default function StockpileManagement() {
    const [stockpiles, setStockpiles] = useState<Stockpile[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filterStatus, setFilterStatus] = useState<string>("all");
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const fetchStockpiles = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/stockpile?all=true");
            const data = await res.json();
            setStockpiles(Array.isArray(data) ? data : []);
        } catch { setStockpiles([]); }
        setLoading(false);
    };

    useEffect(() => { fetchStockpiles(); }, []);

    const updateStatus = async (id: string, status: string) => {
        if (status === "cancelled" && !confirm("Cancel this stockpile? An expiry email will be sent to the customer.")) return;
        if (status === "shipped" && !confirm("Mark this stockpile as shipped? A shipping email will be sent to the customer.")) return;
        setActionLoading(id);
        try {
            await fetch("/api/stockpile", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "update_status", stockpileId: id, status }),
            });
            await fetchStockpiles();
        } catch (e) { console.error(e); }
        setActionLoading(null);
    };

    const copyId = (id: string) => {
        navigator.clipboard.writeText(id);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const filtered = stockpiles.filter((s) => {
        if (filterStatus !== "all" && s.status !== filterStatus) return false;
        if (search) {
            const q = search.toLowerCase();
            return (
                s.customerName.toLowerCase().includes(q) ||
                s.customerEmail.toLowerCase().includes(q) ||
                s.id.toLowerCase().includes(q) ||
                s.phone?.toLowerCase().includes(q)
            );
        }
        return true;
    });

    const statusVariant = (status: string): "success" | "info" | "warning" | "danger" | "default" => {
        switch (status) {
            case "active": return "success";
            case "shipped": return "info";
            case "expired": return "danger";
            case "cancelled": return "default";
            default: return "default";
        }
    };

    const counts = {
        active: stockpiles.filter((s) => s.status === "active").length,
        shipped: stockpiles.filter((s) => s.status === "shipped").length,
        expired: stockpiles.filter((s) => s.status === "expired").length,
        total: stockpiles.length,
        totalValue: stockpiles.reduce((sum, s) => sum + s.totalItemsValue, 0),
    };

    const daysLeft = (expiresAt: string) =>
        Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

    const formatDate = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const formatTime = (d: string) => new Date(d).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

    return (
        <div className="space-y-6">
            {/* Metric Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                    { label: "Active", value: counts.active, icon: Archive, color: "text-emerald-600 bg-emerald-50", click: () => setFilterStatus("active") },
                    { label: "Shipped", value: counts.shipped, icon: Truck, color: "text-blue-600 bg-blue-50", click: () => setFilterStatus("shipped") },
                    { label: "Expired", value: counts.expired, icon: AlertTriangle, color: "text-red-500 bg-red-50", click: () => setFilterStatus("expired") },
                    { label: "Total", value: counts.total, icon: Package, color: "text-brand-purple bg-brand-purple/10", click: () => setFilterStatus("all") },
                    { label: "Total Value", value: formatCurrency(counts.totalValue), icon: ShoppingBag, color: "text-amber-600 bg-amber-50", click: () => { } },
                ].map((m) => (
                    <div
                        key={m.label}
                        onClick={m.click}
                        className="bg-white rounded-xl border border-brand-lilac/10 p-4 cursor-pointer hover:shadow-sm transition-shadow"
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] text-brand-dark/40 uppercase tracking-wider">{m.label}</span>
                            <span className={`p-1.5 rounded-lg ${m.color}`}><m.icon size={14} /></span>
                        </div>
                        <p className="text-xl font-bold text-brand-dark">{m.value}</p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-dark/30" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by name, email, phone, or ID..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-brand-lilac/15 text-sm focus:outline-none focus:ring-2 focus:ring-brand-purple/20"
                    />
                </div>
                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-4 py-2.5 rounded-xl border border-brand-lilac/15 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-purple/20"
                >
                    <option value="all">All ({counts.total})</option>
                    <option value="active">Active ({counts.active})</option>
                    <option value="shipped">Shipped ({counts.shipped})</option>
                    <option value="expired">Expired ({counts.expired})</option>
                    <option value="cancelled">Cancelled</option>
                </select>
                <Button variant="outline" size="sm" onClick={fetchStockpiles} disabled={loading}>
                    <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                </Button>
            </div>

            {/* List */}
            {loading ? (
                <div className="text-center py-12 text-brand-dark/30">Loading stockpiles...</div>
            ) : filtered.length === 0 ? (
                <div className="bg-white rounded-xl border border-brand-lilac/10 p-12 text-center">
                    <Archive size={28} className="mx-auto text-brand-dark/10 mb-3" />
                    <p className="text-brand-dark/40 text-sm">No stockpiles found</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map((s) => {
                        const expanded = expandedId === s.id;
                        const dl = daysLeft(s.expiresAt);
                        const isUrgent = s.status === "active" && dl <= 3;
                        return (
                            <div key={s.id} className={`bg-white rounded-xl border overflow-hidden transition-shadow ${isUrgent ? "border-red-200 shadow-sm shadow-red-50" : "border-brand-lilac/10"}`}>
                                {/* Header row */}
                                <div
                                    className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-neutral-50/50 transition-colors"
                                    onClick={() => setExpandedId(expanded ? null : s.id)}
                                >
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-medium text-sm text-brand-dark">{s.customerName}</span>
                                            <Badge variant={statusVariant(s.status)}>
                                                <span className="flex items-center gap-1 text-[10px] capitalize">{s.status}</span>
                                            </Badge>
                                            {isUrgent && (
                                                <span className="text-[10px] text-red-500 font-semibold animate-pulse">⚠️ {dl}d left</span>
                                            )}
                                        </div>
                                        <p className="text-xs text-brand-dark/40 mt-0.5">
                                            {s.customerEmail} · {s.items.length} item{s.items.length !== 1 ? "s" : ""} · {formatCurrency(s.totalItemsValue)}
                                        </p>
                                    </div>
                                    <div className="text-right shrink-0 hidden sm:block">
                                        <p className="text-xs text-brand-dark/30">{formatDate(s.createdAt)}</p>
                                        {s.status === "active" && (
                                            <p className={`text-xs font-medium ${dl <= 3 ? "text-red-500" : "text-brand-purple"}`}>{dl} days remaining</p>
                                        )}
                                        {s.status === "shipped" && s.shippedAt && (
                                            <p className="text-xs text-blue-500">Shipped {formatDate(s.shippedAt)}</p>
                                        )}
                                    </div>
                                    {expanded ? <ChevronUp size={16} className="text-brand-dark/30" /> : <ChevronDown size={16} className="text-brand-dark/30" />}
                                </div>

                                {/* Expanded details */}
                                {expanded && (
                                    <div className="border-t border-brand-lilac/8 px-5 py-5 space-y-5 bg-neutral-50/30">
                                        {/* Customer details */}
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                            <div className="flex items-center gap-2 bg-white rounded-lg p-3 border border-brand-lilac/5">
                                                <User size={14} className="text-brand-dark/30" />
                                                <div className="min-w-0">
                                                    <p className="text-[10px] text-brand-dark/40">Customer</p>
                                                    <p className="text-xs font-medium text-brand-dark truncate">{s.customerName}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 bg-white rounded-lg p-3 border border-brand-lilac/5">
                                                <Mail size={14} className="text-brand-dark/30" />
                                                <div className="min-w-0">
                                                    <p className="text-[10px] text-brand-dark/40">Email</p>
                                                    <p className="text-xs font-medium text-brand-dark truncate">{s.customerEmail}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 bg-white rounded-lg p-3 border border-brand-lilac/5">
                                                <Phone size={14} className="text-brand-dark/30" />
                                                <div className="min-w-0">
                                                    <p className="text-[10px] text-brand-dark/40">Phone</p>
                                                    <p className="text-xs font-medium text-brand-dark">{s.phone || "—"}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 bg-white rounded-lg p-3 border border-brand-lilac/5">
                                                <button onClick={() => copyId(s.id)} className="cursor-pointer">
                                                    {copiedId === s.id ? <Check size={14} className="text-emerald-500" /> : <Hash size={14} className="text-brand-dark/30" />}
                                                </button>
                                                <div className="min-w-0">
                                                    <p className="text-[10px] text-brand-dark/40">Stockpile ID</p>
                                                    <p className="text-xs font-mono text-brand-purple truncate cursor-pointer" onClick={() => copyId(s.id)}>
                                                        {s.id.slice(0, 12)}...
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Timeline */}
                                        <div className="bg-white rounded-xl border border-brand-lilac/5 p-4">
                                            <p className="text-[10px] font-medium text-brand-dark/40 mb-3 uppercase tracking-wider">Timeline</p>
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                                                    <div className="flex-1 flex items-center justify-between">
                                                        <span className="text-xs text-brand-dark">Stockpile Created</span>
                                                        <span className="text-[10px] text-brand-dark/40">{formatDate(s.createdAt)} · {formatTime(s.createdAt)}</span>
                                                    </div>
                                                </div>
                                                {s.items.length > 0 && (
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
                                                        <div className="flex-1 flex items-center justify-between">
                                                            <span className="text-xs text-brand-dark">{s.items.length} item{s.items.length !== 1 ? "s" : ""} added</span>
                                                            <span className="text-[10px] text-brand-dark/40">
                                                                Last: {formatDate(s.items[s.items.length - 1].createdAt)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-2 h-2 rounded-full shrink-0 ${s.status === "active" ? "bg-amber-400 animate-pulse" : s.status === "shipped" ? "bg-brand-purple" : "bg-red-400"}`} />
                                                    <div className="flex-1 flex items-center justify-between">
                                                        <span className="text-xs text-brand-dark">
                                                            {s.status === "active" ? `Expires` : s.status === "shipped" ? "Shipped" : "Expired"}
                                                        </span>
                                                        <span className="text-[10px] text-brand-dark/40">
                                                            {s.status === "shipped" && s.shippedAt
                                                                ? `${formatDate(s.shippedAt)} · ${formatTime(s.shippedAt)}`
                                                                : `${formatDate(s.expiresAt)} · ${formatTime(s.expiresAt)}`}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Items */}
                                        <div>
                                            <p className="text-[10px] font-medium text-brand-dark/40 mb-2 uppercase tracking-wider">
                                                Items ({s.items.length})
                                            </p>
                                            <div className="space-y-2">
                                                {s.items.map((item) => (
                                                    <div key={item.id} className="flex items-center justify-between text-sm bg-white rounded-lg p-3 border border-brand-lilac/5">
                                                        <div className="min-w-0 flex-1">
                                                            <p className="font-medium text-brand-dark truncate">{item.productName}</p>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                {item.variantName && <span className="text-[10px] text-brand-dark/40">{item.variantName}</span>}
                                                                <span className="text-[10px] text-brand-dark/30">Added {formatDate(item.createdAt)}</span>
                                                            </div>
                                                        </div>
                                                        <div className="text-right shrink-0 ml-4">
                                                            <p className="font-semibold text-brand-dark">{formatCurrency(item.pricePaid * item.quantity)}</p>
                                                            <p className="text-[10px] text-brand-dark/30">×{item.quantity}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            {/* Total */}
                                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-brand-lilac/10 px-1">
                                                <span className="text-xs font-medium text-brand-dark/50">Items Total</span>
                                                <span className="text-sm font-bold text-brand-dark">{formatCurrency(s.totalItemsValue)}</span>
                                            </div>
                                        </div>

                                        {/* Delivery Info (if set) */}
                                        {(s.deliveryZone || s.deliveryFee > 0) && (
                                            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                                                <p className="text-[10px] font-medium text-blue-600/60 mb-2 uppercase tracking-wider">Delivery Details</p>
                                                <div className="grid grid-cols-3 gap-3 text-xs">
                                                    <div>
                                                        <p className="text-blue-500/60">Zone</p>
                                                        <p className="font-medium text-blue-800">{s.deliveryZone || "—"}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-blue-500/60">Type</p>
                                                        <p className="font-medium text-blue-800 capitalize">{s.deliveryType || "—"}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-blue-500/60">Fee</p>
                                                        <p className="font-medium text-blue-800">{formatCurrency(s.deliveryFee)}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Actions */}
                                        <div className="flex gap-2 pt-1 flex-wrap">
                                            {s.status === "active" && (
                                                <>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => updateStatus(s.id, "shipped")}
                                                        loading={actionLoading === s.id}
                                                    >
                                                        <span className="flex items-center gap-1.5"><Truck size={14} /> Mark Shipped</span>
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => updateStatus(s.id, "cancelled")}
                                                        loading={actionLoading === s.id}
                                                    >
                                                        <span className="flex items-center gap-1.5"><XCircle size={14} /> Cancel</span>
                                                    </Button>
                                                </>
                                            )}
                                            <a
                                                href={`/stockpile?id=${s.id}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-brand-purple hover:bg-brand-purple/5 border border-brand-purple/15 rounded-lg transition-colors"
                                            >
                                                <ExternalLink size={12} /> Customer View
                                            </a>
                                            <button
                                                onClick={() => copyId(s.id)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-brand-dark/50 hover:bg-neutral-100 border border-brand-lilac/15 rounded-lg transition-colors cursor-pointer"
                                            >
                                                {copiedId === s.id ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy ID</>}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
