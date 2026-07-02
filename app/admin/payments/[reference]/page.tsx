"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { formatCurrency } from "@/lib/formatCurrency";
import {
    ArrowLeft, CreditCard, User, ShoppingBag, AlertTriangle, CheckCircle2,
    Clock, XCircle, Copy, Check, RefreshCw, RotateCcw, Mail, FileJson,
    Activity, Hash, Banknote, Receipt, ExternalLink, RefreshCcw,
} from "lucide-react";

interface PaymentRow {
    id: string; reference: string; order_id: string | null; subscription_id: string | null;
    customer_id: string | null; customer_email: string; amount_kobo: number;
    processing_fee_kobo: number; total_charged_kobo: number; paystack_fees_kobo: number | null;
    status: string; channel: string | null; authorization_code: string | null;
    paystack_transaction_id: number | null; paystack_access_code: string | null;
    paid_at: string | null; failed_at: string | null; failure_reason: string | null;
    abandoned_at?: string | null; refund_status: string | null; refunded_amount_kobo: number;
    refunded_at: string | null; refund_reference: string | null; refund_reason: string | null;
    ip_address: string | null; user_agent: string | null;
    initialize_payload: Record<string, unknown> | null;
    verify_response: Record<string, unknown> | null;
    webhook_payload: Record<string, unknown> | null;
    metadata: Record<string, unknown> | null;
    resume_token: string | null; resume_email_sent_at: string | null;
    reconciled_at: string | null; stock_restored_at: string | null;
    created_at: string; updated_at: string;
}

interface Event {
    id: string; event_type: string; source: string;
    payload: Record<string, unknown>; created_at: string;
}

interface OrderShort {
    id: string; customer_name: string; status: string; total: number; created_at: string;
    delivery_zone?: string; requested_delivery_date?: string;
}

interface CustomerShort {
    id: string; email: string; first_name?: string; last_name?: string; phone?: string;
    paystack_customer_code?: string; total_spent_kobo: number;
    successful_payments: number; failed_payments: number;
    first_paid_at?: string; last_paid_at?: string;
}

export const dynamic = "force-dynamic";

export default function PaymentDetailPage() {
    const params = useParams<{ reference: string }>();
    const reference = decodeURIComponent(params.reference);

    const [data, setData] = useState<{
        payment: PaymentRow;
        events: Event[];
        order: OrderShort | null;
        subscription: { id: string; frequency: string; status: string } | null;
        customer: CustomerShort | null;
        otherPayments: { id: string; reference: string; status: string; total_charged_kobo: number; created_at: string }[];
    } | null>(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState<string | null>(null);
    const [reverifying, setReverifying] = useState(false);
    const [resending, setResending] = useState(false);
    const [refunding, setRefunding] = useState(false);
    const [showRefund, setShowRefund] = useState(false);
    const [refundAmount, setRefundAmount] = useState("");
    const [refundReason, setRefundReason] = useState("");

    const fetchData = useCallback(async () => {
        const res = await fetch(`/api/admin/payments/${encodeURIComponent(reference)}`);
        const json = await res.json();
        if (json.success) setData(json);
        setLoading(false);
    }, [reference]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (loading) {
        return <div className="min-h-screen bg-base flex items-center justify-center text-warm-cream/45 text-sm">Loading payment…</div>;
    }
    if (!data) {
        return <div className="min-h-screen bg-base flex items-center justify-center text-warm-cream/45 text-sm">Payment not found.</div>;
    }

    const { payment, events, order, subscription, customer, otherPayments } = data;
    const isPaid = payment.status === "paid" || payment.status === "partially_refunded";
    const refundable = isPaid ? payment.total_charged_kobo - payment.refunded_amount_kobo : 0;
    const netKobo = (payment.total_charged_kobo ?? 0) - (payment.paystack_fees_kobo ?? 0) - (payment.refunded_amount_kobo ?? 0);

    const copy = (label: string, value: string) => {
        navigator.clipboard.writeText(value);
        setCopied(label);
        setTimeout(() => setCopied(null), 1500);
    };

    const handleReverify = async () => {
        setReverifying(true);
        try {
            const res = await fetch("/api/admin/payments/reverify", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reference }),
            });
            const json = await res.json();
            if (!res.ok || !json.success) { alert(json.error || "Re-verify failed"); return; }
            alert(json.changed
                ? `Updated! Paystack says: ${json.paystackStatus}. Local status: ${json.localStatus}.`
                : `No change. Paystack confirms: ${json.paystackStatus}.`);
            await fetchData();
        } finally { setReverifying(false); }
    };

    const handleResendResume = async () => {
        setResending(true);
        try {
            const res = await fetch("/api/admin/payments/resend-resume", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reference }),
            });
            const json = await res.json();
            if (!res.ok || !json.success) { alert(json.error || "Send failed"); return; }
            alert(`Resume email sent to ${json.sentTo}`);
            await fetchData();
        } finally { setResending(false); }
    };

    const handleRefund = async () => {
        const requestedKobo = refundAmount.trim()
            ? Math.round(Number(refundAmount) * 100)
            : refundable;
        if (!requestedKobo || requestedKobo <= 0 || requestedKobo > refundable) {
            alert(`Refund must be between ₦0.01 and ${formatCurrency(refundable / 100)}`);
            return;
        }
        if (!confirm(`Refund ${formatCurrency(requestedKobo / 100)} via Paystack? Funds settle in up to 10 business days.`)) return;
        setRefunding(true);
        try {
            const res = await fetch("/api/paystack/refund", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reference, amountKobo: requestedKobo, reason: refundReason || undefined }),
            });
            const json = await res.json();
            if (!res.ok || !json.success) { alert(json.error || "Refund failed"); return; }
            alert("Refund initiated. The webhook will mark it processed once settled.");
            setShowRefund(false);
            setRefundAmount("");
            setRefundReason("");
            await fetchData();
        } finally { setRefunding(false); }
    };

    return (
        <main className="min-h-screen bg-base text-warm-cream p-6 md:p-10">
            <div className="max-w-6xl mx-auto">
                {/* ── Top bar ── */}
                <Link href="/admin/payments" className="inline-flex items-center gap-1.5 text-xs text-warm-cream/45 hover:text-brand-green mb-6">
                    <ArrowLeft size={12} /> Back to all payments
                </Link>

                {/* ── Hero header ── */}
                <div className="bg-gradient-to-br from-base to-base border border-warm-cream/10 rounded-2xl p-6 mb-6">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                                <CreditCard size={14} className="text-brand-green" />
                                <span className="text-[10px] uppercase tracking-wider text-warm-cream/45 font-semibold">Paystack Payment</span>
                            </div>
                            <div className="flex items-center gap-2 mb-3">
                                <h1 className="font-mono text-xl text-warm-cream truncate">{payment.reference}</h1>
                                <button onClick={() => copy("ref", payment.reference)} className="text-warm-cream/30 hover:text-brand-green cursor-pointer">
                                    {copied === "ref" ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                                </button>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <StatusBadge status={payment.status} />
                                {payment.refund_status && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-purple-500/15 text-purple-300 border border-purple-500/20">
                                        Refund: {payment.refund_status}
                                    </span>
                                )}
                                {payment.channel && (
                                    <span className="text-[11px] text-warm-cream/55 px-2 py-0.5 bg-raised rounded-full">
                                        {payment.channel.replace(/_/g, " ")}
                                    </span>
                                )}
                                {payment.paystack_transaction_id && (
                                    <span className="text-[11px] text-warm-cream/45">Txn #{payment.paystack_transaction_id}</span>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <ActionBtn icon={<RefreshCw size={13} className={reverifying ? "animate-spin" : ""} />} label="Re-verify" onClick={handleReverify} disabled={reverifying} />
                            {payment.status === "pending" && payment.order_id && (
                                <ActionBtn icon={<Mail size={13} />} label="Resend resume email" onClick={handleResendResume} disabled={resending} variant="amber" />
                            )}
                            {isPaid && refundable > 0 && (
                                <ActionBtn icon={<RotateCcw size={13} />} label={showRefund ? "Cancel refund" : "Issue refund"} onClick={() => setShowRefund((v) => !v)} variant="purple" />
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Refund form ── */}
                {showRefund && (
                    <div className="bg-purple-500/[0.06] border border-purple-500/20 rounded-2xl p-5 mb-6">
                        <div className="flex items-center gap-2 mb-3 text-purple-300 text-sm font-medium">
                            <RotateCcw size={14} /> Issue Refund
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                            <div>
                                <label className="block text-[10px] uppercase tracking-wider text-warm-cream/45 font-semibold mb-1.5">Amount (₦)</label>
                                <input
                                    type="number" min="0" step="0.01" max={refundable / 100}
                                    value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)}
                                    placeholder={`Up to ${formatCurrency(refundable / 100)}`}
                                    className="w-full text-sm px-3 py-2 rounded-lg bg-[#111] border border-warm-cream/15 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400/30"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] uppercase tracking-wider text-warm-cream/45 font-semibold mb-1.5">Reason</label>
                                <input
                                    type="text" value={refundReason} onChange={(e) => setRefundReason(e.target.value)}
                                    placeholder="e.g. wrong cut, customer complaint"
                                    className="w-full text-sm px-3 py-2 rounded-lg bg-[#111] border border-warm-cream/15 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400/30"
                                />
                            </div>
                        </div>
                        <div className="flex items-start gap-2 text-[11px] text-warm-cream/45 bg-warm-cream/[0.03] rounded-md px-2 py-1.5 mb-3">
                            <AlertTriangle size={11} className="mt-0.5 shrink-0" />
                            Funds settle to the customer within 10 business days. Leave amount blank for full refund.
                        </div>
                        <button onClick={handleRefund} disabled={refunding}
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium py-2.5 rounded-lg disabled:opacity-60">
                            {refunding ? "Initiating…" : "Confirm Refund"}
                        </button>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* ── Main column ── */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Amounts */}
                        <Card title="Amounts" icon={<Banknote size={14} />}>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                <Stat label="Base" value={formatCurrency(payment.amount_kobo / 100)} />
                                <Stat label="Processing Fee" value={formatCurrency(payment.processing_fee_kobo / 100)} sub="customer's half" />
                                <Stat label="Total Charged" value={formatCurrency(payment.total_charged_kobo / 100)} bold />
                                <Stat label="Paystack Fees" value={payment.paystack_fees_kobo != null ? formatCurrency(payment.paystack_fees_kobo / 100) : "—"} />
                                <Stat label="Refunded" value={formatCurrency(payment.refunded_amount_kobo / 100)} tone={payment.refunded_amount_kobo > 0 ? "purple" : undefined} />
                                <Stat label="Net to Business" value={isPaid ? formatCurrency(netKobo / 100) : "—"} tone="green" bold />
                            </div>
                        </Card>

                        {/* Timeline / Events */}
                        <Card title={`Event Timeline (${events.length})`} icon={<Activity size={14} />}>
                            {events.length === 0 ? (
                                <p className="text-xs text-warm-cream/35 italic">No events recorded yet.</p>
                            ) : (
                                <div className="space-y-0">
                                    {events.map((e, idx) => (
                                        <div key={e.id} className="flex gap-3 pb-3 last:pb-0">
                                            <div className="flex flex-col items-center">
                                                <div className={`w-2 h-2 rounded-full ${getEventDotColor(e.event_type)} shrink-0 mt-1.5`} />
                                                {idx < events.length - 1 && <div className="flex-1 w-px bg-warm-cream/10 my-1" />}
                                            </div>
                                            <div className="flex-1 min-w-0 pb-2">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="text-xs font-medium text-warm-cream">{e.event_type}</p>
                                                    <span className="text-[10px] text-warm-cream/35 shrink-0">{new Date(e.created_at).toLocaleString("en-NG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
                                                </div>
                                                <p className="text-[10px] text-warm-cream/40 uppercase tracking-wider mt-0.5">{e.source}</p>
                                                <details className="mt-1.5">
                                                    <summary className="text-[10px] text-warm-cream/35 cursor-pointer hover:text-warm-cream/60 select-none">View payload</summary>
                                                    <pre className="mt-1 text-[10px] text-warm-cream/55 bg-black/40 rounded-md p-2 overflow-x-auto max-h-48">{JSON.stringify(e.payload, null, 2)}</pre>
                                                </details>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Card>

                        {/* Raw payloads */}
                        <Card title="Paystack Payloads" icon={<FileJson size={14} />}>
                            <div className="space-y-2">
                                <JsonRow label="Last verify response" data={payment.verify_response} />
                                <JsonRow label="Last webhook payload" data={payment.webhook_payload} />
                                <JsonRow label="Initialize payload (what we sent)" data={payment.initialize_payload} />
                                <JsonRow label="Metadata" data={payment.metadata} />
                            </div>
                        </Card>
                    </div>

                    {/* ── Sidebar ── */}
                    <div className="space-y-6">
                        {/* Status detail */}
                        <Card title="Status Detail" icon={<Receipt size={14} />}>
                            <dl className="space-y-1.5 text-xs">
                                <Row k="Created" v={new Date(payment.created_at).toLocaleString()} />
                                {payment.paid_at && <Row k="Paid at" v={new Date(payment.paid_at).toLocaleString()} highlight />}
                                {payment.failed_at && <Row k="Failed at" v={new Date(payment.failed_at).toLocaleString()} tone="red" />}
                                {payment.abandoned_at && <Row k="Abandoned at" v={new Date(payment.abandoned_at).toLocaleString()} tone="zinc" />}
                                {payment.failure_reason && <Row k="Failure reason" v={payment.failure_reason} tone="red" />}
                                {payment.reconciled_at && <Row k="Reconciled" v={new Date(payment.reconciled_at).toLocaleString()} />}
                                {payment.stock_restored_at && <Row k="Stock restored" v={new Date(payment.stock_restored_at).toLocaleString()} />}
                                {payment.resume_email_sent_at && <Row k="Resume email sent" v={new Date(payment.resume_email_sent_at).toLocaleString()} tone="amber" />}
                                {payment.refunded_at && <Row k="Refunded at" v={new Date(payment.refunded_at).toLocaleString()} tone="purple" />}
                                {payment.refund_reason && <Row k="Refund reason" v={payment.refund_reason} tone="purple" />}
                            </dl>
                        </Card>

                        {/* Linked order */}
                        {order && (
                            <Card title="Linked Order" icon={<ShoppingBag size={14} />}>
                                <div className="space-y-2 text-xs">
                                    <Row k="ID" v={order.id} mono />
                                    <Row k="Customer" v={order.customer_name} />
                                    <Row k="Status" v={order.status} />
                                    <Row k="Total" v={formatCurrency(order.total)} />
                                    {order.delivery_zone && <Row k="Zone" v={order.delivery_zone} />}
                                    {order.requested_delivery_date && <Row k="Scheduled" v={order.requested_delivery_date} />}
                                    <Link href={`/admin/orders?focus=${order.id}`} className="inline-flex items-center gap-1 text-brand-green/70 hover:text-brand-green text-[11px] mt-2">
                                        Open order <ExternalLink size={10} />
                                    </Link>
                                </div>
                            </Card>
                        )}

                        {/* Subscription */}
                        {subscription && (
                            <Card title="Linked Subscription" icon={<RefreshCcw size={14} />}>
                                <div className="space-y-2 text-xs">
                                    <Row k="ID" v={subscription.id} mono />
                                    <Row k="Frequency" v={subscription.frequency} />
                                    <Row k="Status" v={subscription.status} />
                                </div>
                            </Card>
                        )}

                        {/* Customer */}
                        {customer && (
                            <Card title="Customer" icon={<User size={14} />}>
                                <div className="space-y-1.5 text-xs">
                                    <p className="text-warm-cream font-medium">{customer.first_name} {customer.last_name}</p>
                                    <p className="text-warm-cream/55">{customer.email}</p>
                                    {customer.phone && <p className="text-warm-cream/55">{customer.phone}</p>}
                                    <div className="border-t border-warm-cream/10 pt-2 mt-2 space-y-1">
                                        <Row k="Lifetime spent" v={formatCurrency(customer.total_spent_kobo / 100)} highlight />
                                        <Row k="Successful payments" v={String(customer.successful_payments)} />
                                        <Row k="Failed payments" v={String(customer.failed_payments)} tone={customer.failed_payments > 0 ? "red" : undefined} />
                                        {customer.first_paid_at && <Row k="First paid" v={new Date(customer.first_paid_at).toLocaleDateString()} />}
                                        {customer.last_paid_at && <Row k="Last paid" v={new Date(customer.last_paid_at).toLocaleDateString()} />}
                                    </div>
                                    {customer.paystack_customer_code && (
                                        <div className="border-t border-warm-cream/10 pt-2 mt-2">
                                            <p className="text-[10px] uppercase tracking-wider text-warm-cream/40 mb-1">Paystack Customer Code</p>
                                            <div className="flex items-center gap-1">
                                                <code className="text-[10px] text-warm-cream/65 break-all">{customer.paystack_customer_code}</code>
                                                <button onClick={() => copy("psck", customer.paystack_customer_code!)} className="text-warm-cream/30 hover:text-brand-green shrink-0">
                                                    {copied === "psck" ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        )}

                        {/* Technical detail */}
                        <Card title="Technical Detail" icon={<Hash size={14} />}>
                            <div className="space-y-1.5 text-xs">
                                {payment.authorization_code && (
                                    <div>
                                        <p className="text-[10px] uppercase tracking-wider text-warm-cream/40 mb-1">Saved-card auth code</p>
                                        <div className="flex items-center gap-1">
                                            <code className="text-[10px] text-warm-cream/65 break-all">{payment.authorization_code}</code>
                                            <button onClick={() => copy("auth", payment.authorization_code!)} className="text-warm-cream/30 hover:text-brand-green shrink-0">
                                                {copied === "auth" ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                                            </button>
                                        </div>
                                    </div>
                                )}
                                {payment.ip_address && <Row k="IP" v={payment.ip_address} mono />}
                                {payment.user_agent && (
                                    <details>
                                        <summary className="text-[10px] text-warm-cream/40 cursor-pointer">User agent</summary>
                                        <p className="text-[10px] text-warm-cream/55 break-all mt-1">{payment.user_agent}</p>
                                    </details>
                                )}
                                {payment.resume_token && (
                                    <div>
                                        <p className="text-[10px] uppercase tracking-wider text-warm-cream/40 mb-1">Resume token</p>
                                        <div className="flex items-center gap-1">
                                            <code className="text-[10px] text-warm-cream/65 break-all">{payment.resume_token.slice(0, 24)}…</code>
                                            <button onClick={() => copy("rt", payment.resume_token!)} className="text-warm-cream/30 hover:text-brand-green shrink-0">
                                                {copied === "rt" ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Card>

                        {/* Customer history */}
                        {otherPayments.length > 0 && (
                            <Card title={`Customer History (${otherPayments.length})`} icon={<Clock size={14} />}>
                                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                                    {otherPayments.map((p) => (
                                        <Link key={p.id} href={`/admin/payments/${encodeURIComponent(p.reference)}`}
                                            className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md hover:bg-raised text-[11px]">
                                            <div className="min-w-0 flex-1">
                                                <p className="font-mono text-warm-cream/70 truncate">{p.reference}</p>
                                                <p className="text-warm-cream/40">{new Date(p.created_at).toLocaleDateString()}</p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="text-warm-cream/80 tabular-nums">{formatCurrency(p.total_charged_kobo / 100)}</p>
                                                <StatusBadgeSmall status={p.status} />
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}

// ── helpers ──

function getEventDotColor(type: string): string {
    if (type.includes("success") || type === "verify.success" || type === "charge.success") return "bg-emerald-400";
    if (type.includes("fail") || type.includes("error")) return "bg-red-400";
    if (type.includes("refund")) return "bg-purple-400";
    if (type.includes("abandon")) return "bg-zinc-400";
    if (type.includes("initialize") || type.includes("resume")) return "bg-amber-400";
    if (type.includes("webhook")) return "bg-blue-400";
    return "bg-warm-cream/30";
}

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
    return (
        <div className="bg-raised border border-warm-cream/10 rounded-2xl p-5">
            <div className="flex items-center gap-1.5 mb-4">
                <span className="text-brand-green/60">{icon}</span>
                <h3 className="text-[11px] font-semibold text-warm-cream/45 uppercase tracking-wider">{title}</h3>
            </div>
            {children}
        </div>
    );
}

function Stat({ label, value, sub, bold, tone }: { label: string; value: string; sub?: string; bold?: boolean; tone?: "green" | "purple" }) {
    const valueColor = tone === "green" ? "text-emerald-300" : tone === "purple" ? "text-purple-300" : "text-warm-cream";
    return (
        <div>
            <p className="text-[10px] uppercase tracking-wider text-warm-cream/40 font-semibold mb-1">{label}</p>
            <p className={`tabular-nums ${valueColor} ${bold ? "text-base font-semibold" : "text-sm"}`}>{value}</p>
            {sub && <p className="text-[10px] text-warm-cream/35 mt-0.5">{sub}</p>}
        </div>
    );
}

function Row({ k, v, mono, highlight, tone }: { k: string; v: string; mono?: boolean; highlight?: boolean; tone?: "red" | "purple" | "amber" | "zinc" }) {
    const toneColor =
        tone === "red" ? "text-red-300" :
        tone === "purple" ? "text-purple-300" :
        tone === "amber" ? "text-amber-300" :
        tone === "zinc" ? "text-zinc-300" :
        highlight ? "text-emerald-300" : "text-warm-cream/80";
    return (
        <div className="flex items-start justify-between gap-2">
            <span className="text-warm-cream/45 shrink-0">{k}</span>
            <span className={`text-right break-all ${mono ? "font-mono text-[10px]" : ""} ${toneColor}`}>{v}</span>
        </div>
    );
}

function ActionBtn({ icon, label, onClick, disabled, variant = "green" }: {
    icon: React.ReactNode; label: string; onClick: () => void; disabled?: boolean; variant?: "green" | "amber" | "purple";
}) {
    const styles = {
        green: "bg-brand-green/10 hover:bg-brand-green/15 border-brand-green/20 text-brand-green",
        amber: "bg-amber-500/10 hover:bg-amber-500/15 border-amber-500/20 text-amber-300",
        purple: "bg-purple-500/10 hover:bg-purple-500/15 border-purple-500/20 text-purple-300",
    };
    return (
        <button onClick={onClick} disabled={disabled}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${styles[variant]}`}>
            {icon} {label}
        </button>
    );
}

function JsonRow({ label, data }: { label: string; data: unknown }) {
    if (!data) return null;
    return (
        <details className="bg-black/30 rounded-md">
            <summary className="text-[11px] text-warm-cream/55 cursor-pointer px-3 py-2 hover:text-warm-cream/80">{label}</summary>
            <pre className="text-[10px] text-warm-cream/55 px-3 pb-3 overflow-x-auto max-h-80">{JSON.stringify(data, null, 2)}</pre>
        </details>
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
    return <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${styles[status] || "bg-zinc-500/15 text-zinc-300"}`}>{status.replace(/_/g, " ")}</span>;
}

function StatusBadgeSmall({ status }: { status: string }) {
    const styles: Record<string, string> = {
        paid: "text-emerald-300", pending: "text-amber-300", failed: "text-red-300",
        abandoned: "text-zinc-300", refunded: "text-purple-300", partially_refunded: "text-purple-300",
    };
    return <span className={`text-[9px] uppercase tracking-wider ${styles[status] || "text-zinc-300"}`}>{status.replace(/_/g, " ")}</span>;
}
