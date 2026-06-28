"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Plus, Trash2 } from "lucide-react";
import type { ButcherProfile } from "@/types";

interface Props {
    deliveryCutoffHour: number;
    deliveryCutoffLabel: string;
    eventsEnabled: boolean;
    eventsTagline: string;
    butcherProfiles: ButcherProfile[];
}

export default function ServicesConfig(p: Props) {
    const router = useRouter();
    const [cutoffH, setCutoffH] = useState(p.deliveryCutoffHour);
    const [cutoffL, setCutoffL] = useState(p.deliveryCutoffLabel);
    const [events, setEvents] = useState(p.eventsEnabled);
    const [tagline, setTagline] = useState(p.eventsTagline);
    const [profiles, setProfiles] = useState<ButcherProfile[]>(p.butcherProfiles);
    const [saving, setSaving] = useState(false);

    const addProfile = () => setProfiles((s) => [...s, { id: crypto.randomUUID(), name: "", role: "", bio: "", imageUrl: "", specialties: [] }]);

    async function save() {
        setSaving(true);
        await fetch("/api/admin/services-config", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                deliveryCutoffHour: cutoffH, deliveryCutoffLabel: cutoffL,
                eventsEnabled: events, eventsTagline: tagline,
                butcherProfiles: profiles.filter((b) => b.name),
            }),
        });
        setSaving(false);
        router.refresh();
    }

    return (
        <div className="space-y-6">
            <section className="bg-white/[0.04] rounded-xl border border-warm-cream/15 p-5 space-y-3">
                <h2 className="font-serif text-lg text-warm-cream">Delivery cutoff</h2>
                <p className="text-xs text-warm-cream/50">Orders placed after this hour are scheduled for the next day's delivery.</p>
                <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                        <label className="text-xs text-warm-cream/60">Cutoff hour (0–23)</label>
                        <input type="number" min={0} max={23} value={cutoffH} onChange={(e) => setCutoffH(Number(e.target.value))} className="w-full mt-1 bg-black/40 text-warm-cream text-sm px-3 py-2 rounded border border-warm-cream/10" />
                    </div>
                    <div>
                        <label className="text-xs text-warm-cream/60">Customer-facing label</label>
                        <input value={cutoffL} onChange={(e) => setCutoffL(e.target.value)} className="w-full mt-1 bg-black/40 text-warm-cream text-sm px-3 py-2 rounded border border-warm-cream/10" />
                    </div>
                </div>
            </section>

            <section className="bg-white/[0.04] rounded-xl border border-warm-cream/15 p-5 space-y-3">
                <h2 className="font-serif text-lg text-warm-cream">Service toggles</h2>
                <label className="flex items-center gap-2 text-sm text-warm-cream/80">
                    <input type="checkbox" checked={events} onChange={(e) => setEvents(e.target.checked)} /> Outdoor Butchery enabled
                </label>
                <div>
                    <label className="text-xs text-warm-cream/60">Outdoor Butchery tagline</label>
                    <input value={tagline} onChange={(e) => setTagline(e.target.value)} className="w-full mt-1 bg-black/40 text-warm-cream text-sm px-3 py-2 rounded border border-warm-cream/10" />
                </div>
            </section>

            <section className="bg-white/[0.04] rounded-xl border border-warm-cream/15 p-5">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="font-serif text-lg text-warm-cream">Butcher profiles</h2>
                    <button onClick={addProfile} className="flex items-center gap-1.5 text-xs text-brand-green cursor-pointer"><Plus size={14} /> Add</button>
                </div>
                <div className="space-y-3">
                    {profiles.map((b, i) => (
                        <div key={b.id} className="bg-black/20 rounded-lg p-3 space-y-2">
                            <div className="grid md:grid-cols-2 gap-2">
                                <input value={b.name} onChange={(e) => setProfiles((s) => s.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} placeholder="Name (Chef Kola)" className="bg-black/40 text-warm-cream text-sm px-3 py-2 rounded border border-warm-cream/10" />
                                <input value={b.role} onChange={(e) => setProfiles((s) => s.map((x, j) => j === i ? { ...x, role: e.target.value } : x))} placeholder="Role (Master Butcher)" className="bg-black/40 text-warm-cream text-sm px-3 py-2 rounded border border-warm-cream/10" />
                            </div>
                            <input value={b.imageUrl || ""} onChange={(e) => setProfiles((s) => s.map((x, j) => j === i ? { ...x, imageUrl: e.target.value } : x))} placeholder="Image URL" className="w-full bg-black/40 text-warm-cream text-sm px-3 py-2 rounded border border-warm-cream/10" />
                            <textarea value={b.bio || ""} onChange={(e) => setProfiles((s) => s.map((x, j) => j === i ? { ...x, bio: e.target.value } : x))} placeholder="Short bio" rows={2} className="w-full bg-black/40 text-warm-cream text-sm px-3 py-2 rounded border border-warm-cream/10" />
                            <input value={(b.specialties || []).join(", ")} onChange={(e) => setProfiles((s) => s.map((x, j) => j === i ? { ...x, specialties: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) } : x))} placeholder="Specialties (comma separated)" className="w-full bg-black/40 text-warm-cream text-sm px-3 py-2 rounded border border-warm-cream/10" />
                            <div className="flex justify-end">
                                <button onClick={() => setProfiles((s) => s.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-300 cursor-pointer"><Trash2 size={14} /></button>
                            </div>
                        </div>
                    ))}
                    {profiles.length === 0 && <p className="text-xs text-warm-cream/40 py-4 text-center">No profiles yet.</p>}
                </div>
            </section>

            <button onClick={save} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 bg-brand-green text-white rounded-full font-semibold hover:bg-brand-green/90 disabled:opacity-50 cursor-pointer">
                <Save size={14} /> {saving ? "Saving..." : "Save all"}
            </button>
        </div>
    );
}
