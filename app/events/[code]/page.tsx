import Header from "@/components/modules/Header";
import Footer from "@/components/modules/Footer";
import { notFound } from "next/navigation";
import { getServiceBookingByCode } from "@/lib/servicesQueries";
import { formatCurrency } from "@/lib/formatCurrency";
import { Check, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

const STAGES: { key: string; label: string }[] = [
    { key: "inquiry", label: "Inquiry received" },
    { key: "quoted", label: "Quote sent" },
    { key: "deposit_pending", label: "Deposit pending" },
    { key: "confirmed", label: "Confirmed" },
    { key: "in_progress", label: "Event day" },
    { key: "complete", label: "Complete" },
];

export default async function BookingTrackerPage({ params }: { params: Promise<{ code: string }> }) {
    const { code } = await params;
    const booking = await getServiceBookingByCode(code);
    if (!booking) return notFound();

    const stageIdx = STAGES.findIndex((s) => s.key === booking.status);

    return (
        <>
            <Header />
            <main className="max-w-3xl mx-auto px-6 py-12">
                <div className="mb-8">
                    <p className="text-[11px] uppercase tracking-[0.3em] text-brand-green mb-2">Booking</p>
                    <h1 className="font-serif text-3xl text-warm-cream">{booking.bookingCode}</h1>
                    <p className="text-warm-cream/50 text-sm mt-1">For {booking.customerName} · {new Date(booking.eventDate).toLocaleDateString()}</p>
                </div>

                {/* Timeline */}
                <div className="bg-raised rounded-2xl border border-warm-cream/10 p-6 mb-6">
                    <div className="space-y-3">
                        {STAGES.map((s, i) => {
                            const done = i < stageIdx;
                            const active = i === stageIdx;
                            return (
                                <div key={s.key} className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${done ? "bg-brand-green/30 text-brand-green" : active ? "bg-brand-green text-white" : "bg-warm-cream/8 text-warm-cream/40"}`}>
                                        {done ? <Check size={14} /> : active ? <Clock size={14} /> : i + 1}
                                    </div>
                                    <span className={active ? "text-warm-cream font-semibold" : done ? "text-warm-cream/70" : "text-warm-cream/35"}>{s.label}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Details */}
                <div className="bg-raised rounded-2xl border border-warm-cream/10 p-6 space-y-3 text-sm">
                    <Row label="Occasion" value={booking.occasionLabel || "—"} />
                    <Row label="Guests" value={`${booking.headcount}`} />
                    <Row label="Service tier" value={booking.serviceTierLabel || "—"} />
                    <Row label="Animals" value={booking.animalSelections.map((s) => `${s.quantity}× ${s.animalName}`).join(", ") || "—"} />
                    <Row label="Venue" value={`${booking.address}${booking.city ? `, ${booking.city}` : ""}`} />
                    {booking.estimatedTotal != null && <Row label="Estimated" value={formatCurrency(booking.estimatedTotal)} />}
                    {booking.quotedTotal != null && <Row label="Quoted" value={formatCurrency(booking.quotedTotal)} />}
                    {booking.depositAmount != null && <Row label="Deposit" value={`${formatCurrency(booking.depositAmount)} ${booking.depositPaid ? "· paid" : "· pending"}`} />}
                </div>
            </main>
            <Footer />
        </>
    );
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between py-1.5 border-b border-warm-cream/5 last:border-0">
            <span className="text-warm-cream/50">{label}</span>
            <span className="text-warm-cream text-right max-w-[60%]">{value}</span>
        </div>
    );
}
