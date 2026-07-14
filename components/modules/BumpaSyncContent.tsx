"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { BumpaConfigStatus } from "@/lib/bumpa";
import type { BumpaOrderRow } from "@/lib/bumpaSync";
import { formatCurrency } from "@/lib/formatCurrency";

interface ProductOption {
    id: string;
    name: string;
    variants: string[];
}

interface Props {
    config: BumpaConfigStatus;
    orders: BumpaOrderRow[];
    products: ProductOption[];
}

const STATUS_STYLE: Record<string, string> = {
    imported: "bg-forest-green/20 text-forest-green",
    pending_mapping: "bg-gold-accent/20 text-gold-accent",
    skipped: "bg-warm-cream/10 text-warm-cream/50",
    error: "bg-brand-red/20 text-brand-red",
};

export default function BumpaSyncContent({ config, orders, products }: Props) {
    const router = useRouter();
    const [syncing, setSyncing] = useState(false);

    // Aggregate unmatched lines across all pending orders, deduped by Bumpa product id.
    const unmatched = useMemo(() => {
        const seen = new Map<string, { bumpaProductId: string; name: string | null; sku: string | null }>();
        for (const o of orders) {
            if (o.syncStatus !== "pending_mapping") continue;
            for (const u of o.unmatched) {
                if (!seen.has(u.bumpaProductId)) {
                    seen.set(u.bumpaProductId, { bumpaProductId: u.bumpaProductId, name: u.name, sku: u.sku });
                }
            }
        }
        return Array.from(seen.values());
    }, [orders]);

    async function runSync() {
        setSyncing(true);
        try {
            const res = await fetch("/api/bumpa/sync", { method: "POST" });
            const data = await res.json();
            if (!data.success) {
                toast.error(data.summary?.error || data.error || "Sync failed");
            } else {
                const s = data.summary;
                toast.success(
                    `Synced ${s.fetched} orders — ${s.imported} imported, ${s.pendingMapping} need mapping, ${s.skipped} skipped, ${s.errors} errors`,
                );
                router.refresh();
            }
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Sync failed");
        } finally {
            setSyncing(false);
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-warm-cream">Bumpa Orders</h1>
                    <p className="text-sm text-warm-cream/50">
                        Pull orders from your Bumpa store and deduct their items from zutaya stock.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={runSync}
                    disabled={syncing || !config.configured}
                    className="rounded-lg bg-brand-red px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                    {syncing ? "Syncing…" : "Sync now"}
                </button>
            </div>

            {/* Config status */}
            {config.configured ? (
                <div className="rounded-lg border border-forest-green/30 bg-forest-green/10 px-4 py-3 text-sm text-warm-cream/80">
                    Connected to <span className="font-mono">{config.base}</span> ({config.authMode} auth).
                </div>
            ) : (
                <div className="rounded-lg border border-gold-accent/30 bg-gold-accent/10 px-4 py-3 text-sm text-warm-cream/80">
                    <p className="font-semibold text-gold-accent">Not connected yet</p>
                    <p className="mt-1">{config.blocker}</p>
                </div>
            )}

            {/* Unmatched product mapping */}
            {unmatched.length > 0 && (
                <div className="rounded-xl border border-white/10 bg-surface p-4">
                    <h2 className="mb-1 text-lg font-semibold text-warm-cream">Unmapped products</h2>
                    <p className="mb-4 text-xs text-warm-cream/50">
                        These Bumpa products didn't auto-match a zutaya product (by SKU or name). Map each
                        one, then Sync again — those orders will import and deduct stock.
                    </p>
                    <div className="space-y-3">
                        {unmatched.map((u) => (
                            <MapRow key={u.bumpaProductId} unmatched={u} products={products} onSaved={() => router.refresh()} />
                        ))}
                    </div>
                </div>
            )}

            {/* Orders table */}
            <div className="rounded-xl border border-white/10 bg-surface">
                <div className="border-b border-white/10 px-4 py-3">
                    <h2 className="text-lg font-semibold text-warm-cream">Synced orders</h2>
                </div>
                {orders.length === 0 ? (
                    <p className="px-4 py-8 text-center text-sm text-warm-cream/40">
                        No Bumpa orders synced yet. Click “Sync now” once connected.
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="text-xs uppercase text-warm-cream/40">
                                <tr>
                                    <th className="px-4 py-2">Bumpa #</th>
                                    <th className="px-4 py-2">Date</th>
                                    <th className="px-4 py-2">Customer</th>
                                    <th className="px-4 py-2">Payment</th>
                                    <th className="px-4 py-2">Total</th>
                                    <th className="px-4 py-2">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {orders.map((o) => (
                                    <tr key={o.bumpaOrderId} className="text-warm-cream/80">
                                        <td className="px-4 py-2 font-mono text-xs">{o.bumpaOrderId}</td>
                                        <td className="px-4 py-2">{o.orderDate ?? "—"}</td>
                                        <td className="px-4 py-2">{o.customerName ?? "—"}</td>
                                        <td className="px-4 py-2">{o.paymentStatus ?? "—"}</td>
                                        <td className="px-4 py-2">{o.grandTotal != null ? formatCurrency(o.grandTotal) : "—"}</td>
                                        <td className="px-4 py-2">
                                            <span
                                                className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[o.syncStatus] ?? "bg-warm-cream/10 text-warm-cream/60"}`}
                                            >
                                                {o.syncStatus.replace("_", " ")}
                                            </span>
                                            {o.error && <p className="mt-1 text-xs text-brand-red">{o.error}</p>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

function MapRow({
    unmatched,
    products,
    onSaved,
}: {
    unmatched: { bumpaProductId: string; name: string | null; sku: string | null };
    products: ProductOption[];
    onSaved: () => void;
}) {
    const [productId, setProductId] = useState("");
    const [variantName, setVariantName] = useState("");
    const [saving, setSaving] = useState(false);
    const selected = products.find((p) => p.id === productId);

    async function save() {
        if (!productId) {
            toast.error("Pick a zutaya product");
            return;
        }
        setSaving(true);
        try {
            const res = await fetch("/api/bumpa/map", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    bumpaProductId: unmatched.bumpaProductId,
                    productId,
                    variantName: variantName || null,
                    label: unmatched.name,
                }),
            });
            const data = await res.json();
            if (!data.success) {
                toast.error(data.error || "Failed to save mapping");
            } else {
                toast.success("Mapped — Sync again to import");
                onSaved();
            }
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to save mapping");
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-base p-3">
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-warm-cream">
                    {unmatched.name || `Bumpa product #${unmatched.bumpaProductId}`}
                </p>
                <p className="text-xs text-warm-cream/40">
                    id {unmatched.bumpaProductId}
                    {unmatched.sku ? ` · SKU ${unmatched.sku}` : ""}
                </p>
            </div>
            <select
                value={productId}
                onChange={(e) => {
                    setProductId(e.target.value);
                    setVariantName("");
                }}
                className="rounded-lg border border-white/10 bg-surface px-2 py-1.5 text-sm text-warm-cream"
            >
                <option value="">Map to product…</option>
                {products.map((p) => (
                    <option key={p.id} value={p.id}>
                        {p.name}
                    </option>
                ))}
            </select>
            {selected && selected.variants.length > 0 && (
                <select
                    value={variantName}
                    onChange={(e) => setVariantName(e.target.value)}
                    className="rounded-lg border border-white/10 bg-surface px-2 py-1.5 text-sm text-warm-cream"
                >
                    <option value="">Whole product</option>
                    {selected.variants.map((v) => (
                        <option key={v} value={v}>
                            {v}
                        </option>
                    ))}
                </select>
            )}
            <button
                type="button"
                onClick={save}
                disabled={saving}
                className="rounded-lg bg-forest-green px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
            >
                {saving ? "Saving…" : "Save"}
            </button>
        </div>
    );
}
