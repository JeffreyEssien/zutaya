"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ServiceBooking } from "@/types";
import { formatCurrency } from "@/lib/formatCurrency";

const STATUSES: ServiceBooking["status"][] = ["inquiry", "quoted", "deposit_pending", "confirmed", "in_progress", "complete", "cancelled"];

export default function BookingsAdmin({ initial }: { initial: ServiceBooking[] }) {
    const router = useRouter();
    const [filter, setFilter] = useState<string>("all");
    const [active, setActive] = useState<ServiceBooking | null>(null);
    const filtered = filter === "all" ? initial : initial.filter((b) => b.status === filter);

    async function update(id: string, patch: any) {
        await fetch(`/api/admin/bookings/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
        router.refresh();
        setActive(null);
    }

    return (
        <div className="space-y-4">
            <div className="flex gap-2 flex-wrap">
                <button onClick={() => setFilter("all")} className={`text-xs px-3 py-1.5 rounded-full cursor-pointer ${filter === "all" ? "bg-brand-green text-white" : "bg-warm-cream/5 text-warm-cream/70"}`}>All ({initial.length})</button>
                {STATUSES.map((s) => {
                    const c = initial.filter((b) => b.status === s).length;
                    return (
                        <button key={s} onClick={() => setFilter(s)} className={`text-xs px-3 py-1.5 rounded-full cursor-pointer capitalize ${filter === s ? "bg-brand-green text-white" : "bg-warm-cream/5 text-warm-cream/70"}`}>{s.replace("_", " ")} ({c})</button>
                    );
                })}
            </div>

            <div className="bg-white/[0.04] rounded-xl border border-warm-cream/15 overflow-hidden">
                {filtered.length === 0 ? (
                    <p className="p-6 text-center text-warm-cream/40 text-sm">No bookings.</p>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-black/20 text-xs uppercase text-warm-cream/40">
                            <tr>
                                <th className="text-left px-4 py-3">Code</th>
                                <th className="text-left px-4 py-3">Customer</th>
                                <th className="text-left px-4 py-3">Event</th>
                                <th className="text-left px-4 py-3">Pax</th>
                                <th className="text-left px-4 py-3">Status</th>
                                <th className="text-right px-4 py-3">Estimate</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((b) => (
                                <tr key={b.id} onClick={() => setActive(b)} className="border-t border-warm-cream/5 hover:bg-warm-cream/5 cursor-pointer">
                                    <td className="px-4 py-3 font-mono text-xs text-brand-green">{b.bookingCode}</td>
                                    <td className="px-4 py-3 text-warm-cream">{b.customerName}<br /><span className="text-[11px] text-warm-cream/40">{b.customerPhone}</span></td>
                                    <td className="px-4 py-3 text-warm-cream/80">{b.occasionLabel || "—"}<br /><span className="text-[11px] text-warm-cream/40">{new Date(b.eventDate).toLocaleDateString()}</span></td>
                                    <td className="px-4 py-3 text-warm-cream/80">{b.headcount}</td>
                                    <td className="px-4 py-3"><span className="text-[11px] px-2 py-1 rounded-full bg-warm-cream/8 text-warm-cream/80 capitalize">{b.status.replace("_", " ")}</span></td>
                                    <td className="px-4 py-3 text-right text-warm-cream/80">{b.estimatedTotal ? formatCurrency(b.estimatedTotal) : "—"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {active && <BookingDetail booking={active} onClose={() => setActive(null)} onUpdate={(patch) => update(active.id, patch)} />}
        </div>
    );
}

function BookingDetail({ booking, onClose, onUpdate }: { booking: ServiceBooking; onClose: () => void; onUpdate: (p: any) => void }) {
    const [status, setStatus] = useState(booking.status);
    const [quotedTotal, setQuotedTotal] = useState(booking.quotedTotal || booking.estimatedTotal || 0);
    const [depositAmount, setDepositAmount] = useState(booking.depositAmount || 0);
    const [depositPaid, setDepositPaid] = useState(booking.depositPaid);
    const [adminNotes, setAdminNotes] = useState(booking.adminNotes || "");
    const [leftoverKg, setLeftoverKg] = useState(booking.leftoverKg || 0);

    return (
        <div onClick={onClose} className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
            <div onClick={(e) => e.stopPropagation()} className="bg-brand-dark rounded-2xl border border-warm-cream/15 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-warm-cream/10">
                    <h2 className="font-serif text-xl text-warm-cream">{booking.bookingCode}</h2>
                    <p className="text-sm text-warm-cream/50">{booking.customerName} · {booking.customerEmail} · {booking.customerPhone}</p>
                </div>
                <div className="p-6 space-y-4 text-sm">
                    <Field label="Event"><span className="text-warm-cream">{booking.occasionLabel || "—"} · {booking.headcount} pax · {new Date(booking.eventDate).toLocaleDateString()}{booking.eventTime ? ` ${booking.eventTime}` : ""}</span></Field>
                    <Field label="Venue"><span className="text-warm-cream">{booking.address}{booking.city ? `, ${booking.city}` : ""}{booking.state ? `, ${booking.state}` : ""}</span></Field>
                    {booking.locationNotes && <Field label="Location notes"><span className="text-warm-cream/70">{booking.locationNotes}</span></Field>}
                    <Field label="Animals"><span className="text-warm-cream">{booking.animalSelections.map((s) => `${s.quantity}× ${s.animalName} (${formatCurrency(s.unitPrice)})`).join(", ") || "—"}</span></Field>
                    <Field label="Service tier"><span className="text-warm-cream">{booking.serviceTierLabel || "—"}</span></Field>
                    {booking.customerNotes && <Field label="Customer notes"><span className="text-warm-cream/70">{booking.customerNotes}</span></Field>}
                    <Field label="Estimate"><span className="text-warm-cream">{booking.estimatedTotal ? formatCurrency(booking.estimatedTotal) : "—"}</span></Field>

                    <div className="pt-4 border-t border-warm-cream/10 grid sm:grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-warm-cream/60">Status</label>
                            <select value={status} onChange={(e) => setStatus(e.target.value as any)} className="w-full mt-1 bg-black/40 text-warm-cream text-sm px-3 py-2 rounded border border-warm-cream/10">
                                {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-warm-cream/60">Quoted total ₦</label>
                            <input type="number" value={quotedTotal} onChange={(e) => setQuotedTotal(Number(e.target.value))} className="w-full mt-1 bg-black/40 text-warm-cream text-sm px-3 py-2 rounded border border-warm-cream/10" />
                        </div>
                        <div>
                            <label className="text-xs text-warm-cream/60">Deposit ₦</label>
                            <input type="number" value={depositAmount} onChange={(e) => setDepositAmount(Number(e.target.value))} className="w-full mt-1 bg-black/40 text-warm-cream text-sm px-3 py-2 rounded border border-warm-cream/10" />
                        </div>
                        <label className="flex items-center gap-2 text-xs text-warm-cream/70 self-end pb-2">
                            <input type="checkbox" checked={depositPaid} onChange={(e) => setDepositPaid(e.target.checked)} /> Deposit paid
                        </label>
                        <div className="sm:col-span-2">
                            <label className="text-xs text-warm-cream/60">Admin notes</label>
                            <textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} rows={3} className="w-full mt-1 bg-black/40 text-warm-cream text-sm px-3 py-2 rounded border border-warm-cream/10" />
                        </div>
                        {(status === "complete" || status === "in_progress") && (
                            <div className="sm:col-span-2">
                                <label className="text-xs text-warm-cream/60">Leftover kg (for upsell follow-up)</label>
                                <input type="number" step="0.1" value={leftoverKg} onChange={(e) => setLeftoverKg(Number(e.target.value))} className="w-full mt-1 bg-black/40 text-warm-cream text-sm px-3 py-2 rounded border border-warm-cream/10" />
                            </div>
                        )}
                    </div>
                </div>
                <div className="p-4 border-t border-warm-cream/10 flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-warm-cream/70 hover:text-warm-cream cursor-pointer">Cancel</button>
                    <button onClick={() => onUpdate({ status, quotedTotal, depositAmount, depositPaid, adminNotes, leftoverKg })} className="px-4 py-2 text-sm bg-brand-green text-white rounded-full font-semibold cursor-pointer">Save changes</button>
                </div>
            </div>
        </div>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex justify-between gap-4">
            <span className="text-warm-cream/50 text-xs uppercase tracking-wider">{label}</span>
            <div className="text-right max-w-[60%]">{children}</div>
        </div>
    );
}
