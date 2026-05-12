"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Save } from "lucide-react";
import type { Marinade, ProcessingOption } from "@/types";

interface Props {
    initialMarinades: Marinade[];
    initialOptions: ProcessingOption[];
}

export default function ProcessingAdmin({ initialMarinades, initialOptions }: Props) {
    const router = useRouter();
    const [marinades, setMarinades] = useState(initialMarinades);
    const [options, setOptions] = useState(initialOptions);
    const [saving, setSaving] = useState(false);

    const blankMarinade = (): Marinade => ({
        id: "", name: "", description: "", imageUrl: "", extraFee: 0, cureHours: 0, isActive: true, sortOrder: marinades.length, createdAt: "",
    });
    const blankOption = (): ProcessingOption => ({
        id: "", label: "", description: "", icon: "", extraFee: 0, extendsShelfLife: false, isActive: true, sortOrder: options.length, createdAt: "",
    });

    async function saveMarinade(m: Marinade) {
        setSaving(true);
        await fetch("/api/admin/marinades", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(m) });
        setSaving(false);
        router.refresh();
    }
    async function delMarinade(id: string) {
        if (!id) { setMarinades((s) => s.filter((m) => m.id !== id)); return; }
        if (!confirm("Delete this marinade?")) return;
        await fetch(`/api/admin/marinades?id=${id}`, { method: "DELETE" });
        router.refresh();
    }
    async function saveOption(o: ProcessingOption) {
        setSaving(true);
        await fetch("/api/admin/processing-options", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(o) });
        setSaving(false);
        router.refresh();
    }
    async function delOption(id: string) {
        if (!id) { setOptions((s) => s.filter((o) => o.id !== id)); return; }
        if (!confirm("Delete this option?")) return;
        await fetch(`/api/admin/processing-options?id=${id}`, { method: "DELETE" });
        router.refresh();
    }

    return (
        <div className="grid lg:grid-cols-2 gap-6">
            {/* Processing Options */}
            <section className="bg-white/[0.04] rounded-xl border border-warm-cream/15 p-5">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="font-serif text-lg text-warm-cream">Processing Options</h2>
                    <button onClick={() => setOptions((s) => [...s, blankOption()])} className="flex items-center gap-1.5 text-xs text-brand-green hover:text-brand-green/80 cursor-pointer">
                        <Plus size={14} /> Add
                    </button>
                </div>
                <div className="space-y-3">
                    {options.map((o, i) => (
                        <div key={o.id || `new-${i}`} className="bg-black/20 rounded-lg p-3 space-y-2">
                            <div className="flex gap-2">
                                <input value={o.label} onChange={(e) => setOptions((s) => s.map((x, j) => j === i ? { ...x, label: e.target.value } : x))} placeholder="Label (Mince, Cube, etc.)" className="flex-1 bg-black/40 text-warm-cream text-sm px-3 py-2 rounded border border-warm-cream/10 focus:outline-none focus:border-brand-green/50" />
                                <input type="number" value={o.extraFee} onChange={(e) => setOptions((s) => s.map((x, j) => j === i ? { ...x, extraFee: Number(e.target.value) } : x))} placeholder="Fee" className="w-24 bg-black/40 text-warm-cream text-sm px-3 py-2 rounded border border-warm-cream/10" />
                            </div>
                            <input value={o.description || ""} onChange={(e) => setOptions((s) => s.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} placeholder="Description" className="w-full bg-black/40 text-warm-cream text-xs px-3 py-2 rounded border border-warm-cream/10" />
                            <div className="flex items-center justify-between text-xs">
                                <label className="flex items-center gap-2 text-warm-cream/70">
                                    <input type="checkbox" checked={o.extendsShelfLife} onChange={(e) => setOptions((s) => s.map((x, j) => j === i ? { ...x, extendsShelfLife: e.target.checked } : x))} /> Extends shelf life
                                </label>
                                <label className="flex items-center gap-2 text-warm-cream/70">
                                    <input type="checkbox" checked={o.isActive} onChange={(e) => setOptions((s) => s.map((x, j) => j === i ? { ...x, isActive: e.target.checked } : x))} /> Active
                                </label>
                                <div className="flex gap-2">
                                    <button onClick={() => saveOption(o)} disabled={saving || !o.label} className="flex items-center gap-1 px-2 py-1 bg-brand-green/20 text-brand-green rounded hover:bg-brand-green/30 disabled:opacity-40 cursor-pointer"><Save size={12} /> Save</button>
                                    <button onClick={() => delOption(o.id)} className="text-red-400 hover:text-red-300 cursor-pointer"><Trash2 size={14} /></button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {options.length === 0 && <p className="text-xs text-warm-cream/40 py-4 text-center">No processing options yet. Add one to get started.</p>}
                </div>
            </section>

            {/* Marinades */}
            <section className="bg-white/[0.04] rounded-xl border border-warm-cream/15 p-5">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="font-serif text-lg text-warm-cream">Marinades</h2>
                    <button onClick={() => setMarinades((s) => [...s, blankMarinade()])} className="flex items-center gap-1.5 text-xs text-brand-green hover:text-brand-green/80 cursor-pointer">
                        <Plus size={14} /> Add
                    </button>
                </div>
                <div className="space-y-3">
                    {marinades.map((m, i) => (
                        <div key={m.id || `new-${i}`} className="bg-black/20 rounded-lg p-3 space-y-2">
                            <div className="flex gap-2">
                                <input value={m.name} onChange={(e) => setMarinades((s) => s.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} placeholder="Name (Suya, Jerk, etc.)" className="flex-1 bg-black/40 text-warm-cream text-sm px-3 py-2 rounded border border-warm-cream/10 focus:outline-none focus:border-brand-green/50" />
                                <input type="number" value={m.extraFee} onChange={(e) => setMarinades((s) => s.map((x, j) => j === i ? { ...x, extraFee: Number(e.target.value) } : x))} placeholder="Fee" className="w-24 bg-black/40 text-warm-cream text-sm px-3 py-2 rounded border border-warm-cream/10" />
                                <input type="number" value={m.cureHours} onChange={(e) => setMarinades((s) => s.map((x, j) => j === i ? { ...x, cureHours: Number(e.target.value) } : x))} placeholder="Cure hrs" className="w-20 bg-black/40 text-warm-cream text-sm px-3 py-2 rounded border border-warm-cream/10" />
                            </div>
                            <input value={m.imageUrl || ""} onChange={(e) => setMarinades((s) => s.map((x, j) => j === i ? { ...x, imageUrl: e.target.value } : x))} placeholder="Image URL" className="w-full bg-black/40 text-warm-cream text-xs px-3 py-2 rounded border border-warm-cream/10" />
                            <input value={m.description || ""} onChange={(e) => setMarinades((s) => s.map((x, j) => j === i ? { ...x, description: e.target.value } : x))} placeholder="Description" className="w-full bg-black/40 text-warm-cream text-xs px-3 py-2 rounded border border-warm-cream/10" />
                            <div className="flex items-center justify-between text-xs">
                                <label className="flex items-center gap-2 text-warm-cream/70">
                                    <input type="checkbox" checked={m.isActive} onChange={(e) => setMarinades((s) => s.map((x, j) => j === i ? { ...x, isActive: e.target.checked } : x))} /> Active
                                </label>
                                <div className="flex gap-2">
                                    <button onClick={() => saveMarinade(m)} disabled={saving || !m.name} className="flex items-center gap-1 px-2 py-1 bg-brand-green/20 text-brand-green rounded hover:bg-brand-green/30 disabled:opacity-40 cursor-pointer"><Save size={12} /> Save</button>
                                    <button onClick={() => delMarinade(m.id)} className="text-red-400 hover:text-red-300 cursor-pointer"><Trash2 size={14} /></button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {marinades.length === 0 && <p className="text-xs text-warm-cream/40 py-4 text-center">No marinades yet. Add one to get started.</p>}
                </div>
            </section>
        </div>
    );
}
