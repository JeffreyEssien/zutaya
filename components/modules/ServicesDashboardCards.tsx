import Link from "next/link";
import { Calendar, Package, ChefHat, ArrowRight } from "lucide-react";
import type { ServiceBooking } from "@/types";
import { formatCurrency } from "@/lib/formatCurrency";

interface Props {
    pendingBookings: number;
    upcomingBookings: number;
    activeMarinades: number;
    activeProcessingOptions: number;
    recentBookings: ServiceBooking[];
}

export default function ServicesDashboardCards({ pendingBookings, upcomingBookings, activeMarinades, activeProcessingOptions, recentBookings }: Props) {
    return (
        <div className="space-y-4">
            <h2 className="font-serif text-lg text-warm-cream">Services at a glance</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <Card href="/admin/bookings" icon={Calendar} label="Pending bookings" value={String(pendingBookings)} hint={`${upcomingBookings} confirmed upcoming`} />
                <Card href="/admin/processing" icon={Package} label="Active marinades" value={String(activeMarinades)} hint={`${activeProcessingOptions} prep options`} />
                <Card href="/admin/services-config" icon={ChefHat} label="Services config" value="Open" hint="Cutoff, butchers, toggles" />
            </div>

            {recentBookings.length > 0 && (
                <div className="bg-white/[0.04] rounded-xl border border-warm-cream/15 overflow-hidden">
                    <div className="flex items-center justify-between p-4 border-b border-warm-cream/8">
                        <h3 className="text-sm font-semibold text-warm-cream">Recent bookings</h3>
                        <Link href="/admin/bookings" className="text-xs text-brand-green hover:underline flex items-center gap-1">View all <ArrowRight size={12} /></Link>
                    </div>
                    <ul className="divide-y divide-warm-cream/5">
                        {recentBookings.map((b) => (
                            <li key={b.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                                <span className={`w-1.5 h-1.5 rounded-full ${b.status === "inquiry" ? "bg-amber-400" : b.status === "confirmed" ? "bg-brand-green" : "bg-warm-cream/30"}`} />
                                <span className="font-mono text-xs text-brand-green min-w-[110px]">{b.bookingCode}</span>
                                <span className="flex-1 text-warm-cream/80 truncate">{b.customerName} · {b.headcount} pax</span>
                                <span className="text-[11px] text-warm-cream/40 capitalize">{b.status.replace("_", " ")}</span>
                                <span className="text-warm-cream/70 hidden sm:inline">{b.estimatedTotal ? formatCurrency(b.estimatedTotal) : "—"}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

function Card({ href, icon: Icon, label, value, hint }: { href: string; icon: React.ElementType; label: string; value: string; hint: string }) {
    return (
        <Link href={href} className="block bg-white/[0.04] rounded-xl border border-warm-cream/15 p-4 hover:border-brand-green/40 transition-colors">
            <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase tracking-wider text-warm-cream/40">{label}</span>
                <Icon size={14} className="text-brand-green/70" />
            </div>
            <p className="font-serif text-2xl text-warm-cream">{value}</p>
            <p className="text-[11px] text-warm-cream/40 mt-1">{hint}</p>
        </Link>
    );
}
