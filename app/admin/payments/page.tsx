"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
    Search, CreditCard, TrendingUp, AlertCircle, RefreshCw, Filter, ChevronRight,
    CheckCircle2, Clock, XCircle, RotateCcw, ArrowDown, ArrowUp,
} from "lucide-react";
import { formatCurrency } from "@/lib/formatCurrency";

interface PaymentRow {
    id: string;
    reference: string;
    order_id: string | null;
    subscription_id: string | null;
    customer_email: string;
    amount_kobo: number;
    processing_fee_kobo: number;
    total_charged_kobo: number;
    paystack_fees_kobo: number | null;
    status: string;
    channel: string | null;
    paid_at: string | null;
    failed_at: string | null;
    refund_status: string | null;
    refunded_amount_kobo: number;
    resume_email_sent_at: string | null;
    created_at: string;
}

interface Summary {
    total30dCount: number;
    paid30dCount: number;
    failed30dCount: number;
    pending30dCount: number;
    gross30dKobo: number;
    fees30dKobo: number;
}

const STATUS_OPTIONS = ["all", "paid", "pending", "failed", "abandoned", "refunded", "partially_refunded"];

export const dynamic = "force-dynamic";

export default function AdminPaymentsPage() {
    const [payments, setPayments] = useState<PaymentRow[]>([]);
    const [summary, setSummary] = useState<Summary | null>(null);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState("all");
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [offset, setOffset] = useState(0);
    const LIMIT = 50;

    // Debounce search
    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(search), 300);
        return () => clearTimeout(t);
    }, [search]);

    const fetchPayments = useCallback(async () => {
        setLoading(true);
        const params = new URLSearchParams({
            status: statusFilter,
            limit: String(LIMIT),
            offset: String(offset),
        });
        if (debouncedSearch) params.set("search", debouncedSearch);
        const res = await fetch(`/api/admin/payments/list?${params}`);
        const data = await res.json();
        if (data.success) {
            setPayments(data.payments);
            setSummary(data.summary);
            setTotal(data.total);
        }
        setLoading(false);
    }, [statusFilter, debouncedSearch, offset]);

    useEffect(() => {
        fetchPayments();
    }, [fetchPayments]);

    const hasNext = offset + LIMIT < total;
    const hasPrev = offset > 0;

    return (
        <main className="min-h-screen bg-brand-black text-warm-cream p-6 md:p-10">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="font-serif text-3xl md:text-4xl text-warm-cream mb-1">Payments</h1>
                    <p className="text-sm text-warm-cream/45">Full ledger of every Paystack transaction.</p>
                </div>

                {/* ── KPI cards ── */}
                {summary && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <KPI
                            icon={<CheckCircle2 size={16} className="text-emerald-400" />}
                            label="Paid (30d)"
                            value={summary.paid30dCount.toLocaleString()}
                            sub={formatCurrency(summary.gross30dKobo / 100)}
                        />
                        <KPI
                            icon={<Clock size={16} className="text-amber-400" />}
                            label="Pending (30d)"
                            value={summary.pending30dCount.toLocaleString()}
                            sub="Awaiting action"
                            warn={summary.pending30dCount > 0}
                        />
                        <KPI
                            icon={<XCircle size={16} className="text-red-400" />}
                            label="Failed (30d)"
                            value={summary.failed30dCount.toLocaleString()}
                            sub="Includes abandoned"
                            warn={summary.failed30dCount > 5}
                        />
                        <KPI
                            icon={<TrendingUp size={16} className="text-brand-green" />}
                            label="Paystack Fees (30d)"
                            value={formatCurrency(summary.fees30dKobo / 100)}
                            sub={`${summary.gross30dKobo > 0 ? ((summary.fees30dKobo / summary.gross30dKobo) * 100).toFixed(2) : "0"}% of gross`}
                        />
                    </div>
                )}

                {/* ── Filters ── */}
                <div className="bg-raised border border-warm-cream/10 rounded-2xl p-4 mb-6">
                    <div className="flex flex-col md:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-cream/30" />
                            <input
                                type="text"
                                placeholder="Search reference, email, or order ID…"
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setOffset(0);
                                }}
                                className="w-full bg-base border border-warm-cream/10 rounded-xl pl-9 pr-3 py-2.5 text-sm text-warm-cream placeholder:text-warm-cream/30 focus:outline-none focus:border-brand-green/40"
                            />
                        </div>
                        <div className="flex items-center gap-2 bg-base border border-warm-cream/10 rounded-xl px-3">
                            <Filter size={14} className="text-warm-cream/30" />
                            <select
                                value={statusFilter}
                                onChange={(e) => {
                                    setStatusFilter(e.target.value);
                                    setOffset(0);
                                }}
                                className="bg-transparent py-2.5 text-sm text-warm-cream focus:outline-none cursor-pointer pr-2"
                            >
                                {STATUS_OPTIONS.map((s) => (
                                    <option key={s} value={s} className="bg-base">
                                        {s === "all" ? "All statuses" : s.replace(/_/g, " ")}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <button
                            onClick={fetchPayments}
                            className="flex items-center gap-2 px-4 py-2.5 bg-brand-green/10 hover:bg-brand-green/15 border border-brand-green/20 text-brand-green text-sm rounded-xl transition-colors"
                        >
                            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
                            Refresh
                        </button>
                    </div>
                </div>

                {/* ── Payments table ── */}
                <div className="bg-raised border border-warm-cream/10 rounded-2xl overflow-hidden">
                    {loading && payments.length === 0 ? (
                        <div className="p-12 text-center text-warm-cream/40 text-sm">Loading…</div>
                    ) : payments.length === 0 ? (
                        <div className="p-12 text-center">
                            <AlertCircle size={28} className="mx-auto text-warm-cream/20 mb-3" />
                            <p className="text-warm-cream/45 text-sm">No payments match your filters.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-warm-cream/10 bg-raised">
                                        <Th>Reference</Th>
                                        <Th>Customer</Th>
                                        <Th>Status</Th>
                                        <Th>Channel</Th>
                                        <Th align="right">Charged</Th>
                                        <Th align="right">Net</Th>
                                        <Th>When</Th>
                                        <Th />
                                    </tr>
                                </thead>
                                <tbody>
                                    {payments.map((p) => {
                                        const netKobo = (p.total_charged_kobo ?? 0) - (p.paystack_fees_kobo ?? 0) - (p.refunded_amount_kobo ?? 0);
                                        const when = p.paid_at || p.failed_at || p.created_at;
                                        return (
                                            <tr key={p.id} className="border-b border-warm-cream/5 hover:bg-raised transition-colors">
                                                <td className="px-4 py-3">
                                                    <Link
                                                        href={`/admin/payments/${encodeURIComponent(p.reference)}`}
                                                        className="font-mono text-[12px] text-warm-cream hover:text-brand-green transition-colors"
                                                    >
                                                        {p.reference}
                                                    </Link>
                                                    {p.resume_email_sent_at && (
                                                        <p className="text-[10px] text-amber-300/70 mt-0.5">📧 resume sent</p>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-warm-cream/75 truncate max-w-[220px]">{p.customer_email}</td>
                                                <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                                                <td className="px-4 py-3 text-warm-cream/55 text-xs uppercase">{p.channel?.replace(/_/g, " ") || "—"}</td>
                                                <td className="px-4 py-3 text-right tabular-nums text-warm-cream/85">{formatCurrency(p.total_charged_kobo / 100)}</td>
                                                <td className="px-4 py-3 text-right tabular-nums text-emerald-300/80 text-xs">{p.status === "paid" ? formatCurrency(netKobo / 100) : "—"}</td>
                                                <td className="px-4 py-3 text-warm-cream/45 text-xs">{new Date(when).toLocaleString("en-NG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                                                <td className="px-4 py-3">
                                                    <Link
                                                        href={`/admin/payments/${encodeURIComponent(p.reference)}`}
                                                        className="inline-flex items-center text-brand-green/70 hover:text-brand-green"
                                                    >
                                                        <ChevronRight size={16} />
                                                    </Link>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* ── Pagination ── */}
                {payments.length > 0 && (
                    <div className="flex items-center justify-between mt-4 text-xs text-warm-cream/50">
                        <span>
                            Showing {offset + 1}–{Math.min(offset + LIMIT, total)} of {total}
                        </span>
                        <div className="flex gap-2">
                            <button
                                disabled={!hasPrev}
                                onClick={() => setOffset(Math.max(0, offset - LIMIT))}
                                className="px-3 py-1.5 rounded-lg border border-warm-cream/10 hover:border-warm-cream/30 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
                            >
                                <ArrowUp size={11} /> Prev
                            </button>
                            <button
                                disabled={!hasNext}
                                onClick={() => setOffset(offset + LIMIT)}
                                className="px-3 py-1.5 rounded-lg border border-warm-cream/10 hover:border-warm-cream/30 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
                            >
                                Next <ArrowDown size={11} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}

// ── subcomponents ──

function Th({ children, align = "left" }: { children?: React.ReactNode; align?: "left" | "right" }) {
    return (
        <th className={`px-4 py-2.5 text-${align} text-[10px] font-semibold uppercase tracking-wider text-warm-cream/40`}>
            {children}
        </th>
    );
}

function KPI({
    icon, label, value, sub, warn,
}: {
    icon: React.ReactNode; label: string; value: string; sub: string; warn?: boolean;
}) {
    return (
        <div className={`bg-raised border ${warn ? "border-amber-500/20" : "border-warm-cream/10"} rounded-2xl p-4`}>
            <div className="flex items-center gap-2 mb-2">
                {icon}
                <span className="text-[10px] uppercase tracking-wider text-warm-cream/45 font-semibold">{label}</span>
            </div>
            <p className="text-2xl text-warm-cream font-semibold tabular-nums">{value}</p>
            <p className="text-[11px] text-warm-cream/40 mt-0.5">{sub}</p>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        paid: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20",
        pending: "bg-amber-500/15 text-amber-300 border border-amber-500/20",
        failed: "bg-red-500/15 text-red-300 border border-red-500/20",
        abandoned: "bg-zinc-500/15 text-zinc-300 border border-zinc-500/20",
        refunded: "bg-purple-500/15 text-purple-300 border border-purple-500/20",
        partially_refunded: "bg-purple-500/15 text-purple-300 border border-purple-500/20",
    };
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${styles[status] || "bg-zinc-500/15 text-zinc-300"}`}>
            {status.replace(/_/g, " ")}
        </span>
    );
}
