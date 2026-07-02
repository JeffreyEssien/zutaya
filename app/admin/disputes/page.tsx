"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
    AlertTriangle, RefreshCw, Filter, ChevronRight, Clock,
    CheckCircle2, XCircle, ExternalLink,
} from "lucide-react";
import { formatCurrency } from "@/lib/formatCurrency";

interface DisputeRow {
    id: string;
    payment_id: string | null;
    reference: string;
    paystack_dispute_id: number | null;
    amount_kobo: number | null;
    currency: string | null;
    category: string | null;
    reason: string | null;
    status: string;
    resolution: string | null;
    due_at: string | null;
    resolved_at: string | null;
    created_at: string;
}

const STATUS_OPTIONS = ["all", "awaiting_evidence", "pending", "resolved", "declined"];

export const dynamic = "force-dynamic";

export default function AdminDisputesPage() {
    const [disputes, setDisputes] = useState<DisputeRow[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState("all");
    const [offset, setOffset] = useState(0);
    const LIMIT = 50;

    const fetchData = useCallback(async () => {
        setLoading(true);
        const params = new URLSearchParams({
            status: statusFilter,
            limit: String(LIMIT),
            offset: String(offset),
        });
        const res = await fetch(`/api/admin/disputes?${params}`);
        const data = await res.json();
        if (data.success) {
            setDisputes(data.disputes);
            setTotal(data.total);
        }
        setLoading(false);
    }, [statusFilter, offset]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const openCount = disputes.filter((d) => d.status !== "resolved" && d.status !== "declined").length;

    return (
        <main className="min-h-screen bg-brand-black text-warm-cream p-6 md:p-10">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
                    <div>
                        <h1 className="font-serif text-3xl md:text-4xl text-warm-cream mb-1 flex items-center gap-3">
                            Chargeback Disputes
                            {openCount > 0 && (
                                <span className="text-xs font-semibold bg-red-500/20 text-red-300 border border-red-500/30 px-2.5 py-1 rounded-full">
                                    {openCount} open
                                </span>
                            )}
                        </h1>
                        <p className="text-sm text-warm-cream/45">Customer chargebacks via Paystack. Respond before the deadline.</p>
                    </div>
                    <a
                        href="https://dashboard.paystack.com/#/disputes"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl border border-warm-cream/20 hover:border-brand-green/40 text-warm-cream/70 hover:text-warm-cream transition-colors"
                    >
                        Paystack Dashboard <ExternalLink size={13} />
                    </a>
                </div>

                {/* Filters */}
                <div className="bg-raised border border-warm-cream/10 rounded-2xl p-4 mb-6 flex flex-wrap gap-3">
                    <div className="flex items-center gap-2 bg-base border border-warm-cream/10 rounded-xl px-3 flex-1 min-w-[200px]">
                        <Filter size={14} className="text-warm-cream/30" />
                        <select
                            value={statusFilter}
                            onChange={(e) => {
                                setStatusFilter(e.target.value);
                                setOffset(0);
                            }}
                            className="bg-transparent py-2.5 text-sm text-warm-cream focus:outline-none cursor-pointer w-full"
                        >
                            {STATUS_OPTIONS.map((s) => (
                                <option key={s} value={s} className="bg-base text-warm-cream">
                                    {s === "all" ? "All statuses" : s.replace(/_/g, " ")}
                                </option>
                            ))}
                        </select>
                    </div>
                    <button
                        onClick={fetchData}
                        className="flex items-center gap-2 px-4 py-2.5 bg-brand-green/10 hover:bg-brand-green/15 border border-brand-green/20 text-brand-green text-sm rounded-xl transition-colors"
                    >
                        <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
                        Refresh
                    </button>
                </div>

                {/* Disputes table */}
                <div className="bg-raised border border-warm-cream/10 rounded-2xl overflow-hidden">
                    {loading && disputes.length === 0 ? (
                        <div className="p-12 text-center text-warm-cream/40 text-sm">Loading…</div>
                    ) : disputes.length === 0 ? (
                        <div className="p-12 text-center">
                            <CheckCircle2 size={28} className="mx-auto text-emerald-400/60 mb-3" />
                            <p className="text-warm-cream/60 text-sm font-medium">No disputes — nice work.</p>
                            <p className="text-warm-cream/35 text-xs mt-1">Disputes appear here when a customer challenges a charge with their bank.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-warm-cream/10 bg-raised">
                                        <Th>Status</Th>
                                        <Th>Reference</Th>
                                        <Th>Category</Th>
                                        <Th align="right">Amount</Th>
                                        <Th>Deadline</Th>
                                        <Th>Opened</Th>
                                        <Th />
                                    </tr>
                                </thead>
                                <tbody>
                                    {disputes.map((d) => {
                                        const isUrgent = isDeadlineUrgent(d.due_at);
                                        return (
                                            <tr key={d.id} className={`border-b border-warm-cream/5 transition-colors ${isUrgent ? "bg-red-500/[0.04] hover:bg-red-500/[0.07]" : "hover:bg-raised"}`}>
                                                <td className="px-4 py-3"><DisputeBadge status={d.status} resolution={d.resolution} /></td>
                                                <td className="px-4 py-3">
                                                    <Link href={`/admin/payments/${encodeURIComponent(d.reference)}`} className="font-mono text-[12px] text-warm-cream hover:text-brand-green">
                                                        {d.reference}
                                                    </Link>
                                                </td>
                                                <td className="px-4 py-3 text-warm-cream/65 text-xs">{d.category || "—"}</td>
                                                <td className="px-4 py-3 text-right tabular-nums text-warm-cream/85">{d.amount_kobo != null ? formatCurrency(d.amount_kobo / 100) : "—"}</td>
                                                <td className="px-4 py-3">
                                                    {d.due_at ? (
                                                        <span className={`inline-flex items-center gap-1.5 text-xs ${isUrgent ? "text-red-300 font-semibold" : "text-warm-cream/55"}`}>
                                                            <Clock size={11} />
                                                            {formatDeadline(d.due_at)}
                                                        </span>
                                                    ) : <span className="text-warm-cream/30 text-xs">—</span>}
                                                </td>
                                                <td className="px-4 py-3 text-warm-cream/45 text-xs">
                                                    {new Date(d.created_at).toLocaleDateString("en-NG", { month: "short", day: "numeric" })}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Link href={`/admin/payments/${encodeURIComponent(d.reference)}`} className="text-brand-green/70 hover:text-brand-green">
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

                {disputes.length > 0 && (
                    <div className="flex items-center justify-between mt-4 text-xs text-warm-cream/50">
                        <span>Showing {offset + 1}–{Math.min(offset + LIMIT, total)} of {total}</span>
                        <div className="flex gap-2">
                            <button
                                disabled={offset === 0}
                                onClick={() => setOffset(Math.max(0, offset - LIMIT))}
                                className="px-3 py-1.5 rounded-lg border border-warm-cream/10 hover:border-warm-cream/30 disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                Prev
                            </button>
                            <button
                                disabled={offset + LIMIT >= total}
                                onClick={() => setOffset(offset + LIMIT)}
                                className="px-3 py-1.5 rounded-lg border border-warm-cream/10 hover:border-warm-cream/30 disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}

function Th({ children, align = "left" }: { children?: React.ReactNode; align?: "left" | "right" }) {
    return <th className={`px-4 py-2.5 text-${align} text-[10px] font-semibold uppercase tracking-wider text-warm-cream/40`}>{children}</th>;
}

function DisputeBadge({ status, resolution }: { status: string; resolution: string | null }) {
    const isResolved = status === "resolved";
    const isDeclined = status === "declined";
    let label = status.replace(/_/g, " ");
    let cls = "bg-amber-500/15 text-amber-300 border-amber-500/25";
    let Icon = AlertTriangle;
    if (isResolved) {
        const won = resolution === "won" || resolution === "merchant_accepted";
        label = won ? "Won" : resolution ?? "Resolved";
        cls = won ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/25" : "bg-red-500/15 text-red-300 border-red-500/25";
        Icon = won ? CheckCircle2 : XCircle;
    } else if (isDeclined) {
        cls = "bg-zinc-500/15 text-zinc-300 border-zinc-500/25";
        Icon = XCircle;
    }
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${cls}`}>
            <Icon size={10} />
            {label}
        </span>
    );
}

function isDeadlineUrgent(dueAt: string | null): boolean {
    if (!dueAt) return false;
    const ms = new Date(dueAt).getTime() - Date.now();
    return ms > 0 && ms < 48 * 60 * 60 * 1000; // < 48h
}

function formatDeadline(dueAt: string): string {
    const due = new Date(dueAt);
    const ms = due.getTime() - Date.now();
    if (ms < 0) return `Overdue — ${due.toLocaleDateString()}`;
    const hours = Math.floor(ms / (60 * 60 * 1000));
    if (hours < 24) return `${hours}h left · ${due.toLocaleString("en-NG", { hour: "2-digit", minute: "2-digit" })}`;
    const days = Math.floor(hours / 24);
    return `${days}d left · ${due.toLocaleDateString("en-NG", { month: "short", day: "numeric" })}`;
}
