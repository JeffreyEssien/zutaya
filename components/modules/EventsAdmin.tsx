"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Save, Trash2 } from "lucide-react";
import type { EventOccasion, EventAnimal, EventServiceTier } from "@/types";

interface Props {
    initialOccasions: EventOccasion[];
    initialAnimals: EventAnimal[];
    initialTiers: EventServiceTier[];
}

export default function EventsAdmin({ initialOccasions, initialAnimals, initialTiers }: Props) {
    const router = useRouter();
    const [tab, setTab] = useState<"occasions" | "animals" | "tiers">("occasions");
    const [occ, setOcc] = useState(initialOccasions);
    const [ani, setAni] = useState(initialAnimals);
    const [tiers, setTiers] = useState(initialTiers);

    const blankOcc = (): EventOccasion => ({ id: "", name: "", description: "", icon: "", typicalHeadcountMin: undefined, typicalHeadcountMax: undefined, isActive: true, sortOrder: occ.length });
    const blankAni = (): EventAnimal => ({ id: "", name: "", description: "", imageUrl: "", basePrice: 0, feedsAdults: 1, typicalWeightKg: undefined, isActive: true, sortOrder: ani.length });
    const blankTier = (): EventServiceTier => ({ id: "", name: "", description: "", priceModifier: 0, pricePerHead: 0, includes: [], isActive: true, sortOrder: tiers.length });

    async function save(url: string, body: any) {
        await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        router.refresh();
    }
    async function del(url: string, id: string) {
        if (!id) return;
        if (!confirm("Delete?")) return;
        await fetch(`${url}?id=${id}`, { method: "DELETE" });
        router.refresh();
    }

    return (
        <div>
            <div className="flex gap-2 mb-5 border-b border-warm-cream/10">
                {(["occasions", "animals", "tiers"] as const).map((t) => (
                    <button key={t} onClick={() => setTab(t)} className={`pb-3 px-2 text-sm font-semibold capitalize cursor-pointer ${tab === t ? "text-warm-cream border-b-2 border-brand-green" : "text-warm-cream/40"}`}>{t}</button>
                ))}
            </div>

            {tab === "occasions" && (
                <Section title="Occasions" onAdd={() => setOcc((s) => [...s, blankOcc()])}>
                    {occ.map((o, i) => (
                        <Card key={o.id || `n-${i}`}>
                            <Inp value={o.name} onChange={(v) => setOcc((s) => s.map((x, j) => j === i ? { ...x, name: v } : x))} placeholder="Name (Owambe, Wedding...)" />
                            <Inp value={o.description || ""} onChange={(v) => setOcc((s) => s.map((x, j) => j === i ? { ...x, description: v } : x))} placeholder="Description" />
                            <div className="flex gap-2">
                                <Inp type="number" value={String(o.typicalHeadcountMin || "")} onChange={(v) => setOcc((s) => s.map((x, j) => j === i ? { ...x, typicalHeadcountMin: v ? Number(v) : undefined } : x))} placeholder="Min headcount" />
                                <Inp type="number" value={String(o.typicalHeadcountMax || "")} onChange={(v) => setOcc((s) => s.map((x, j) => j === i ? { ...x, typicalHeadcountMax: v ? Number(v) : undefined } : x))} placeholder="Max headcount" />
                            </div>
                            <Actions
                                isActive={o.isActive}
                                onActive={(v) => setOcc((s) => s.map((x, j) => j === i ? { ...x, isActive: v } : x))}
                                canSave={!!o.name}
                                onSave={() => save("/api/admin/event-occasions", o)}
                                onDel={() => o.id ? del("/api/admin/event-occasions", o.id) : setOcc((s) => s.filter((_, j) => j !== i))}
                            />
                        </Card>
                    ))}
                </Section>
            )}

            {tab === "animals" && (
                <Section title="Animals" onAdd={() => setAni((s) => [...s, blankAni()])}>
                    {ani.map((a, i) => (
                        <Card key={a.id || `n-${i}`}>
                            <Inp value={a.name} onChange={(v) => setAni((s) => s.map((x, j) => j === i ? { ...x, name: v } : x))} placeholder="Name (Whole Ram, Goat, Cow)" />
                            <Inp value={a.imageUrl || ""} onChange={(v) => setAni((s) => s.map((x, j) => j === i ? { ...x, imageUrl: v } : x))} placeholder="Image URL" />
                            <Inp value={a.description || ""} onChange={(v) => setAni((s) => s.map((x, j) => j === i ? { ...x, description: v } : x))} placeholder="Description" />
                            <div className="flex gap-2">
                                <Inp type="number" value={String(a.basePrice)} onChange={(v) => setAni((s) => s.map((x, j) => j === i ? { ...x, basePrice: Number(v) } : x))} placeholder="Base price ₦" />
                                <Inp type="number" value={String(a.feedsAdults)} onChange={(v) => setAni((s) => s.map((x, j) => j === i ? { ...x, feedsAdults: Number(v) } : x))} placeholder="Feeds adults" />
                                <Inp type="number" value={String(a.typicalWeightKg || "")} onChange={(v) => setAni((s) => s.map((x, j) => j === i ? { ...x, typicalWeightKg: v ? Number(v) : undefined } : x))} placeholder="Weight (kg)" />
                            </div>
                            <Actions
                                isActive={a.isActive}
                                onActive={(v) => setAni((s) => s.map((x, j) => j === i ? { ...x, isActive: v } : x))}
                                canSave={!!a.name && a.basePrice > 0 && a.feedsAdults > 0}
                                onSave={() => save("/api/admin/event-animals", a)}
                                onDel={() => a.id ? del("/api/admin/event-animals", a.id) : setAni((s) => s.filter((_, j) => j !== i))}
                            />
                        </Card>
                    ))}
                </Section>
            )}

            {tab === "tiers" && (
                <Section title="Service tiers" onAdd={() => setTiers((s) => [...s, blankTier()])}>
                    {tiers.map((t, i) => (
                        <Card key={t.id || `n-${i}`}>
                            <Inp value={t.name} onChange={(v) => setTiers((s) => s.map((x, j) => j === i ? { ...x, name: v } : x))} placeholder="Name (Slaughter only, On-site Grilling, Full Chef)" />
                            <Inp value={t.description || ""} onChange={(v) => setTiers((s) => s.map((x, j) => j === i ? { ...x, description: v } : x))} placeholder="Description" />
                            <div className="flex gap-2">
                                <Inp type="number" value={String(t.priceModifier)} onChange={(v) => setTiers((s) => s.map((x, j) => j === i ? { ...x, priceModifier: Number(v) } : x))} placeholder="Flat fee ₦" />
                                <Inp type="number" value={String(t.pricePerHead)} onChange={(v) => setTiers((s) => s.map((x, j) => j === i ? { ...x, pricePerHead: Number(v) } : x))} placeholder="Per head ₦" />
                            </div>
                            <textarea value={t.includes.join("\n")} onChange={(e) => setTiers((s) => s.map((x, j) => j === i ? { ...x, includes: e.target.value.split("\n").map((l) => l.trim()).filter(Boolean) } : x))} placeholder="Includes (one per line)" rows={3} className="w-full bg-black/40 text-warm-cream text-sm px-3 py-2 rounded border border-warm-cream/10" />
                            <Actions
                                isActive={t.isActive}
                                onActive={(v) => setTiers((s) => s.map((x, j) => j === i ? { ...x, isActive: v } : x))}
                                canSave={!!t.name}
                                onSave={() => save("/api/admin/event-tiers", t)}
                                onDel={() => t.id ? del("/api/admin/event-tiers", t.id) : setTiers((s) => s.filter((_, j) => j !== i))}
                            />
                        </Card>
                    ))}
                </Section>
            )}
        </div>
    );
}

function Section({ title, onAdd, children }: { title: string; onAdd: () => void; children: React.ReactNode }) {
    return (
        <section className="bg-white/[0.04] rounded-xl border border-warm-cream/15 p-5">
            <div className="flex items-center justify-between mb-4">
                <h2 className="font-serif text-lg text-warm-cream">{title}</h2>
                <button onClick={onAdd} className="flex items-center gap-1.5 text-xs text-brand-green hover:text-brand-green/80 cursor-pointer"><Plus size={14} /> Add</button>
            </div>
            <div className="space-y-3">{children}</div>
        </section>
    );
}
function Card({ children }: { children: React.ReactNode }) {
    return <div className="bg-black/20 rounded-lg p-3 space-y-2">{children}</div>;
}
function Inp({ value, onChange, placeholder, type = "text" }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
    return <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full bg-black/40 text-warm-cream text-sm px-3 py-2 rounded border border-warm-cream/10 focus:outline-none focus:border-brand-green/50" />;
}
function Actions({ isActive, onActive, canSave, onSave, onDel }: { isActive: boolean; onActive: (v: boolean) => void; canSave: boolean; onSave: () => void; onDel: () => void }) {
    return (
        <div className="flex items-center justify-between text-xs">
            <label className="flex items-center gap-2 text-warm-cream/70">
                <input type="checkbox" checked={isActive} onChange={(e) => onActive(e.target.checked)} /> Active
            </label>
            <div className="flex gap-2">
                <button onClick={onSave} disabled={!canSave} className="flex items-center gap-1 px-2 py-1 bg-brand-green/20 text-brand-green rounded hover:bg-brand-green/30 disabled:opacity-40 cursor-pointer"><Save size={12} /> Save</button>
                <button onClick={onDel} className="text-red-400 hover:text-red-300 cursor-pointer"><Trash2 size={14} /></button>
            </div>
        </div>
    );
}
