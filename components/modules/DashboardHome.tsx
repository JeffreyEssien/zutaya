import Link from "next/link";
import {
    CreditCard, AlertTriangle, Thermometer, ClipboardList, Truck, Package,
    CalendarClock, ArrowUpRight, ArrowDownRight, TrendingUp, ShoppingBag,
    UserPlus, Gauge, CheckCircle2, ArrowRight,
} from "lucide-react";
import { formatCurrency } from "@/lib/formatCurrency";
import type { DashboardData } from "@/lib/dashboard";

const SLOT_LABEL: Record<string, string> = {
    morning: "Morning",
    afternoon: "Afternoon",
    evening: "Evening",
};

const STATUS_TONE: Record<string, string> = {
    pending: "bg-amber-500/10 text-amber-400",
    processing: "bg-blue-500/10 text-blue-400",
    packed: "bg-indigo-500/10 text-indigo-400",
    out_for_delivery: "bg-cyan-500/10 text-cyan-400",
    delivered: "bg-emerald-500/10 text-emerald-400",
    cancelled: "bg-red-500/10 text-red-400",
};

export default function DashboardHome({ data }: { data: DashboardData }) {
    const a = data.alerts;
    const p = data.pulse;

    // Build the alert list — only render tiles that actually need attention.
    const alerts = [
        {
            show: a.awaitingPayment > 0,
            tone: "red" as const,
            icon: CreditCard,
            label: "Awaiting payment",
            value: a.awaitingPayment,
            sub: "Orders not yet paid",
            href: "/admin/payments",
        },
        {
            show: a.failedPaymentsToday > 0,
            tone: "red" as const,
            icon: AlertTriangle,
            label: "Failed payments today",
            value: a.failedPaymentsToday,
            sub: "May need follow-up",
            href: "/admin/payments",
        },
        {
            show: a.disputesDueSoon > 0,
            tone: "red" as const,
            icon: AlertTriangle,
            label: "Disputes due ≤48h",
            value: a.disputesDueSoon,
            sub: "Submit evidence",
            href: "/admin/disputes",
        },
        {
            show: a.expiringSoon > 0,
            tone: "red" as const,
            icon: Thermometer,
            label: "Expiring ≤3 days",
            value: a.expiringSoon,
            sub: `${formatCurrency(a.expiringValue)} at risk`,
            href: "/admin/inventory",
        },
        {
            show: a.newOrdersToConfirm > 0,
            tone: "amber" as const,
            icon: ClipboardList,
            label: "New orders to confirm",
            value: a.newOrdersToConfirm,
            sub: a.oldestPendingHours > 0 ? `Oldest waiting ${a.oldestPendingHours}h` : "Awaiting action",
            href: "/admin/orders",
        },
        {
            show: a.deliveriesToday > 0,
            tone: "amber" as const,
            icon: Truck,
            label: "Deliveries due today",
            value: a.deliveriesToday,
            sub: "Plan today's run",
            href: "/admin/orders",
        },
        {
            show: a.reorderNow > 0,
            tone: "amber" as const,
            icon: Package,
            label: "Reorder now",
            value: a.reorderNow,
            sub: "At/below reorder level",
            href: "/admin/inventory",
        },
        {
            show: a.unquotedBookings > 0,
            tone: "amber" as const,
            icon: CalendarClock,
            label: "Unquoted bookings",
            value: a.unquotedBookings,
            sub: "Event leads waiting",
            href: "/admin/bookings",
        },
    ].filter((x) => x.show);

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-serif text-warm-cream">Overview</h1>
                <p className="text-warm-cream/50 text-sm mt-1">
                    {new Date().toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "long" })}
                    {" · "}what needs you today
                </p>
            </div>

            {/* ── Tier 1: Needs action ── */}
            {alerts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {alerts.map((al) => (
                        <AlertTile key={al.label} {...al} />
                    ))}
                </div>
            ) : (
                <div className="glass-card p-6 flex items-center gap-4 bg-gradient-to-br from-emerald-500/10 to-emerald-500/[0.02]">
                    <span className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
                        <CheckCircle2 size={22} />
                    </span>
                    <div>
                        <p className="text-warm-cream font-medium">All clear</p>
                        <p className="text-warm-cream/50 text-sm">No payments, disputes, stock, or orders need attention right now.</p>
                    </div>
                </div>
            )}

            {/* ── Tier 2: Today's pulse ── */}
            <div>
                <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-warm-cream/30 mb-3 px-1">
                    Today's pulse
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <PulseCard
                        icon={TrendingUp}
                        label="Revenue today"
                        value={formatCurrency(p.revenueToday)}
                        deltaPct={p.revenueDeltaPct}
                        deltaLabel="vs. same day last week"
                    />
                    <PulseCard
                        icon={Gauge}
                        label="Pace to now"
                        value={formatCurrency(p.paceActual)}
                        deltaPct={p.paceDeltaPct}
                        deltaLabel={`typical by now ${formatCurrency(p.paceExpected)}`}
                    />
                    <PulseCard
                        icon={ShoppingBag}
                        label="Orders today"
                        value={String(p.ordersToday)}
                        baseline={`7-day avg ${p.ordersAvg7d.toFixed(1)}/day`}
                    />
                    <PulseCard
                        icon={UserPlus}
                        label="New customers today"
                        value={String(p.newCustomersToday)}
                    />
                </div>
            </div>

            {/* ── Tier 3: Today's deliveries + latest orders ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="glass-card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-warm-cream flex items-center gap-2">
                            <Truck size={18} className="text-brand-green" /> Today's delivery run
                        </h3>
                        <Link href="/admin/orders" className="text-xs text-brand-green hover:underline flex items-center gap-1">
                            All orders <ArrowRight size={12} />
                        </Link>
                    </div>
                    {data.deliveriesTodayList.length > 0 ? (
                        <ul className="divide-y divide-warm-cream/[0.06]">
                            {data.deliveriesTodayList.map((d) => (
                                <li key={d.id} className="flex items-center justify-between py-2.5 text-sm">
                                    <div className="min-w-0">
                                        <p className="text-warm-cream truncate">{d.customerName}</p>
                                        <p className="text-warm-cream/40 text-xs truncate">
                                            {d.zone} · {SLOT_LABEL[d.slot] || d.slot}
                                        </p>
                                    </div>
                                    <div className="text-right shrink-0 pl-3">
                                        <p className="text-warm-cream font-medium">{formatCurrency(d.total)}</p>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${STATUS_TONE[d.status] || "bg-white/10 text-warm-cream/60"}`}>
                                            {d.status.replace(/_/g, " ")}
                                        </span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-warm-cream/40 text-sm py-8 text-center">No deliveries scheduled for today.</p>
                    )}
                </div>

                <div className="glass-card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-warm-cream flex items-center gap-2">
                            <ClipboardList size={18} className="text-brand-green" /> Latest orders
                        </h3>
                        <Link href="/admin/orders" className="text-xs text-brand-green hover:underline flex items-center gap-1">
                            View all <ArrowRight size={12} />
                        </Link>
                    </div>
                    {data.latestOrders.length > 0 ? (
                        <ul className="divide-y divide-warm-cream/[0.06]">
                            {data.latestOrders.map((o) => (
                                <li key={o.id} className="flex items-center justify-between py-2.5 text-sm">
                                    <div className="min-w-0">
                                        <p className="text-warm-cream truncate">{o.customerName}</p>
                                        <p className="text-warm-cream/40 text-xs font-mono truncate">{o.id}</p>
                                    </div>
                                    <div className="text-right shrink-0 pl-3">
                                        <p className="text-warm-cream font-medium">{formatCurrency(o.total)}</p>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${STATUS_TONE[o.status] || "bg-white/10 text-warm-cream/60"}`}>
                                            {o.status.replace(/_/g, " ")}
                                        </span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-warm-cream/40 text-sm py-8 text-center">No orders yet.</p>
                    )}
                </div>
            </div>
        </div>
    );
}

function AlertTile({
    tone,
    icon: Icon,
    label,
    value,
    sub,
    href,
}: {
    tone: "red" | "amber";
    icon: React.ElementType;
    label: string;
    value: number;
    sub: string;
    href: string;
}) {
    const tones = {
        red: { bg: "from-red-500/10 to-rose-500/[0.03]", icon: "bg-red-500/10 text-red-400", ring: "hover:border-red-500/30" },
        amber: { bg: "from-amber-500/10 to-yellow-500/[0.03]", icon: "bg-amber-500/10 text-amber-400", ring: "hover:border-amber-500/30" },
    }[tone];

    return (
        <Link
            href={href}
            className={`glass-card p-5 bg-gradient-to-br ${tones.bg} border border-warm-cream/[0.08] ${tones.ring} hover:-translate-y-0.5 transition-all duration-300 group block`}
        >
            <div className="flex items-start justify-between">
                <div className="min-w-0">
                    <p className="text-xs font-medium text-warm-cream/50 uppercase tracking-wider">{label}</p>
                    <h3 className="text-3xl font-serif text-warm-cream mt-1 font-bold">{value}</h3>
                    <p className="text-xs text-warm-cream/40 mt-0.5 truncate">{sub}</p>
                </div>
                <div className={`p-2.5 rounded-xl ${tones.icon}`}>
                    <Icon size={18} />
                </div>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-warm-cream/40 mt-3 group-hover:text-warm-cream/70 transition-colors">
                Resolve <ArrowUpRight size={12} />
            </div>
        </Link>
    );
}

function PulseCard({
    icon: Icon,
    label,
    value,
    deltaPct,
    deltaLabel,
    baseline,
}: {
    icon: React.ElementType;
    label: string;
    value: string;
    deltaPct?: number;
    deltaLabel?: string;
    baseline?: string;
}) {
    const up = (deltaPct ?? 0) >= 0;
    return (
        <div className="glass-card p-5">
            <div className="flex items-start justify-between">
                <p className="text-xs font-medium text-warm-cream/50 uppercase tracking-wider">{label}</p>
                <div className="p-2 rounded-lg bg-brand-green/10 text-brand-green">
                    <Icon size={16} />
                </div>
            </div>
            <h3 className="text-2xl font-serif text-warm-cream mt-2 font-bold truncate">{value}</h3>
            {deltaPct !== undefined && deltaLabel && (
                <div className="flex items-center gap-1.5 mt-1.5">
                    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${up ? "text-emerald-400" : "text-red-400"}`}>
                        {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                        {Math.abs(deltaPct).toFixed(0)}%
                    </span>
                    <span className="text-[11px] text-warm-cream/40 truncate">{deltaLabel}</span>
                </div>
            )}
            {baseline && <p className="text-[11px] text-warm-cream/40 mt-1.5">{baseline}</p>}
        </div>
    );
}
