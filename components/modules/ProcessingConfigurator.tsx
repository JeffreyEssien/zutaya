"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Snowflake, Clock, Check } from "lucide-react";
import type { Marinade, ProcessingOption, CartItemProcessing } from "@/types";
import { formatCurrency } from "@/lib/formatCurrency";

interface Props {
    marinades: Marinade[];
    processingOptions: ProcessingOption[];
    pricePerKg?: number;
    minGrams?: number;
    maxGrams?: number;
    stepGrams?: number;
    onChange: (cfg: CartItemProcessing, extraFee: number) => void;
}

export default function ProcessingConfigurator({
    marinades,
    processingOptions,
    pricePerKg,
    minGrams = 250,
    maxGrams = 5000,
    stepGrams = 250,
    onChange,
}: Props) {
    const [open, setOpen] = useState(false);
    const [portion, setPortion] = useState<number>(0); // 0 = no override
    const [selectedOpts, setSelectedOpts] = useState<string[]>([]);
    const [marinadeId, setMarinadeId] = useState<string | undefined>();
    const [vacuum, setVacuum] = useState(false);
    const [notes, setNotes] = useState("");

    const activeMarinade = marinades.find((m) => m.id === marinadeId);

    const extraFee = useMemo(() => {
        let f = 0;
        for (const id of selectedOpts) {
            const o = processingOptions.find((p) => p.id === id);
            if (o) f += o.extraFee;
        }
        if (activeMarinade) f += activeMarinade.extraFee;
        if (vacuum) f += 200;
        return f;
    }, [selectedOpts, marinades, processingOptions, activeMarinade, vacuum]);

    const emit = (next?: Partial<{ portion: number; selectedOpts: string[]; marinadeId?: string; vacuum: boolean; notes: string }>) => {
        const p = next?.portion ?? portion;
        const ops = next?.selectedOpts ?? selectedOpts;
        const m = next && "marinadeId" in next ? next.marinadeId : marinadeId;
        const v = next?.vacuum ?? vacuum;
        const n = next?.notes ?? notes;
        const cfg: CartItemProcessing = {};
        if (p > 0) cfg.portionGrams = p;
        if (ops.length) cfg.processingOptionIds = ops;
        if (m) cfg.marinadeId = m;
        if (v) cfg.vacuumSealed = true;
        if (n.trim()) cfg.notes = n.trim();
        let f = 0;
        for (const id of ops) {
            const o = processingOptions.find((x) => x.id === id);
            if (o) f += o.extraFee;
        }
        const mar = marinades.find((x) => x.id === m);
        if (mar) f += mar.extraFee;
        if (v) f += 200;
        onChange(cfg, f);
    };

    const toggleOpt = (id: string) => {
        const next = selectedOpts.includes(id) ? selectedOpts.filter((x) => x !== id) : [...selectedOpts, id];
        setSelectedOpts(next);
        emit({ selectedOpts: next });
    };

    const setMar = (id?: string) => {
        const next = marinadeId === id ? undefined : id;
        setMarinadeId(next);
        emit({ marinadeId: next });
    };

    const portionPrice = pricePerKg && portion ? (pricePerKg * portion) / 1000 : null;

    if (processingOptions.length === 0 && marinades.length === 0) return null;

    return (
        <div className="mb-6 rounded-xl border border-warm-cream/10 bg-warm-cream/[0.03] overflow-hidden">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="w-full flex items-center justify-between p-4 hover:bg-warm-cream/[0.04] transition-colors cursor-pointer"
            >
                <div className="text-left">
                    <p className="text-sm font-semibold text-warm-cream">Customize this cut</p>
                    <p className="text-[11px] text-warm-cream/50 mt-0.5">
                        {selectedOpts.length || marinadeId || vacuum || portion
                            ? `${[selectedOpts.length && `${selectedOpts.length} prep`, activeMarinade?.name, vacuum && "vacuum-sealed", portion && `${portion}g portions`].filter(Boolean).join(" · ")}`
                            : "Portion, prep, marinade, vacuum-seal"}
                    </p>
                </div>
                <span className="text-xs text-warm-cream/50">{extraFee > 0 ? `+${formatCurrency(extraFee)}` : open ? "Hide" : "Open"}</span>
            </button>

            <AnimatePresence initial={false}>
                {open && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                    >
                        <div className="p-4 pt-0 space-y-5 border-t border-warm-cream/8">
                            {/* Portion slider */}
                            {pricePerKg && (
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-[10px] font-semibold text-warm-cream/50 uppercase tracking-[0.2em]">Portion size</label>
                                        <span className="text-xs text-warm-cream/70">
                                            {portion ? `${portion}g · ${formatCurrency(portionPrice || 0)}` : "Whole cut"}
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min={0}
                                        max={maxGrams}
                                        step={stepGrams}
                                        value={portion}
                                        onChange={(e) => {
                                            const v = Number(e.target.value);
                                            setPortion(v);
                                            emit({ portion: v });
                                        }}
                                        className="w-full accent-brand-green"
                                    />
                                    <div className="flex justify-between text-[10px] text-warm-cream/40 mt-1">
                                        <span>Whole</span>
                                        <span>{minGrams}g</span>
                                        <span>{maxGrams}g</span>
                                    </div>
                                </div>
                            )}

                            {/* Processing chips */}
                            {processingOptions.length > 0 && (
                                <div>
                                    <label className="block text-[10px] font-semibold text-warm-cream/50 uppercase tracking-[0.2em] mb-2">Prep style</label>
                                    <div className="flex flex-wrap gap-2">
                                        {processingOptions.map((o) => {
                                            const on = selectedOpts.includes(o.id);
                                            return (
                                                <button
                                                    key={o.id}
                                                    type="button"
                                                    onClick={() => toggleOpt(o.id)}
                                                    className={`px-3.5 py-2 rounded-full text-xs font-medium transition-all cursor-pointer ${
                                                        on
                                                            ? "bg-brand-green text-white"
                                                            : "bg-warm-cream/5 text-warm-cream/70 hover:bg-warm-cream/10 border border-warm-cream/10"
                                                    }`}
                                                >
                                                    {on && <Check size={12} className="inline mr-1" />}
                                                    {o.label}
                                                    {o.extraFee > 0 && <span className="ml-1.5 opacity-70">+{formatCurrency(o.extraFee)}</span>}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Marinades */}
                            {marinades.length > 0 && (
                                <div>
                                    <label className="block text-[10px] font-semibold text-warm-cream/50 uppercase tracking-[0.2em] mb-2">Marinade</label>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {marinades.map((m) => {
                                            const on = marinadeId === m.id;
                                            return (
                                                <button
                                                    key={m.id}
                                                    type="button"
                                                    onClick={() => setMar(m.id)}
                                                    className={`relative text-left rounded-xl overflow-hidden border transition-all cursor-pointer ${
                                                        on ? "border-brand-green ring-2 ring-brand-green/40" : "border-warm-cream/10 hover:border-warm-cream/25"
                                                    }`}
                                                >
                                                    {m.imageUrl && (
                                                        <div
                                                            className="w-full h-20 bg-cover bg-center"
                                                            style={{ backgroundImage: `url(${m.imageUrl})` }}
                                                        />
                                                    )}
                                                    <div className="p-2.5">
                                                        <p className="text-xs font-semibold text-warm-cream">{m.name}</p>
                                                        <p className="text-[10px] text-warm-cream/50 flex items-center gap-1 mt-0.5">
                                                            {m.cureHours > 0 && (<><Clock size={10} /> {m.cureHours}h cure</>)}
                                                            {m.extraFee > 0 && <span className="ml-auto">+{formatCurrency(m.extraFee)}</span>}
                                                        </p>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Vacuum */}
                            <button
                                type="button"
                                onClick={() => { const v = !vacuum; setVacuum(v); emit({ vacuum: v }); }}
                                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                                    vacuum ? "bg-brand-green/10 border-brand-green/40" : "bg-warm-cream/5 border-warm-cream/10 hover:border-warm-cream/20"
                                }`}
                            >
                                <Snowflake size={16} className={vacuum ? "text-brand-green" : "text-warm-cream/50"} />
                                <div className="text-left flex-1">
                                    <p className="text-sm font-medium text-warm-cream">Vacuum-seal for freezer</p>
                                    <p className="text-[11px] text-warm-cream/50">Extends shelf life up to 90 days</p>
                                </div>
                                <span className="text-xs text-warm-cream/60">+{formatCurrency(200)}</span>
                            </button>

                            {/* Notes */}
                            <div>
                                <label className="block text-[10px] font-semibold text-warm-cream/50 uppercase tracking-[0.2em] mb-2">Notes for the butcher</label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => { setNotes(e.target.value); emit({ notes: e.target.value }); }}
                                    placeholder="e.g. trim fat, leave bone in"
                                    rows={2}
                                    className="w-full bg-warm-cream/5 border border-warm-cream/10 rounded-lg px-3 py-2 text-sm text-warm-cream placeholder:text-warm-cream/30 focus:outline-none focus:border-brand-green/40"
                                />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
