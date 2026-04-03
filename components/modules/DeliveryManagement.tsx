"use client";

import { useState, useMemo } from "react";
import type { DeliveryZoneWithLocations } from "@/lib/queries";
import {
    createDeliveryZone, updateDeliveryZone, deleteDeliveryZone,
    createDeliveryLocation, updateDeliveryLocation, deleteDeliveryLocation,
} from "@/lib/queries";
import { formatCurrency } from "@/lib/formatCurrency";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
    Truck, MapPin, Plus, Trash2, Edit3, Tag, Search,
    Package, Building2, ToggleLeft, ToggleRight,
    ChevronDown, ChevronUp, Percent, X, Save, Copy, Eye, EyeOff,
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════════
//  TYPES
// ═══════════════════════════════════════════════════════════════════
type Tab = "lagos" | "discounts";

interface Props { initialZones: DeliveryZoneWithLocations[]; }

// ═══════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════
export default function DeliveryManagement({ initialZones }: Props) {
    const router = useRouter();
    const [zones, setZones] = useState(initialZones);
    const [tab, setTab] = useState<Tab>("lagos");
    const [search, setSearch] = useState("");
    const [expandedZone, setExpandedZone] = useState<string | null>(null);
    const [editingZone, setEditingZone] = useState<string | null>(null);
    const [editingLoc, setEditingLoc] = useState<string | null>(null);
    const [showCreateZone, setShowCreateZone] = useState(false);
    const [showAddLoc, setShowAddLoc] = useState<string | null>(null);
    const [showBulkAdd, setShowBulkAdd] = useState<string | null>(null);

    // ── Derived ──
    const lagosZones = useMemo(() => zones.filter(z => z.zone_type === "lagos"), [zones]);
    const totalLocations = zones.reduce((s, z) => s + z.locations.length, 0);
    const activeDiscounts = zones.filter(z => z.discount_percent > 0);

    const currentZones = tab === "lagos" ? lagosZones : zones;
    const filteredZones = currentZones.filter(z => {
        if (!search) return true;
        const q = search.toLowerCase();
        return z.name.toLowerCase().includes(q) || z.locations.some(l => l.name.toLowerCase().includes(q));
    });

    const toggle = (id: string) => setExpandedZone(prev => prev === id ? null : id);

    // ── Zone Actions ──
    const handleToggleZone = async (zone: DeliveryZoneWithLocations) => {
        const tid = toast.loading("Updating...");
        try {
            await updateDeliveryZone(zone.id, { isActive: !zone.is_active });
            setZones(prev => prev.map(z => z.id === zone.id ? { ...z, is_active: !z.is_active } : z));
            toast.success(zone.is_active ? "Zone deactivated" : "Zone activated", { id: tid });
            router.refresh();
        } catch { toast.error("Failed to update", { id: tid }); }
    };

    const handleDeleteZone = async (id: string, name: string) => {
        if (!confirm(`Delete "${name}" and all its locations? This cannot be undone.`)) return;
        const tid = toast.loading("Deleting...");
        try {
            await deleteDeliveryZone(id);
            setZones(prev => prev.filter(z => z.id !== id));
            toast.success("Zone deleted", { id: tid });
            router.refresh();
        } catch { toast.error("Failed to delete", { id: tid }); }
    };

    // ── Location Actions ──
    const handleToggleLoc = async (loc: DeliveryZoneWithLocations["locations"][0]) => {
        const tid = toast.loading("Updating...");
        try {
            await updateDeliveryLocation(loc.id, { isActive: !loc.is_active });
            setZones(prev => prev.map(z => ({
                ...z,
                locations: z.locations.map(l => l.id === loc.id ? { ...l, is_active: !l.is_active } : l),
            })));
            toast.success("Updated", { id: tid });
            router.refresh();
        } catch { toast.error("Failed", { id: tid }); }
    };

    const handleDeleteLoc = async (locId: string, name: string) => {
        if (!confirm(`Remove "${name}"?`)) return;
        const tid = toast.loading("Deleting...");
        try {
            await deleteDeliveryLocation(locId);
            setZones(prev => prev.map(z => ({
                ...z,
                locations: z.locations.filter(l => l.id !== locId),
            })));
            toast.success("Removed", { id: tid });
            router.refresh();
        } catch { toast.error("Failed", { id: tid }); }
    };

    // ═══════════════════════════════════════════════════════════════
    //  RENDER
    // ═══════════════════════════════════════════════════════════════
    return (
        <div className="space-y-6">
            {/* ── Header ── */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-3xl font-serif text-brand-dark flex items-center gap-3">
                        <Truck size={28} className="text-brand-purple" />
                        Delivery Management
                    </h1>
                    <div className="flex flex-wrap gap-5 mt-3">
                        <MetricCard label="Lagos Zones" value={lagosZones.length} icon={<MapPin size={14} />} />
                        <MetricCard label="Total Locations" value={totalLocations} icon={<Building2 size={14} />} />
                        <MetricCard label="Active Discounts" value={activeDiscounts.length} icon={<Tag size={14} />} highlight={activeDiscounts.length > 0} />
                    </div>
                </div>
                <Button onClick={() => setShowCreateZone(true)}>
                    <span className="flex items-center gap-2"><Plus size={14} /> Add Zone</span>
                </Button>
            </div>

            {/* ── Tabs + Search ── */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex gap-1 bg-brand-lilac/10 p-1 rounded-lg">
                    {([
                        { key: "lagos" as Tab, label: "Lagos Zones", icon: <MapPin size={13} /> },
                        { key: "discounts" as Tab, label: "Discounts", icon: <Tag size={13} /> },
                    ]).map(t => (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all ${tab === t.key
                                ? "bg-white shadow-sm text-brand-purple"
                                : "text-brand-dark/50 hover:text-brand-purple"
                                }`}
                        >
                            {t.icon} <span className="hidden sm:inline">{t.label}</span>
                        </button>
                    ))}
                </div>
                <div className="relative w-full sm:w-64">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-dark/25" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search zones or locations..."
                        className="w-full pl-9 pr-4 py-2.5 border border-brand-lilac/20 rounded-lg text-sm focus:outline-none focus:border-brand-purple/40 bg-white"
                    />
                    {search && (
                        <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-dark/25 hover:text-brand-dark/50">
                            <X size={12} />
                        </button>
                    )}
                </div>
            </div>

            {/* ── Discounts Tab ── */}
            {tab === "discounts" && (
                <DiscountsPanel
                    zones={zones}
                    onUpdate={(id, updates) => {
                        setZones(prev => prev.map(z => z.id === id ? { ...z, ...updates } : z));
                    }}
                />
            )}

            {/* ── Zone Cards ── */}
            {tab !== "discounts" && (
                <div className="space-y-3">
                    {filteredZones.map(zone => {
                        const isExpanded = expandedZone === zone.id;
                        const activeLocs = zone.locations.filter(l => l.is_active).length;
                        const feeDisplay = zone.base_fee ? formatCurrency(zone.base_fee) : "—";

                        return (
                            <div key={zone.id} className={`bg-white rounded-xl border overflow-hidden transition-all shadow-sm ${zone.is_active ? "border-brand-lilac/15" : "border-red-200/50 opacity-60"}`}>
                                {/* Zone Header */}
                                <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-brand-lilac/[0.03] transition-colors" onClick={() => toggle(zone.id)}>
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-brand-purple/8 text-brand-purple">
                                        <MapPin size={18} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-semibold text-brand-dark">{zone.name}</span>
                                            {!zone.is_active && <Badge variant="danger">Inactive</Badge>}
                                            {zone.discount_percent > 0 && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full border border-emerald-100">
                                                    <Tag size={9} /> {zone.discount_percent}% off
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 mt-0.5 text-xs text-brand-dark/35">
                                            <span>{activeLocs}/{zone.locations.length} locations active</span>
                                            <span className="font-mono">{feeDisplay}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <button onClick={e => { e.stopPropagation(); handleToggleZone(zone); }} title={zone.is_active ? "Deactivate" : "Activate"} className="p-1.5 rounded-md hover:bg-brand-lilac/10 transition-colors">
                                            {zone.is_active ? <ToggleRight size={20} className="text-emerald-500" /> : <ToggleLeft size={20} className="text-brand-dark/20" />}
                                        </button>
                                        <button onClick={e => { e.stopPropagation(); setEditingZone(zone.id); setExpandedZone(zone.id); }} className="p-1.5 rounded-md hover:bg-brand-lilac/10 transition-colors text-brand-dark/30 hover:text-brand-purple">
                                            <Edit3 size={14} />
                                        </button>
                                        <button onClick={e => { e.stopPropagation(); handleDeleteZone(zone.id, zone.name); }} className="p-1.5 rounded-md hover:bg-red-50 transition-colors text-brand-dark/20 hover:text-red-500">
                                            <Trash2 size={14} />
                                        </button>
                                        {isExpanded ? <ChevronUp size={14} className="text-brand-dark/20 ml-1" /> : <ChevronDown size={14} className="text-brand-dark/20 ml-1" />}
                                    </div>
                                </div>

                                {/* Expanded Content */}
                                {isExpanded && (
                                    <div className="border-t border-brand-lilac/8">
                                        {/* Edit Zone Panel */}
                                        {editingZone === zone.id && (
                                            <EditZonePanel
                                                zone={zone}
                                                onSave={(updates) => {
                                                    setZones(prev => prev.map(z => z.id === zone.id ? { ...z, ...updates } : z));
                                                    setEditingZone(null);
                                                }}
                                                onClose={() => setEditingZone(null)}
                                            />
                                        )}

                                        {/* Locations */}
                                        <div className="p-4">
                                            <div className="flex items-center justify-between mb-3">
                                                <span className="text-xs font-semibold text-brand-dark/40 uppercase tracking-wider">
                                                    Locations ({zone.locations.length})
                                                </span>
                                                <div className="flex gap-2">
                                                    <button onClick={() => setShowBulkAdd(zone.id)} className="flex items-center gap-1 text-[11px] text-brand-dark/40 hover:text-brand-purple font-medium transition-colors">
                                                        <Copy size={11} /> Bulk Add
                                                    </button>
                                                    <button onClick={() => setShowAddLoc(zone.id)} className="flex items-center gap-1 text-[11px] text-brand-purple hover:text-brand-dark font-medium transition-colors">
                                                        <Plus size={11} /> Add Location
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Bulk Add */}
                                            {showBulkAdd === zone.id && (
                                                <BulkAddLocations
                                                    zoneId={zone.id}
                                                    onDone={(newLocs) => {
                                                        setZones(prev => prev.map(z => z.id === zone.id
                                                            ? { ...z, locations: [...z.locations, ...newLocs] }
                                                            : z
                                                        ));
                                                        setShowBulkAdd(null);
                                                    }}
                                                    onCancel={() => setShowBulkAdd(null)}
                                                />
                                            )}

                                            {/* Single Add */}
                                            {showAddLoc === zone.id && (
                                                <AddLocationForm
                                                    zoneId={zone.id}
                                                    isLagos={true}
                                                    allowsHub={false}
                                                    onCreated={(loc) => {
                                                        setZones(prev => prev.map(z => z.id === zone.id
                                                            ? { ...z, locations: [...z.locations, loc] }
                                                            : z
                                                        ));
                                                        setShowAddLoc(null);
                                                    }}
                                                    onCancel={() => setShowAddLoc(null)}
                                                />
                                            )}

                                            {zone.locations.length === 0 ? (
                                                <div className="text-center py-8 text-brand-dark/25 text-sm">
                                                    <MapPin size={24} className="mx-auto mb-2 opacity-30" />
                                                    No locations yet. Add one above.
                                                </div>
                                            ) : (
                                                <>
                                                    {/* Desktop Table */}
                                                    <div className="hidden md:block overflow-x-auto">
                                                        <table className="w-full text-sm">
                                                            <thead>
                                                                <tr className="border-b border-brand-lilac/10 bg-brand-lilac/[0.03]">
                                                                    <th className="text-left py-2.5 px-3 text-[10px] font-semibold text-brand-dark/40 uppercase tracking-wider">Location</th>
                                                                    <th className="text-right py-2.5 px-3 text-[10px] font-semibold text-brand-dark/40 uppercase tracking-wider">Fee</th>
                                                                    <th className="text-center py-2.5 px-3 text-[10px] font-semibold text-brand-dark/40 uppercase tracking-wider">Status</th>
                                                                    <th className="text-right py-2.5 px-3 text-[10px] font-semibold text-brand-dark/40 uppercase tracking-wider">Actions</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-brand-lilac/5">
                                                                {zone.locations.map(loc => (
                                                                    <tr key={loc.id} className={`hover:bg-brand-lilac/[0.03] transition-colors ${!loc.is_active ? "opacity-35" : ""}`}>
                                                                        {editingLoc === loc.id ? (
                                                                            <EditLocRow
                                                                                loc={loc}
                                                                                isLagos={true}
                                                                                allowsHub={false}
                                                                                zoneFee={zone.base_fee}
                                                                                onSave={(upd) => {
                                                                                    setZones(prev => prev.map(z => ({
                                                                                        ...z,
                                                                                        locations: z.locations.map(l => l.id === loc.id ? { ...l, ...upd } : l),
                                                                                    })));
                                                                                    setEditingLoc(null);
                                                                                }}
                                                                                onCancel={() => setEditingLoc(null)}
                                                                            />
                                                                        ) : (
                                                                            <>
                                                                                <td className="py-2.5 px-3 font-medium text-brand-dark">{loc.name}</td>
                                                                                <td className="py-2.5 px-3 text-right font-mono text-brand-dark/60">
                                                                                    {zone.base_fee ? formatCurrency(zone.base_fee) : "—"}
                                                                                </td>
                                                                                <td className="py-2.5 px-3 text-center">
                                                                                    <button onClick={() => handleToggleLoc(loc)} className="transition-colors">
                                                                                        {loc.is_active
                                                                                            ? <ToggleRight size={18} className="text-emerald-500" />
                                                                                            : <ToggleLeft size={18} className="text-brand-dark/15" />
                                                                                        }
                                                                                    </button>
                                                                                </td>
                                                                                <td className="py-2.5 px-3 text-right">
                                                                                    <div className="flex justify-end gap-1">
                                                                                        <button onClick={() => setEditingLoc(loc.id)} className="p-1 rounded hover:bg-brand-lilac/10 text-brand-dark/25 hover:text-brand-purple transition-colors" title="Edit">
                                                                                            <Edit3 size={12} />
                                                                                        </button>
                                                                                        <button onClick={() => handleDeleteLoc(loc.id, loc.name)} className="p-1 rounded hover:bg-red-50 text-brand-dark/15 hover:text-red-500 transition-colors" title="Delete">
                                                                                            <Trash2 size={12} />
                                                                                        </button>
                                                                                    </div>
                                                                                </td>
                                                                            </>
                                                                        )}
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>

                                                    {/* Mobile Cards */}
                                                    <div className="md:hidden space-y-2">
                                                        {zone.locations.map(loc => (
                                                            <div key={loc.id} className={`p-3 rounded-lg border border-brand-lilac/10 bg-white ${!loc.is_active ? "opacity-35" : ""}`}>
                                                                {editingLoc === loc.id ? (
                                                                    <EditLocMobile
                                                                        loc={loc}
                                                                        isLagos={true}
                                                                        allowsHub={false}
                                                                        zoneFee={zone.base_fee}
                                                                        onSave={(upd) => {
                                                                            setZones(prev => prev.map(z => ({
                                                                                ...z,
                                                                                locations: z.locations.map(l => l.id === loc.id ? { ...l, ...upd } : l),
                                                                            })));
                                                                            setEditingLoc(null);
                                                                        }}
                                                                        onCancel={() => setEditingLoc(null)}
                                                                    />
                                                                ) : (
                                                                    <>
                                                                        <div className="flex items-center justify-between mb-2">
                                                                            <span className="font-medium text-brand-dark text-sm">{loc.name}</span>
                                                                            <div className="flex items-center gap-0.5">
                                                                                <button onClick={() => handleToggleLoc(loc)} className="p-1">
                                                                                    {loc.is_active ? <ToggleRight size={16} className="text-emerald-500" /> : <ToggleLeft size={16} className="text-brand-dark/15" />}
                                                                                </button>
                                                                                <button onClick={() => setEditingLoc(loc.id)} className="p-1 text-brand-dark/25 hover:text-brand-purple"><Edit3 size={12} /></button>
                                                                                <button onClick={() => handleDeleteLoc(loc.id, loc.name)} className="p-1 text-brand-dark/15 hover:text-red-500"><Trash2 size={12} /></button>
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex gap-2 text-xs">
                                                                            <PriceChip label="Fee" value={zone.base_fee} />
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {filteredZones.length === 0 && (
                        <div className="text-center py-16 text-brand-dark/25">
                            <Truck size={40} className="mx-auto mb-3 opacity-20" />
                            <p className="text-sm">{search ? "No zones match your search." : "No zones configured yet."}</p>
                            {!search && (
                                <Button onClick={() => setShowCreateZone(true)} variant="outline" size="sm" className="mt-4">
                                    <span className="flex items-center gap-2"><Plus size={12} /> Create First Zone</span>
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* ── Create Zone Modal ── */}
            {showCreateZone && (
                <CreateZoneModal
                    defaultType="lagos"
                    onCreated={(zone) => {
                        setZones(prev => [...prev, zone]);
                        setShowCreateZone(false);
                    }}
                    onClose={() => setShowCreateZone(false)}
                />
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════
//  METRIC CARD
// ═══════════════════════════════════════════════════════════════════
function MetricCard({ label, value, icon, highlight }: { label: string; value: number; icon: React.ReactNode; highlight?: boolean }) {
    return (
        <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${highlight ? "bg-emerald-50 text-emerald-600" : "bg-brand-lilac/10 text-brand-dark/30"}`}>{icon}</div>
            <div>
                <span className="block text-[10px] uppercase tracking-wider text-brand-dark/30">{label}</span>
                <span className={`font-mono font-bold text-lg leading-none ${highlight ? "text-emerald-600" : "text-brand-dark"}`}>{value}</span>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════
//  PRICE CHIP
// ═══════════════════════════════════════════════════════════════════
function PriceChip({ label, value }: { label: string; value: number | null | undefined }) {
    return (
        <div className="bg-gray-50 px-2.5 py-1.5 rounded-md border border-gray-100/50">
            <span className="text-[9px] text-brand-dark/30 uppercase tracking-wider block">{label}</span>
            <span className="font-mono font-medium text-brand-dark/60">{value != null ? formatCurrency(value) : "—"}</span>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════
//  DISCOUNTS PANEL (Dedicated Tab)
// ═══════════════════════════════════════════════════════════════════
function DiscountsPanel({ zones, onUpdate }: {
    zones: DeliveryZoneWithLocations[];
    onUpdate: (id: string, updates: Partial<DeliveryZoneWithLocations>) => void;
}) {
    const router = useRouter();
    const zonesWithDiscounts = zones.filter(z => z.discount_percent > 0);
    const zonesWithout = zones.filter(z => z.discount_percent === 0);

    const applyDiscount = async (zoneId: string, percent: number, label: string) => {
        const tid = toast.loading("Applying discount...");
        try {
            await updateDeliveryZone(zoneId, { discountPercent: percent, discountLabel: label || null });
            onUpdate(zoneId, { discount_percent: percent, discount_label: label || null });
            toast.success("Discount applied!", { id: tid });
            router.refresh();
        } catch { toast.error("Failed to apply", { id: tid }); }
    };

    const removeDiscount = async (zoneId: string) => {
        const tid = toast.loading("Removing...");
        try {
            await updateDeliveryZone(zoneId, { discountPercent: 0, discountLabel: null });
            onUpdate(zoneId, { discount_percent: 0, discount_label: null });
            toast.success("Discount removed", { id: tid });
            router.refresh();
        } catch { toast.error("Failed", { id: tid }); }
    };

    return (
        <div className="space-y-6">
            {/* Active Discounts */}
            {zonesWithDiscounts.length > 0 && (
                <div className="bg-white rounded-xl border border-brand-lilac/15 overflow-hidden shadow-sm">
                    <div className="px-4 py-3 bg-emerald-50/50 border-b border-emerald-100/50">
                        <h3 className="text-sm font-semibold text-emerald-800 flex items-center gap-2"><Tag size={14} /> Active Delivery Discounts</h3>
                    </div>
                    <div className="divide-y divide-brand-lilac/5">
                        {zonesWithDiscounts.map(zone => (
                            <div key={zone.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-brand-dark">{zone.name}</span>
                                        <Badge variant="info">Lagos</Badge>
                                    </div>
                                    <div className="text-xs text-brand-dark/40 mt-0.5">
                                        <span className="font-mono font-bold text-emerald-600">{zone.discount_percent}% off</span>
                                        {zone.discount_label && <span> — {zone.discount_label}</span>}
                                    </div>
                                </div>
                                <button
                                    onClick={() => removeDiscount(zone.id)}
                                    className="text-xs text-red-500 hover:text-red-700 font-medium px-3 py-1.5 bg-red-50 rounded-lg border border-red-100 hover:bg-red-100 transition-colors self-start"
                                >
                                    Remove Discount
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Apply New Discount */}
            <div className="bg-white rounded-xl border border-brand-lilac/15 overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-brand-lilac/10">
                    <h3 className="text-sm font-semibold text-brand-dark flex items-center gap-2"><Percent size={14} className="text-brand-purple" /> Apply Discount to Zone</h3>
                    <p className="text-[11px] text-brand-dark/35 mt-0.5">Customers will see the discount at checkout with the original price crossed out.</p>
                </div>
                <div className="divide-y divide-brand-lilac/5">
                    {zonesWithout.map(zone => (
                        <DiscountRow key={zone.id} zone={zone} onApply={applyDiscount} />
                    ))}
                </div>
                {zonesWithout.length === 0 && (
                    <div className="p-8 text-center text-brand-dark/25 text-sm">All zones already have discounts applied.</div>
                )}
            </div>
        </div>
    );
}

function DiscountRow({ zone, onApply }: { zone: DeliveryZoneWithLocations; onApply: (id: string, p: number, l: string) => void }) {
    const [percent, setPercent] = useState("");
    const [label, setLabel] = useState("");
    const [open, setOpen] = useState(false);

    return (
        <div className="p-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="font-medium text-brand-dark text-sm">{zone.name}</span>
                    <Badge variant="info">Lagos</Badge>
                </div>
                <button onClick={() => setOpen(!open)} className="text-[11px] text-brand-purple hover:text-brand-dark font-medium transition-colors">
                    {open ? "Cancel" : "+ Add Discount"}
                </button>
            </div>
            {open && (
                <div className="mt-3 flex flex-col sm:flex-row gap-2 items-end">
                    <div className="flex-1">
                        <label className="block text-[10px] text-brand-dark/35 mb-1">Discount %</label>
                        <input type="number" min="1" max="100" value={percent} onChange={e => setPercent(e.target.value)} placeholder="e.g. 20" className="w-full px-3 py-2 border border-brand-lilac/20 rounded-lg text-sm focus:outline-none focus:border-brand-purple" />
                    </div>
                    <div className="flex-1">
                        <label className="block text-[10px] text-brand-dark/35 mb-1">Label (Optional)</label>
                        <input type="text" value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Holiday Promo" className="w-full px-3 py-2 border border-brand-lilac/20 rounded-lg text-sm focus:outline-none focus:border-brand-purple" />
                    </div>
                    <Button size="sm" onClick={() => {
                        if (!percent || Number(percent) <= 0) return;
                        onApply(zone.id, Number(percent), label);
                        setOpen(false); setPercent(""); setLabel("");
                    }}>Apply</Button>
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════
//  EDIT ZONE PANEL
// ═══════════════════════════════════════════════════════════════════
function EditZonePanel({ zone, onSave, onClose }: {
    zone: DeliveryZoneWithLocations;
    onSave: (u: Partial<DeliveryZoneWithLocations>) => void;
    onClose: () => void;
}) {
    const router = useRouter();
    const [name, setName] = useState(zone.name);
    const [baseFee, setBaseFee] = useState(zone.base_fee?.toString() ?? "");
    const [hubEst, setHubEst] = useState(zone.hub_estimate ?? "");
    const [doorEst, setDoorEst] = useState(zone.doorstep_estimate ?? "");
    const [allowsHub, setAllowsHub] = useState(zone.allows_hub_pickup);
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            await updateDeliveryZone(zone.id, {
                name: name.trim(),
                baseFee: baseFee ? Number(baseFee) : null,
                hubEstimate: hubEst.trim() || null,
                doorstepEstimate: doorEst.trim() || null,
                allowsHubPickup: allowsHub,
            });
            onSave({
                name: name.trim(),
                base_fee: baseFee ? Number(baseFee) : null,
                hub_estimate: hubEst.trim() || null,
                doorstep_estimate: doorEst.trim() || null,
                allows_hub_pickup: allowsHub,
            });
            toast.success("Zone updated");
            router.refresh();
        } catch { toast.error("Failed to update"); }
        finally { setSaving(false); }
    };

    return (
        <div className="p-4 bg-brand-creme/30 border-b border-brand-lilac/10">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-brand-dark flex items-center gap-2"><Edit3 size={13} className="text-brand-purple" /> Edit Zone</h3>
                <button onClick={onClose} className="text-brand-dark/25 hover:text-brand-dark/50"><X size={14} /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <InputField label="Zone Name" value={name} onChange={setName} />
                <InputField label="Base Fee (₦)" type="number" value={baseFee} onChange={setBaseFee} />
            </div>
            <div className="flex justify-end gap-2 mt-4">
                <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
                <Button size="sm" onClick={handleSave} loading={saving}>
                    <span className="flex items-center gap-1.5"><Save size={12} /> Save Changes</span>
                </Button>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════
//  EDIT LOCATION ROW (Desktop inline)
// ═══════════════════════════════════════════════════════════════════
function EditLocRow({ loc, isLagos, allowsHub, zoneFee, onSave, onCancel }: {
    loc: DeliveryZoneWithLocations["locations"][0];
    isLagos: boolean;
    allowsHub: boolean;
    zoneFee: number | null;
    onSave: (u: Partial<DeliveryZoneWithLocations["locations"][0]>) => void;
    onCancel: () => void;
}) {
    const router = useRouter();
    const [name, setName] = useState(loc.name);
    const [hubFee, setHubFee] = useState(loc.hub_pickup_fee?.toString() ?? "");
    const [doorFee, setDoorFee] = useState(loc.doorstep_fee?.toString() ?? "");
    const [saving, setSaving] = useState(false);

    const save = async () => {
        setSaving(true);
        try {
            await updateDeliveryLocation(loc.id, {
                name: name.trim(),
                hubPickupFee: hubFee ? Number(hubFee) : null,
                doorstepFee: doorFee ? Number(doorFee) : null,
            });
            onSave({ name: name.trim(), hub_pickup_fee: hubFee ? Number(hubFee) : null, doorstep_fee: doorFee ? Number(doorFee) : null });
            toast.success("Saved");
            router.refresh();
        } catch { toast.error("Failed"); }
        finally { setSaving(false); }
    };

    const cols = 2 + (allowsHub ? 1 : 0) + 1 + 1; // name + fees + status + actions

    return (
        <td colSpan={cols} className="p-3 bg-brand-creme/20">
            <div className="flex items-end gap-2 flex-wrap">
                <div className="flex-1 min-w-[140px]">
                    <label className="block text-[9px] text-brand-dark/30 mb-0.5 uppercase tracking-wider">Name</label>
                    <input value={name} onChange={e => setName(e.target.value)} className="w-full px-2.5 py-1.5 border border-brand-lilac/25 rounded-lg text-sm focus:outline-none focus:border-brand-purple bg-white" />
                </div>
                {allowsHub && !isLagos && (
                    <div className="w-28">
                        <label className="block text-[9px] text-brand-dark/30 mb-0.5 uppercase tracking-wider">Hub (₦)</label>
                        <input type="number" value={hubFee} onChange={e => setHubFee(e.target.value)} className="w-full px-2.5 py-1.5 border border-brand-lilac/25 rounded-lg text-sm focus:outline-none focus:border-brand-purple bg-white" />
                    </div>
                )}
                {!isLagos && (
                    <div className="w-28">
                        <label className="block text-[9px] text-brand-dark/30 mb-0.5 uppercase tracking-wider">Door (₦)</label>
                        <input type="number" value={doorFee} onChange={e => setDoorFee(e.target.value)} className="w-full px-2.5 py-1.5 border border-brand-lilac/25 rounded-lg text-sm focus:outline-none focus:border-brand-purple bg-white" />
                    </div>
                )}
                <Button size="sm" onClick={save} loading={saving}><Save size={12} /></Button>
                <Button size="sm" variant="ghost" onClick={onCancel}><X size={12} /></Button>
            </div>
        </td>
    );
}

// ═══════════════════════════════════════════════════════════════════
//  EDIT LOCATION (Mobile)
// ═══════════════════════════════════════════════════════════════════
function EditLocMobile({ loc, isLagos, allowsHub, zoneFee, onSave, onCancel }: {
    loc: DeliveryZoneWithLocations["locations"][0];
    isLagos: boolean;
    allowsHub: boolean;
    zoneFee: number | null;
    onSave: (u: Partial<DeliveryZoneWithLocations["locations"][0]>) => void;
    onCancel: () => void;
}) {
    const router = useRouter();
    const [name, setName] = useState(loc.name);
    const [hubFee, setHubFee] = useState(loc.hub_pickup_fee?.toString() ?? "");
    const [doorFee, setDoorFee] = useState(loc.doorstep_fee?.toString() ?? "");
    const [saving, setSaving] = useState(false);

    const save = async () => {
        setSaving(true);
        try {
            await updateDeliveryLocation(loc.id, {
                name: name.trim(),
                hubPickupFee: hubFee ? Number(hubFee) : null,
                doorstepFee: doorFee ? Number(doorFee) : null,
            });
            onSave({ name: name.trim(), hub_pickup_fee: hubFee ? Number(hubFee) : null, doorstep_fee: doorFee ? Number(doorFee) : null });
            toast.success("Saved");
            router.refresh();
        } catch { toast.error("Failed"); }
        finally { setSaving(false); }
    };

    return (
        <div className="space-y-3">
            <InputField label="Name" value={name} onChange={setName} />
            <div className="grid grid-cols-2 gap-2">
                {allowsHub && !isLagos && <InputField label="Hub Pickup (₦)" type="number" value={hubFee} onChange={setHubFee} />}
                {!isLagos && <InputField label="Doorstep (₦)" type="number" value={doorFee} onChange={setDoorFee} />}
            </div>
            <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
                <Button size="sm" onClick={save} loading={saving}><span className="flex items-center gap-1"><Save size={11} /> Save</span></Button>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════
//  ADD LOCATION FORM
// ═══════════════════════════════════════════════════════════════════
function AddLocationForm({ zoneId, isLagos, allowsHub, onCreated, onCancel }: {
    zoneId: string;
    isLagos: boolean;
    allowsHub: boolean;
    onCreated: (l: DeliveryZoneWithLocations["locations"][0]) => void;
    onCancel: () => void;
}) {
    const router = useRouter();
    const [name, setName] = useState("");
    const [hubFee, setHubFee] = useState("");
    const [doorFee, setDoorFee] = useState("");
    const [loading, setLoading] = useState(false);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        setLoading(true);
        try {
            const id = await createDeliveryLocation({
                zoneId, name: name.trim(),
                hubPickupFee: hubFee ? Number(hubFee) : null,
                doorstepFee: doorFee ? Number(doorFee) : null,
            });
            onCreated({
                id, zone_id: zoneId, name: name.trim(),
                hub_pickup_fee: hubFee ? Number(hubFee) : null,
                doorstep_fee: doorFee ? Number(doorFee) : null,
                is_active: true, created_at: new Date().toISOString(),
            });
            toast.success("Location added");
            router.refresh();
        } catch { toast.error("Failed"); }
        finally { setLoading(false); }
    };

    return (
        <form onSubmit={submit} className="mb-4 p-3 bg-brand-purple/[0.02] rounded-lg border border-brand-purple/10 border-dashed">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <InputField label="Location Name" required value={name} onChange={setName} placeholder="e.g. Lekki Phase 1" />
                {allowsHub && !isLagos && <InputField label="Hub Fee (₦)" type="number" value={hubFee} onChange={setHubFee} placeholder="4000" />}
                {!isLagos && <InputField label="Doorstep Fee (₦)" type="number" value={doorFee} onChange={setDoorFee} placeholder="8000" />}
            </div>
            <div className="flex justify-end gap-2 mt-3">
                <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
                <Button type="submit" size="sm" loading={loading}><span className="flex items-center gap-1.5"><Plus size={11} /> Add</span></Button>
            </div>
        </form>
    );
}

// ═══════════════════════════════════════════════════════════════════
//  BULK ADD LOCATIONS
// ═══════════════════════════════════════════════════════════════════
function BulkAddLocations({ zoneId, onDone, onCancel }: {
    zoneId: string;
    onDone: (locs: DeliveryZoneWithLocations["locations"]) => void;
    onCancel: () => void;
}) {
    const router = useRouter();
    const [text, setText] = useState("");
    const [loading, setLoading] = useState(false);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        const names = text.split("\n").map(n => n.trim()).filter(Boolean);
        if (names.length === 0) return;
        setLoading(true);
        const created: DeliveryZoneWithLocations["locations"] = [];
        let failed = 0;
        for (const name of names) {
            try {
                const id = await createDeliveryLocation({ zoneId, name });
                created.push({ id, zone_id: zoneId, name, hub_pickup_fee: null, doorstep_fee: null, is_active: true, created_at: new Date().toISOString() });
            } catch { failed++; }
        }
        if (failed > 0) toast.error(`${failed} location(s) failed to add`);
        toast.success(`${created.length} location(s) added`);
        onDone(created);
        router.refresh();
        setLoading(false);
    };

    return (
        <form onSubmit={submit} className="mb-4 p-3 bg-amber-50/30 rounded-lg border border-amber-200/30 border-dashed space-y-3">
            <div>
                <label className="block text-[10px] text-brand-dark/40 mb-1 uppercase tracking-wider">
                    Paste location names (one per line)
                </label>
                <textarea
                    value={text}
                    onChange={e => setText(e.target.value)}
                    rows={5}
                    placeholder={"Lekki Phase 1\nIkoyi\nVictoria Island"}
                    className="w-full px-3 py-2 border border-brand-lilac/20 rounded-lg text-sm focus:outline-none focus:border-brand-purple resize-y font-mono"
                />
                <p className="text-[10px] text-brand-dark/30 mt-1">{text.split("\n").filter(l => l.trim()).length} location(s) will be added</p>
            </div>
            <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
                <Button type="submit" size="sm" loading={loading}><span className="flex items-center gap-1.5"><Copy size={11} /> Add All</span></Button>
            </div>
        </form>
    );
}

// ═══════════════════════════════════════════════════════════════════
//  CREATE ZONE MODAL
// ═══════════════════════════════════════════════════════════════════
function CreateZoneModal({ defaultType, onCreated, onClose }: {
    defaultType: "lagos";
    onCreated: (z: DeliveryZoneWithLocations) => void;
    onClose: () => void;
}) {
    const router = useRouter();
    const [name, setName] = useState("");
    const [baseFee, setBaseFee] = useState("");
    const [loading, setLoading] = useState(false);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        setLoading(true);
        try {
            const id = await createDeliveryZone({
                name: name.trim(), zoneType: "lagos",
                baseFee: baseFee ? Number(baseFee) : undefined,
                allowsHubPickup: false,
            });
            onCreated({
                id, name: name.trim(), zone_type: "lagos",
                base_fee: baseFee ? Number(baseFee) : null,
                allows_hub_pickup: false,
                hub_estimate: null, doorstep_estimate: null,
                discount_percent: 0, discount_label: null,
                is_active: true, sort_order: 0, created_at: new Date().toISOString(),
                locations: [],
            });
            toast.success("Zone created");
            router.refresh();
        } catch { toast.error("Failed"); }
        finally { setLoading(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 overflow-y-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-xl font-serif text-brand-dark">Create Delivery Zone</h2>
                    <button onClick={onClose} className="text-brand-dark/25 hover:text-brand-dark/50 p-1"><X size={18} /></button>
                </div>
                <form onSubmit={submit} className="space-y-4">
                    <InputField label="Zone Name" required value={name} onChange={setName} placeholder="e.g. Mainland Core" />
                    <InputField label="Flat Delivery Fee (₦)" type="number" value={baseFee} onChange={setBaseFee} placeholder="e.g. 3500" />

                    <div className="flex justify-end gap-3 pt-4 border-t border-brand-lilac/10">
                        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
                        <Button type="submit" loading={loading}>
                            <span className="flex items-center gap-1.5"><Plus size={13} /> Create Zone</span>
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════
//  INPUT FIELD
// ═══════════════════════════════════════════════════════════════════
function InputField({ label, required, type = "text", value, onChange, placeholder }: {
    label: string; required?: boolean; type?: string; value: string;
    onChange: (v: string) => void; placeholder?: string;
}) {
    return (
        <div>
            <label className="block text-[10px] font-medium text-brand-dark/40 mb-1 uppercase tracking-wider">{label}</label>
            <input
                required={required}
                type={type}
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full px-3 py-2 border border-brand-lilac/20 rounded-lg text-sm focus:outline-none focus:border-brand-purple transition-colors bg-white"
            />
        </div>
    );
}
