"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Users, MapPin, Check, ChevronRight, ChevronLeft, Sparkles } from "lucide-react";
import type { EventOccasion, EventAnimal, EventServiceTier, AnimalSelection } from "@/types";
import { formatCurrency } from "@/lib/formatCurrency";

interface Props {
    occasions: EventOccasion[];
    animals: EventAnimal[];
    tiers: EventServiceTier[];
    tagline: string;
}

const STEPS = ["Occasion", "Headcount", "Animals", "Service", "Logistics", "Review"] as const;

export default function OwambeWizard({ occasions, animals, tiers, tagline }: Props) {
    const [step, setStep] = useState(0);
    const [occasionId, setOccasionId] = useState<string | null>(null);
    const [headcount, setHeadcount] = useState(50);
    const [selections, setSelections] = useState<Record<string, number>>({});
    const [tierId, setTierId] = useState<string | null>(null);
    const [eventDate, setEventDate] = useState("");
    const [eventTime, setEventTime] = useState("");
    const [address, setAddress] = useState("");
    const [city, setCity] = useState("");
    const [state, setState] = useState("Lagos");
    const [locationNotes, setLocationNotes] = useState("");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [notes, setNotes] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState<{ code: string; trackUrl: string } | null>(null);
    const [error, setError] = useState("");

    const selectedOccasion = occasions.find((o) => o.id === occasionId);
    const selectedTier = tiers.find((t) => t.id === tierId);

    const animalSelections: AnimalSelection[] = useMemo(() => {
        return Object.entries(selections).filter(([, q]) => q > 0).map(([id, qty]) => {
            const a = animals.find((x) => x.id === id)!;
            return { animalId: id, animalName: a.name, quantity: qty, unitPrice: a.basePrice };
        });
    }, [selections, animals]);

    const totalCovered = useMemo(() => {
        return animalSelections.reduce((s, sel) => {
            const a = animals.find((x) => x.id === sel.animalId);
            return s + (a ? a.feedsAdults * sel.quantity : 0);
        }, 0);
    }, [animalSelections, animals]);

    const animalsTotal = animalSelections.reduce((s, sel) => s + sel.unitPrice * sel.quantity, 0);
    const tierFee = selectedTier ? selectedTier.priceModifier + selectedTier.pricePerHead * headcount : 0;
    const estimatedTotal = animalsTotal + tierFee;

    const canNext = () => {
        if (step === 0) return !!occasionId;
        if (step === 1) return headcount > 0;
        if (step === 2) return animalSelections.length > 0;
        if (step === 3) return !!tierId;
        if (step === 4) return !!eventDate && !!address && !!name && !!email && !!phone;
        return true;
    };

    async function submit() {
        setSubmitting(true); setError("");
        try {
            const res = await fetch("/api/bookings", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    customerName: name, customerEmail: email, customerPhone: phone,
                    occasionId, occasionLabel: selectedOccasion?.name,
                    headcount, eventDate, eventTime,
                    address, city, state, locationNotes,
                    animalSelections, serviceTierId: tierId, serviceTierLabel: selectedTier?.name,
                    addOns: [], estimatedTotal, customerNotes: notes,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed");
            setResult({ code: data.bookingCode, trackUrl: data.trackUrl });
        } catch (e: any) {
            setError(e?.message || "Could not submit");
        } finally {
            setSubmitting(false);
        }
    }

    if (result) {
        return (
            <div className="max-w-2xl mx-auto px-6 py-20 text-center">
                <div className="w-16 h-16 rounded-full bg-brand-green/20 mx-auto flex items-center justify-center mb-5">
                    <Check className="text-brand-green" size={32} />
                </div>
                <h1 className="font-serif text-3xl text-warm-cream mb-3">Inquiry received</h1>
                <p className="text-warm-cream/60 mb-2">Reference: <span className="text-brand-green font-mono">{result.code}</span></p>
                <p className="text-warm-cream/60 mb-8">We'll review your event and email a tailored quote within 24 hours.</p>
                <a href={result.trackUrl} className="inline-block px-6 py-3 rounded-full bg-brand-green text-white font-semibold hover:bg-brand-green/90 transition-colors">
                    Track booking →
                </a>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-6 py-10">
            <div className="mb-8 text-center">
                <p className="text-[11px] uppercase tracking-[0.3em] text-brand-green mb-3 flex items-center justify-center gap-2"><Sparkles size={14} /> Plan My Owambe</p>
                <h1 className="font-serif text-3xl md:text-5xl text-warm-cream mb-2">{tagline}</h1>
                <p className="text-warm-cream/50 text-sm">Tell us about your event — we'll handle slaughter, cuts, grilling, the lot.</p>
            </div>

            {/* Stepper */}
            <div className="flex items-center justify-center gap-2 mb-10 flex-wrap">
                {STEPS.map((s, i) => (
                    <div key={s} className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                            i === step ? "bg-brand-green text-white" : i < step ? "bg-brand-green/30 text-brand-green" : "bg-warm-cream/8 text-warm-cream/40"
                        }`}>
                            {i < step ? <Check size={12} /> : i + 1}
                        </div>
                        <span className={`text-[11px] hidden sm:inline ${i === step ? "text-warm-cream" : "text-warm-cream/40"}`}>{s}</span>
                        {i < STEPS.length - 1 && <span className="w-4 h-px bg-warm-cream/15" />}
                    </div>
                ))}
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={step}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.25 }}
                    className="bg-white/[0.04] rounded-2xl border border-warm-cream/10 p-6 md:p-8 min-h-[300px]"
                >
                    {step === 0 && (
                        <div>
                            <h2 className="font-serif text-xl text-warm-cream mb-1">What's the occasion?</h2>
                            <p className="text-sm text-warm-cream/50 mb-6">We tailor portions, presentation, and service to the moment.</p>
                            {occasions.length === 0 ? (
                                <p className="text-warm-cream/40 text-sm">No occasions configured yet.</p>
                            ) : (
                                <div className="grid sm:grid-cols-2 gap-3">
                                    {occasions.map((o) => (
                                        <button key={o.id} onClick={() => { setOccasionId(o.id); if (o.typicalHeadcountMax) setHeadcount(o.typicalHeadcountMax); }}
                                            className={`text-left p-4 rounded-xl border transition-all cursor-pointer ${occasionId === o.id ? "bg-brand-green/15 border-brand-green/50" : "bg-warm-cream/5 border-warm-cream/10 hover:border-warm-cream/25"}`}>
                                            <p className="font-semibold text-warm-cream">{o.name}</p>
                                            {o.description && <p className="text-xs text-warm-cream/50 mt-1">{o.description}</p>}
                                            {(o.typicalHeadcountMin || o.typicalHeadcountMax) && (
                                                <p className="text-[11px] text-warm-cream/40 mt-2"><Users size={10} className="inline mr-1" /> typically {o.typicalHeadcountMin || ""}–{o.typicalHeadcountMax || ""} guests</p>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {step === 1 && (
                        <div>
                            <h2 className="font-serif text-xl text-warm-cream mb-1">How many guests?</h2>
                            <p className="text-sm text-warm-cream/50 mb-6">We'll do the yield math for you.</p>
                            <div className="flex items-center gap-4 mb-6">
                                <input type="range" min={5} max={500} step={5} value={headcount} onChange={(e) => setHeadcount(Number(e.target.value))} className="flex-1 accent-brand-green" />
                                <input type="number" min={1} value={headcount} onChange={(e) => setHeadcount(Number(e.target.value))} className="w-24 bg-black/40 text-warm-cream text-sm px-3 py-2 rounded border border-warm-cream/10 text-center" />
                            </div>
                            <p className="text-warm-cream/70 text-sm">~<span className="text-brand-green font-semibold">{headcount}</span> adults to feed</p>
                        </div>
                    )}

                    {step === 2 && (
                        <div>
                            <h2 className="font-serif text-xl text-warm-cream mb-1">Choose your animals</h2>
                            <p className="text-sm text-warm-cream/50 mb-6">
                                You need to feed <span className="text-brand-green font-semibold">{headcount}</span>. Currently covered: <span className={totalCovered >= headcount ? "text-brand-green font-semibold" : "text-amber-400"}>{totalCovered}</span>
                            </p>
                            {animals.length === 0 ? (
                                <p className="text-warm-cream/40 text-sm">No animals configured yet.</p>
                            ) : (
                                <div className="grid sm:grid-cols-2 gap-3">
                                    {animals.map((a) => {
                                        const qty = selections[a.id] || 0;
                                        const need = Math.max(1, Math.ceil(headcount / a.feedsAdults));
                                        return (
                                            <div key={a.id} className="bg-warm-cream/5 border border-warm-cream/10 rounded-xl p-4">
                                                {a.imageUrl && <div className="h-28 rounded-lg bg-cover bg-center mb-3" style={{ backgroundImage: `url(${a.imageUrl})` }} />}
                                                <div className="flex items-baseline justify-between mb-1">
                                                    <p className="font-semibold text-warm-cream">{a.name}</p>
                                                    <p className="text-sm text-brand-green">{formatCurrency(a.basePrice)}</p>
                                                </div>
                                                <p className="text-[11px] text-warm-cream/50">Feeds ~{a.feedsAdults} · Suggested: {need}</p>
                                                <div className="mt-3 flex items-center gap-2">
                                                    <button onClick={() => setSelections((s) => ({ ...s, [a.id]: Math.max(0, (s[a.id] || 0) - 1) }))} className="w-8 h-8 rounded-full bg-warm-cream/10 text-warm-cream cursor-pointer">−</button>
                                                    <span className="w-10 text-center text-warm-cream font-semibold">{qty}</span>
                                                    <button onClick={() => setSelections((s) => ({ ...s, [a.id]: (s[a.id] || 0) + 1 }))} className="w-8 h-8 rounded-full bg-brand-green text-white cursor-pointer">+</button>
                                                    <button onClick={() => setSelections((s) => ({ ...s, [a.id]: need }))} className="ml-auto text-[11px] text-brand-green hover:underline cursor-pointer">Use suggested</button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {step === 3 && (
                        <div>
                            <h2 className="font-serif text-xl text-warm-cream mb-1">Service tier</h2>
                            <p className="text-sm text-warm-cream/50 mb-6">Pick how hands-on we should be.</p>
                            {tiers.length === 0 ? (
                                <p className="text-warm-cream/40 text-sm">No service tiers configured yet.</p>
                            ) : (
                                <div className="space-y-3">
                                    {tiers.map((t) => (
                                        <button key={t.id} onClick={() => setTierId(t.id)} className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer ${tierId === t.id ? "bg-brand-green/15 border-brand-green/50" : "bg-warm-cream/5 border-warm-cream/10 hover:border-warm-cream/25"}`}>
                                            <div className="flex items-baseline justify-between">
                                                <p className="font-semibold text-warm-cream">{t.name}</p>
                                                <p className="text-sm text-brand-green">
                                                    {t.priceModifier > 0 && `${formatCurrency(t.priceModifier)} `}
                                                    {t.pricePerHead > 0 && `+ ${formatCurrency(t.pricePerHead)}/head`}
                                                </p>
                                            </div>
                                            {t.description && <p className="text-xs text-warm-cream/50 mt-1">{t.description}</p>}
                                            {t.includes.length > 0 && (
                                                <ul className="mt-2 space-y-0.5">
                                                    {t.includes.map((inc, i) => <li key={i} className="text-[11px] text-warm-cream/60 flex items-center gap-1.5"><Check size={10} className="text-brand-green" /> {inc}</li>)}
                                                </ul>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {step === 4 && (
                        <div>
                            <h2 className="font-serif text-xl text-warm-cream mb-1">Logistics & contact</h2>
                            <p className="text-sm text-warm-cream/50 mb-6">Where, when, and how to reach you.</p>
                            <div className="grid md:grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-warm-cream/60">Event date</label>
                                    <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="w-full mt-1 bg-black/40 text-warm-cream text-sm px-3 py-2 rounded border border-warm-cream/10" />
                                </div>
                                <div>
                                    <label className="text-xs text-warm-cream/60">Event time</label>
                                    <input type="time" value={eventTime} onChange={(e) => setEventTime(e.target.value)} className="w-full mt-1 bg-black/40 text-warm-cream text-sm px-3 py-2 rounded border border-warm-cream/10" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="text-xs text-warm-cream/60">Venue address</label>
                                    <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, building, landmark" className="w-full mt-1 bg-black/40 text-warm-cream text-sm px-3 py-2 rounded border border-warm-cream/10" />
                                </div>
                                <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" className="bg-black/40 text-warm-cream text-sm px-3 py-2 rounded border border-warm-cream/10" />
                                <input value={state} onChange={(e) => setState(e.target.value)} placeholder="State" className="bg-black/40 text-warm-cream text-sm px-3 py-2 rounded border border-warm-cream/10" />
                                <textarea value={locationNotes} onChange={(e) => setLocationNotes(e.target.value)} placeholder="Parking, water, power notes" rows={2} className="md:col-span-2 bg-black/40 text-warm-cream text-sm px-3 py-2 rounded border border-warm-cream/10" />
                                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="bg-black/40 text-warm-cream text-sm px-3 py-2 rounded border border-warm-cream/10" />
                                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="bg-black/40 text-warm-cream text-sm px-3 py-2 rounded border border-warm-cream/10" />
                                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" className="md:col-span-2 bg-black/40 text-warm-cream text-sm px-3 py-2 rounded border border-warm-cream/10" />
                                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything else we should know?" rows={2} className="md:col-span-2 bg-black/40 text-warm-cream text-sm px-3 py-2 rounded border border-warm-cream/10" />
                            </div>
                        </div>
                    )}

                    {step === 5 && (
                        <div>
                            <h2 className="font-serif text-xl text-warm-cream mb-1">Review & submit</h2>
                            <p className="text-sm text-warm-cream/50 mb-6">Final check before sending.</p>
                            <div className="space-y-2 text-sm">
                                <Row label="Occasion" value={selectedOccasion?.name || "—"} />
                                <Row label="Guests" value={`${headcount} adults`} />
                                <Row label="Animals" value={animalSelections.map((s) => `${s.quantity}× ${s.animalName}`).join(", ") || "—"} />
                                <Row label="Service tier" value={selectedTier?.name || "—"} />
                                <Row label="Date" value={`${eventDate}${eventTime ? ` · ${eventTime}` : ""}`} />
                                <Row label="Venue" value={`${address}${city ? `, ${city}` : ""}${state ? `, ${state}` : ""}`} />
                                <Row label="Contact" value={`${name} · ${email} · ${phone}`} />
                                <div className="pt-3 mt-3 border-t border-warm-cream/10 flex items-baseline justify-between">
                                    <span className="text-warm-cream/60">Estimated total</span>
                                    <span className="font-serif text-2xl text-brand-green">{formatCurrency(estimatedTotal)}</span>
                                </div>
                                <p className="text-[11px] text-warm-cream/40">Final quote sent within 24h after our team reviews logistics.</p>
                            </div>
                            {error && <p className="mt-4 text-red-400 text-xs">{error}</p>}
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>

            <div className="mt-6 flex items-center justify-between">
                <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className="flex items-center gap-1 text-sm text-warm-cream/60 hover:text-warm-cream disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed">
                    <ChevronLeft size={16} /> Back
                </button>
                {step < STEPS.length - 1 ? (
                    <button onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))} disabled={!canNext()} className="flex items-center gap-1 px-5 py-2.5 rounded-full bg-brand-green text-white font-semibold disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer">
                        Next <ChevronRight size={16} />
                    </button>
                ) : (
                    <button onClick={submit} disabled={submitting} className="flex items-center gap-1 px-6 py-2.5 rounded-full bg-brand-green text-white font-semibold disabled:opacity-50 cursor-pointer">
                        {submitting ? "Sending..." : "Send inquiry"} <ChevronRight size={16} />
                    </button>
                )}
            </div>
        </div>
    );
}

function Row({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between py-1">
            <span className="text-warm-cream/50">{label}</span>
            <span className="text-warm-cream text-right max-w-[60%]">{value}</span>
        </div>
    );
}
