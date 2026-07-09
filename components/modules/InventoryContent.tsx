"use client";

import { useState, useRef, useEffect } from "react";
import type { InventoryLog, InventoryItem, Product, Order } from "@/types";
import { formatCurrency } from "@/lib/formatCurrency";
import Button from "@/components/ui/Button";
import { toast } from "sonner";
import { updateInventoryItem, logInventoryChange, createInventoryItem } from "@/lib/queries";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { downloadCsv, dateStamp } from "@/lib/csv";
import {
    buildSnapshot,
    buildSalesMovement,
    buildBumpaUpload,
    buildFullReport,
    sectionToCsv,
    type ExportFormat,
} from "@/lib/inventoryExport";

interface InventoryContentProps {
    logs: InventoryLog[];
    inventory: InventoryItem[];
    products?: Product[];
    orders?: Order[];
}

export default function InventoryContent({
    logs: initialLogs,
    inventory: initialInventory,
    products = [],
    orders = [],
}: InventoryContentProps) {
    const router = useRouter();
    const [inventoryItems, setInventoryItems] = useState(initialInventory);
    const [search, setSearch] = useState("");
    const [tab, setTab] = useState<"stock" | "history">("stock");
    const [exportOpen, setExportOpen] = useState(false);
    const exportRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!exportOpen) return;
        const onClick = (e: MouseEvent) => {
            if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false);
        };
        document.addEventListener("mousedown", onClick);
        return () => document.removeEventListener("mousedown", onClick);
    }, [exportOpen]);

    const handleExport = (format: ExportFormat) => {
        try {
            let csv: string;
            if (format === "snapshot") {
                csv = sectionToCsv(buildSnapshot(inventoryItems, products));
            } else if (format === "sales") {
                csv = sectionToCsv(buildSalesMovement(products, orders, initialLogs, inventoryItems));
            } else if (format === "bumpa") {
                csv = sectionToCsv(buildBumpaUpload(products, inventoryItems));
            } else {
                csv = buildFullReport(inventoryItems, products, orders, initialLogs);
            }
            downloadCsv(`zutaya-inventory-${format}-${dateStamp()}.csv`, csv);
            toast.success("Export ready — check your downloads");
        } catch (err) {
            console.error(err);
            toast.error("Failed to build export");
        }
        setExportOpen(false);
    };

    const [catalogueBusy, setCatalogueBusy] = useState(false);
    const handleCatalogue = async (variant: "list" | "photos", format: "pdf" | "png") => {
        setExportOpen(false);
        if (catalogueBusy) return;
        setCatalogueBusy(true);
        const note =
            variant === "photos"
                ? toast.loading("Building photo catalogue — loading product images…")
                : null;
        try {
            const { buildCatalogue, catalogueItemCount } = await import("@/lib/catalogue");
            const sections = buildCatalogue(products);
            if (catalogueItemCount(sections) === 0) {
                toast.error("No in-stock products to put in the catalogue", { id: note ?? undefined });
                return;
            }
            const { generateCataloguePdf, generateCataloguePngs } = await import(
                "@/lib/catalogueExport"
            );
            if (format === "pdf") {
                await generateCataloguePdf(sections, variant);
                toast.success("Catalogue PDF ready — check your downloads", { id: note ?? undefined });
            } else {
                const n = await generateCataloguePngs(sections, variant);
                toast.success(`${n} catalogue image${n === 1 ? "" : "s"} downloaded`, {
                    id: note ?? undefined,
                });
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to generate catalogue", { id: note ?? undefined });
        } finally {
            setCatalogueBusy(false);
        }
    };

    const handleGoogleFeed = async () => {
        setExportOpen(false);
        try {
            const { buildGoogleFeedItems, feedToXml } = await import("@/lib/googleFeed");
            const { downloadText, dateStamp: stamp } = await import("@/lib/csv");
            const items = buildGoogleFeedItems(products);
            if (items.length === 0) {
                toast.error("No products to include in the feed");
                return;
            }
            const xml = feedToXml(items, {
                title: "Zúta Ya",
                link: typeof window !== "undefined" ? window.location.origin : "",
                description: "Zúta Ya product feed",
            });
            downloadText(`zutaya-google-merchant-${stamp()}.xml`, xml, "application/xml;charset=utf-8");
            toast.success("Google Merchant feed downloaded");
        } catch (err) {
            console.error(err);
            toast.error("Failed to build Google feed");
        }
    };

    const copyFeedUrl = async () => {
        setExportOpen(false);
        const url = `${window.location.origin}/feed/google-merchant.xml`;
        try {
            await navigator.clipboard.writeText(url);
            toast.success("Live feed URL copied — paste into Merchant Center");
        } catch {
            toast.message(url);
        }
    };

    // Adjustment State
    const [isAdjusting, setIsAdjusting] = useState(false);
    const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
    const [adjustmentAmount, setAdjustmentAmount] = useState<number | "">("");
    const [costPrice, setCostPrice] = useState<number | "">("");
    const [sellingPrice, setSellingPrice] = useState<number | "">("");
    const [reason, setReason] = useState("");

    const filteredItems = inventoryItems.filter(i =>
        i.name.toLowerCase().includes(search.toLowerCase()) ||
        i.sku.toLowerCase().includes(search.toLowerCase())
    );

    const filteredLogs = initialLogs.filter(l =>
        l.productName?.toLowerCase().includes(search.toLowerCase()) ||
        l.reason.toLowerCase().includes(search.toLowerCase())
    );

    const openAdjustment = (item: InventoryItem) => {
        setSelectedItem(item);
        setAdjustmentAmount(""); // Optional: keep empty if just editing price
        setCostPrice(item.costPrice);
        setSellingPrice(item.sellingPrice);
        setReason("");
        setIsAdjusting(true);
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedItem) return;

        const toastId = toast.loading("Updating inventory...");
        try {
            // 1. Update Stock if amount provided
            let newStock = selectedItem.stock;
            if (adjustmentAmount !== "" && adjustmentAmount !== 0) {
                const amount = Number(adjustmentAmount);
                newStock += amount;
                await logInventoryChange(selectedItem.id, amount, reason || "Manual Adjustment");
                // We should strictly update inventory_items stock here, 
                // but for now relying on the same flow or ensuring `updateInventoryItem` covers it.
                // Actually `updateInventoryItem` is better than `updateProductStock` now.
            }

            // 2. Update Prices
            await updateInventoryItem(selectedItem.id, {
                stock: newStock,
                costPrice: Number(costPrice),
                sellingPrice: Number(sellingPrice)
            });

            toast.success("Inventory updated", { id: toastId });
            setIsAdjusting(false);
            router.refresh();

            // Optimistic Update
            setInventoryItems(prev => prev.map(p => p.id === selectedItem.id ? {
                ...p,
                stock: newStock,
                costPrice: Number(costPrice),
                sellingPrice: Number(sellingPrice)
            } : p));

        } catch (error) {
            console.error(error);
            toast.error("Failed to update", { id: toastId });
        }
    };

    // Derived Metrics
    const totalInventoryValue = inventoryItems.reduce((sum, item) => sum + (item.costPrice * item.stock), 0);
    const potentialRevenue = inventoryItems.reduce((sum, item) => sum + (item.sellingPrice * item.stock), 0);
    const potentialProfit = potentialRevenue - totalInventoryValue;

    const [isCreating, setIsCreating] = useState(false);
    const [newItem, setNewItem] = useState({
        sku: "",
        name: "",
        costPrice: "",
        sellingPrice: "",
        stock: "",
        reorderLevel: "5",
        supplier: ""
    });

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        const toastId = toast.loading("Creating item...");
        try {
            await createInventoryItem({
                sku: newItem.sku || newItem.name.toUpperCase().slice(0, 3) + "-" + Date.now().toString().slice(-4),
                name: newItem.name,
                costPrice: Number(newItem.costPrice),
                sellingPrice: Number(newItem.sellingPrice),
                stock: Number(newItem.stock),
                reorderLevel: Number(newItem.reorderLevel),
                supplier: newItem.supplier
            });
            toast.success("Item created", { id: toastId });
            setIsCreating(false);
            setNewItem({ sku: "", name: "", costPrice: "", sellingPrice: "", stock: "", reorderLevel: "5", supplier: "" });
            router.refresh();
            // Optimistic update would require fetching the new ID, so skipping for now relying on refresh
            // But we can trigger a reload
            window.location.reload();
        } catch (error) {
            console.error(error);
            toast.error("Failed to create", { id: toastId });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-3xl font-serif text-warm-cream">Inventory Management</h1>
                    <div className="flex gap-4 mt-2 text-sm text-warm-cream/50">
                        <div>
                            <span className="block text-xs uppercase tracking-wider text-warm-cream/30">Total Value (Cost)</span>
                            <span className="font-mono font-bold text-warm-cream">{formatCurrency(totalInventoryValue)}</span>
                        </div>
                        <div>
                            <span className="block text-xs uppercase tracking-wider text-warm-cream/30">Potential Profit</span>
                            <span className="font-mono font-bold text-green-600">{formatCurrency(potentialProfit)}</span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-2 items-center">
                    <div className="relative" ref={exportRef}>
                        <Button onClick={() => setExportOpen(o => !o)} variant="ghost" className="mr-2">
                            Export ▾
                        </Button>
                        {exportOpen && (
                            <div className="absolute right-2 top-full mt-1 z-50 w-72 max-h-[75vh] overflow-y-auto bg-surface border border-warm-cream/20 rounded-lg shadow-2xl ring-1 ring-black/40">
                                <button
                                    type="button"
                                    onClick={() => handleExport("snapshot")}
                                    className="w-full text-left px-4 py-3 hover:bg-warm-cream/10 transition-colors border-b border-warm-cream/10"
                                >
                                    <div className="text-sm font-medium text-warm-cream">Inventory Snapshot</div>
                                    <div className="text-xs text-warm-cream/50">Current holdings, all fields, by category</div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleExport("sales")}
                                    className="w-full text-left px-4 py-3 hover:bg-warm-cream/10 transition-colors border-b border-warm-cream/10"
                                >
                                    <div className="text-sm font-medium text-warm-cream">Sales &amp; Movement</div>
                                    <div className="text-xs text-warm-cream/50">Stock history + revenue/profit per product</div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleExport("bumpa")}
                                    className="w-full text-left px-4 py-3 hover:bg-warm-cream/10 transition-colors border-b border-warm-cream/10"
                                >
                                    <div className="text-sm font-medium text-warm-cream">Bumpa Product Upload</div>
                                    <div className="text-xs text-warm-cream/50">Product Title, price, stock — ready to import</div>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleExport("full")}
                                    className="w-full text-left px-4 py-3 hover:bg-warm-cream/10 transition-colors border-b border-warm-cream/10"
                                >
                                    <div className="text-sm font-medium text-warm-cream">Full Detailed Report</div>
                                    <div className="text-xs text-warm-cream/50">Summary + snapshot + sales + raw log</div>
                                </button>
                                <div className="px-4 py-2 bg-warm-cream/[0.03] text-[10px] font-semibold uppercase tracking-[0.2em] text-warm-cream/40">
                                    Price List — text only
                                </div>
                                <button
                                    type="button"
                                    disabled={catalogueBusy}
                                    onClick={() => handleCatalogue("list", "pdf")}
                                    className="w-full text-left px-4 py-3 hover:bg-warm-cream/10 transition-colors border-b border-warm-cream/10 disabled:opacity-50"
                                >
                                    <div className="text-sm font-medium text-warm-cream">Price List — PDF</div>
                                    <div className="text-xs text-warm-cream/50">Printable, brand-styled, by category</div>
                                </button>
                                <button
                                    type="button"
                                    disabled={catalogueBusy}
                                    onClick={() => handleCatalogue("list", "png")}
                                    className="w-full text-left px-4 py-3 hover:bg-warm-cream/10 transition-colors border-b border-warm-cream/10 disabled:opacity-50"
                                >
                                    <div className="text-sm font-medium text-warm-cream">Price List — Images</div>
                                    <div className="text-xs text-warm-cream/50">One shareable image per category (≤10 items)</div>
                                </button>
                                <div className="px-4 py-2 bg-warm-cream/[0.03] text-[10px] font-semibold uppercase tracking-[0.2em] text-warm-cream/40">
                                    Photo Catalogue — with product images
                                </div>
                                <button
                                    type="button"
                                    disabled={catalogueBusy}
                                    onClick={() => handleCatalogue("photos", "png")}
                                    className="w-full text-left px-4 py-3 hover:bg-warm-cream/10 transition-colors border-b border-warm-cream/10 disabled:opacity-50"
                                >
                                    <div className="text-sm font-medium text-warm-cream">Photo Catalogue — Images</div>
                                    <div className="text-xs text-warm-cream/50">Product-photo cards for IG posts / carousels</div>
                                </button>
                                <button
                                    type="button"
                                    disabled={catalogueBusy}
                                    onClick={() => handleCatalogue("photos", "pdf")}
                                    className="w-full text-left px-4 py-3 hover:bg-warm-cream/10 transition-colors border-b border-warm-cream/10 disabled:opacity-50"
                                >
                                    <div className="text-sm font-medium text-warm-cream">Photo Catalogue — PDF</div>
                                    <div className="text-xs text-warm-cream/50">Photo grid flyer, printable</div>
                                </button>
                                <div className="px-4 py-2 bg-warm-cream/[0.03] text-[10px] font-semibold uppercase tracking-[0.2em] text-warm-cream/40">
                                    Google Shopping
                                </div>
                                <button
                                    type="button"
                                    onClick={copyFeedUrl}
                                    className="w-full text-left px-4 py-3 hover:bg-warm-cream/10 transition-colors border-b border-warm-cream/10"
                                >
                                    <div className="text-sm font-medium text-warm-cream">Copy live feed URL</div>
                                    <div className="text-xs text-warm-cream/50">Auto-updates · paste into Merchant Center fetch</div>
                                </button>
                                <button
                                    type="button"
                                    onClick={handleGoogleFeed}
                                    className="w-full text-left px-4 py-3 hover:bg-warm-cream/10 transition-colors"
                                >
                                    <div className="text-sm font-medium text-warm-cream">Google Merchant Feed (XML)</div>
                                    <div className="text-xs text-warm-cream/50">One-off download of the current feed</div>
                                </button>
                            </div>
                        )}
                    </div>
                    <Button onClick={() => setIsCreating(true)} variant="primary" className="mr-2">
                        + Add Item
                    </Button>
                    <div className="flex gap-2 bg-warm-cream/10 p-1 rounded-md">
                        <button
                            onClick={() => setTab("stock")}
                            className={`px-4 py-1.5 rounded-sm text-sm font-medium transition-colors ${tab === "stock" ? "bg-raised shadow-sm text-brand-green" : "text-warm-cream/60 hover:text-brand-green"}`}
                        >
                            Stock & Pricing
                        </button>
                        <button
                            onClick={() => setTab("history")}
                            className={`px-4 py-1.5 rounded-sm text-sm font-medium transition-colors ${tab === "history" ? "bg-raised shadow-sm text-brand-green" : "text-warm-cream/60 hover:text-brand-green"}`}
                        >
                            History Log
                        </button>
                    </div>
                </div>
            </div>

            {/* Create Modal */}
            {isCreating && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-raised rounded-lg shadow-xl w-full max-w-2xl p-6 overflow-y-auto max-h-[90vh]">
                        <h2 className="text-xl font-serif text-warm-cream mb-4">Add New Inventory Item</h2>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-warm-cream/40 mb-1">Name</label>
                                    <input required type="text" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} className="w-full px-3 py-2 border border-warm-cream/30 rounded focus:border-brand-green" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-warm-cream/40 mb-1">SKU (Optional)</label>
                                    <input type="text" value={newItem.sku} onChange={e => setNewItem({ ...newItem, sku: e.target.value })} placeholder="Auto-generated if empty" className="w-full px-3 py-2 border border-warm-cream/30 rounded focus:border-brand-green" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-warm-cream/40 mb-1">Cost Price ($)</label>
                                    <input required type="number" value={newItem.costPrice} onChange={e => setNewItem({ ...newItem, costPrice: e.target.value })} className="w-full px-3 py-2 border border-warm-cream/30 rounded focus:border-brand-green" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-warm-cream/40 mb-1">Selling Price ($)</label>
                                    <input required type="number" value={newItem.sellingPrice} onChange={e => setNewItem({ ...newItem, sellingPrice: e.target.value })} className="w-full px-3 py-2 border border-warm-cream/30 rounded focus:border-brand-green" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-warm-cream/40 mb-1">Initial Stock</label>
                                    <input required type="number" step="any" value={newItem.stock} onChange={e => setNewItem({ ...newItem, stock: e.target.value })} className="w-full px-3 py-2 border border-warm-cream/30 rounded focus:border-brand-green" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-warm-cream/40 mb-1">Reorder Level</label>
                                    <input required type="number" value={newItem.reorderLevel} onChange={e => setNewItem({ ...newItem, reorderLevel: e.target.value })} className="w-full px-3 py-2 border border-warm-cream/30 rounded focus:border-brand-green" />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-medium text-warm-cream/40 mb-1">Supplier (Optional)</label>
                                    <input type="text" value={newItem.supplier} onChange={e => setNewItem({ ...newItem, supplier: e.target.value })} className="w-full px-3 py-2 border border-warm-cream/30 rounded focus:border-brand-green" />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-warm-cream/10">
                                <Button type="button" variant="ghost" onClick={() => setIsCreating(false)}>Cancel</Button>
                                <Button type="submit">Create Item</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <input
                type="text"
                placeholder="Search SKU or Name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full sm:w-80 px-4 py-2 border border-warm-cream/30 rounded-sm focus:outline-none focus:border-brand-green"
            />

            {tab === "stock" && (
                <div className="bg-raised rounded-lg shadow overflow-hidden border border-warm-cream/20">
                    <div className="hidden md:block overflow-x-auto whitespace-nowrap">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-brand-creme text-warm-cream">
                                <tr>
                                    <th className="p-4 font-medium">SKU / Name</th>
                                    <th className="p-4 font-medium text-right">Cost</th>
                                    <th className="p-4 font-medium text-right">Price</th>
                                    <th className="p-4 font-medium text-right">Margin</th>
                                    <th className="p-4 font-medium text-center">Stock</th>
                                    <th className="p-4 font-medium text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-warm-cream/10">
                                {filteredItems.map(item => {
                                    const margin = item.sellingPrice > 0
                                        ? ((item.sellingPrice - item.costPrice) / item.sellingPrice) * 100
                                        : 0;

                                    return (
                                        <tr key={item.id} className="hover:bg-brand-creme/20">
                                            <td className="p-4">
                                                <div className="font-medium text-warm-cream">{item.name}</div>
                                                <div className="text-xs text-warm-cream/30 font-mono">{item.sku}</div>
                                            </td>
                                            <td className="p-4 text-right font-mono text-warm-cream/50">
                                                {formatCurrency(item.costPrice)}
                                            </td>
                                            <td className="p-4 text-right font-mono text-warm-cream">
                                                {formatCurrency(item.sellingPrice)}
                                            </td>
                                            <td className="p-4 text-right">
                                                <span className={`px-2 py-0.5 rounded text-xs font-bold ${margin >= 30 ? "bg-green-100 text-green-400" :
                                                    margin >= 15 ? "bg-yellow-100 text-yellow-400" :
                                                        "bg-red-100 text-red-400"
                                                    }`}>
                                                    {margin.toFixed(0)}%
                                                </span>
                                            </td>
                                            <td className="p-4 text-center">
                                                <span className={`font-mono font-medium ${item.stock <= item.reorderLevel ? "text-red-400" : "text-warm-cream"}`}>
                                                    {item.stock}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right">
                                                <button
                                                    onClick={() => openAdjustment(item)}
                                                    className="text-brand-green hover:text-warm-cream font-medium"
                                                >
                                                    Manage
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Stock View */}
                    <div className="md:hidden divide-y divide-warm-cream/10">
                        {filteredItems.map(item => {
                            const margin = item.sellingPrice > 0
                                ? ((item.sellingPrice - item.costPrice) / item.sellingPrice) * 100
                                : 0;
                            return (
                                <div key={item.id} className="p-4 hover:bg-brand-creme/20 space-y-3">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="font-medium text-warm-cream text-base">{item.name}</div>
                                            <div className="text-xs text-warm-cream/30 font-mono mt-0.5">{item.sku}</div>
                                        </div>
                                        <button
                                            onClick={() => openAdjustment(item)}
                                            className="text-brand-green hover:text-warm-cream font-medium text-xs bg-warm-cream/10 px-3 py-1.5 rounded-md border border-brand-green/20 shadow-sm"
                                        >
                                            Manage
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-sm mt-3">
                                        <div className="bg-warm-cream/[0.03] p-2.5 rounded-md border border-warm-cream/[0.06]/50">
                                            <span className="block text-[10px] text-warm-cream/30 uppercase tracking-wider mb-1">Cost</span>
                                            <span className="font-mono text-warm-cream/50">{formatCurrency(item.costPrice)}</span>
                                        </div>
                                        <div className="bg-warm-cream/[0.03] p-2.5 rounded-md border border-warm-cream/[0.06]/50">
                                            <span className="block text-[10px] text-warm-cream/30 uppercase tracking-wider mb-1">Price</span>
                                            <span className="font-mono text-warm-cream font-medium">{formatCurrency(item.sellingPrice)}</span>
                                        </div>
                                        <div className="bg-warm-cream/[0.03] p-2.5 rounded-md border border-warm-cream/[0.06]/50">
                                            <span className="block text-[10px] text-warm-cream/30 uppercase tracking-wider mb-1">Margin</span>
                                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${margin >= 30 ? "bg-green-100 text-green-400" :
                                                margin >= 15 ? "bg-yellow-100 text-yellow-400" :
                                                    "bg-red-100 text-red-400"
                                                }`}>
                                                {margin.toFixed(0)}%
                                            </span>
                                        </div>
                                        <div className="bg-warm-cream/[0.03] p-2.5 rounded-md border border-warm-cream/[0.06]/50 flex flex-col justify-between">
                                            <span className="block text-[10px] text-warm-cream/30 uppercase tracking-wider mb-1">Stock</span>
                                            <span className={`font-mono font-medium text-lg leading-none ${item.stock <= item.reorderLevel ? "text-red-400" : "text-warm-cream"}`}>
                                                {item.stock}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {filteredItems.length === 0 && (
                            <div className="p-8 text-center text-warm-cream/40 text-sm">No items found.</div>
                        )}
                    </div>
                </div>
            )}

            {/* Reuse History Log Table from before (omitted for brevity, assume strictly kept or copied) */}
            {tab === "history" && (
                <div className="bg-raised rounded-lg shadow overflow-hidden border border-warm-cream/20">
                    <div className="hidden md:block overflow-x-auto whitespace-nowrap">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-brand-creme text-warm-cream">
                                <tr>
                                    <th className="p-4 font-medium">Product</th>
                                    <th className="p-4 font-medium">Change</th>
                                    <th className="p-4 font-medium">Reason</th>
                                    <th className="p-4 font-medium">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-warm-cream/10">
                                {filteredLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-brand-creme/20">
                                        <td className="p-4 font-medium text-warm-cream">{log.productName}</td>
                                        <td className={`p-4 font-medium ${log.changeAmount > 0 ? "text-green-600" : "text-red-400"}`}>
                                            {log.changeAmount > 0 ? "+" : ""}
                                            {log.changeAmount}
                                        </td>
                                        <td className="p-4 text-warm-cream/50 capitalize">{log.reason}</td>
                                        <td className="p-4 text-warm-cream/40">
                                            {new Date(log.createdAt).toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                                {filteredLogs.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="p-8 text-center text-warm-cream/40">No logs found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile History View */}
                    <div className="md:hidden divide-y divide-warm-cream/10">
                        {filteredLogs.map((log) => (
                            <div key={log.id} className="p-4 hover:bg-brand-creme/20 space-y-2">
                                <div className="flex justify-between items-start">
                                    <div className="font-medium text-warm-cream">{log.productName}</div>
                                    <div className={`font-medium py-0.5 px-2 rounded-md text-sm ${log.changeAmount > 0 ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                                        {log.changeAmount > 0 ? "+" : ""}
                                        {log.changeAmount}
                                    </div>
                                </div>
                                <div className="flex justify-between items-center text-sm text-warm-cream/40">
                                    <span className="capitalize bg-warm-cream/[0.03] px-2.5 py-1 rounded text-xs border border-warm-cream/[0.06]">{log.reason}</span>
                                    <span className="text-xs">{new Date(log.createdAt).toLocaleDateString()} {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                            </div>
                        ))}
                        {filteredLogs.length === 0 && (
                            <div className="p-8 text-center text-warm-cream/40 text-sm">No logs found.</div>
                        )}
                    </div>
                </div>
            )}

            {/* Enhanced Adjustment Modal */}
            {isAdjusting && selectedItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-raised rounded-lg shadow-xl w-full max-w-md p-6">
                        <h2 className="text-xl font-serif text-warm-cream mb-4">Manage: {selectedItem.name}</h2>
                        <form onSubmit={handleUpdate} className="space-y-4">

                            {/* Pricing Section */}
                            <div className="grid grid-cols-2 gap-4 bg-warm-cream/[0.03] p-4 rounded border border-warm-cream/[0.06]">
                                <div>
                                    <label className="block text-xs font-medium text-warm-cream/40 mb-1">Cost Price (₦)</label>
                                    <input
                                        type="number"
                                        value={costPrice}
                                        onChange={(e) => setCostPrice(e.target.value === "" ? "" : Number(e.target.value))}
                                        className="w-full border rounded px-2 py-1"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-warm-cream/40 mb-1">Selling Price (₦)</label>
                                    <input
                                        type="number"
                                        value={sellingPrice}
                                        onChange={(e) => setSellingPrice(e.target.value === "" ? "" : Number(e.target.value))}
                                        className="w-full border rounded px-2 py-1"
                                    />
                                </div>
                                <div className="col-span-2 text-xs text-center text-warm-cream/30">
                                    {costPrice && sellingPrice ? (
                                        <span>
                                            Margin: <strong className={((Number(sellingPrice) - Number(costPrice)) / Number(sellingPrice)) < 0.15 ? "text-red-500" : "text-green-600"}>
                                                {(((Number(sellingPrice) - Number(costPrice)) / Number(sellingPrice)) * 100).toFixed(1)}%
                                            </strong>
                                            &nbsp; | Profit: {formatCurrency(Number(sellingPrice) - Number(costPrice))}
                                        </span>
                                    ) : (
                                        "Enter prices to see margin"
                                    )}
                                </div>
                            </div>

                            <hr className="border-warm-cream/[0.06]" />

                            {/* Stock Section */}
                            <div>
                                <label className="block text-sm font-medium text-warm-cream/60 mb-1">Stock Adjustment</label>
                                <div className="flex gap-2">
                                    <div className="w-20 px-3 py-2 bg-warm-cream/5 rounded text-center font-mono text-warm-cream/50" title="Current Stock">
                                        {selectedItem.stock}
                                    </div>
                                    <input
                                        type="number"
                                        step="any"
                                        value={adjustmentAmount}
                                        onChange={(e) => setAdjustmentAmount(Number(e.target.value))}
                                        placeholder="+ / -"
                                        className="flex-1 px-4 py-2 border border-warm-cream/30 rounded-sm focus:outline-none focus:border-brand-green"
                                    />
                                </div>
                                <p className="text-xs text-warm-cream/40 mt-1">Leave empty if only updating price.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-warm-cream/60 mb-1">Reason</label>
                                <input
                                    type="text"
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    placeholder="Required for stock changes..."
                                    className="w-full px-4 py-2 border border-warm-cream/30 rounded-sm focus:outline-none focus:border-brand-green"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-warm-cream/10 mt-6">
                                <Button type="button" variant="ghost" onClick={() => setIsAdjusting(false)}>Cancel</Button>
                                <Button type="submit">Save Changes</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
