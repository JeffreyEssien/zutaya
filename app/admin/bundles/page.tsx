"use client";

import { useState, useEffect } from "react";
import type { BundleRule, Category } from "@/types";

export default function AdminBundlesPage() {
    const [bundles, setBundles] = useState<BundleRule[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState<BundleRule | null>(null);

    const [form, setForm] = useState({
        name: "",
        description: "",
        minItems: 3,
        maxItems: 10,
        discountPercent: 10,
        allowedCategoryIds: [] as string[],
        isActive: true,
    });

    const fetchData = async () => {
        const [bundleRes, catRes] = await Promise.all([
            fetch("/api/bundles").then((r) => r.json()),
            fetch("/api/categories").then((r) => r.json()).catch(() => []),
        ]);
        setBundles(bundleRes);
        setCategories(catRes);
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const resetForm = () => {
        setForm({ name: "", description: "", minItems: 3, maxItems: 10, discountPercent: 10, allowedCategoryIds: [], isActive: true });
        setEditing(null);
        setShowForm(false);
    };

    const handleEdit = (bundle: BundleRule) => {
        setEditing(bundle);
        setForm({
            name: bundle.name,
            description: bundle.description || "",
            minItems: bundle.minItems,
            maxItems: bundle.maxItems,
            discountPercent: bundle.discountPercent,
            allowedCategoryIds: bundle.allowedCategoryIds || [],
            isActive: bundle.isActive,
        });
        setShowForm(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (editing) {
            await fetch("/api/bundles", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: editing.id, ...form }),
            });
        } else {
            await fetch("/api/bundles", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
        }

        resetForm();
        fetchData();
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this bundle rule?")) return;
        await fetch(`/api/bundles?id=${id}`, { method: "DELETE" });
        fetchData();
    };

    const toggleCategory = (catId: string) => {
        setForm((prev) => ({
            ...prev,
            allowedCategoryIds: prev.allowedCategoryIds.includes(catId)
                ? prev.allowedCategoryIds.filter((c) => c !== catId)
                : [...prev.allowedCategoryIds, catId],
        }));
    };

    if (loading) {
        return <div className="p-8 text-center text-warm-cream/40">Loading bundles...</div>;
    }

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-brand-black">Bundle Rules</h1>
                <button
                    onClick={() => {
                        resetForm();
                        setShowForm(true);
                    }}
                    className="bg-brand-red text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-brand-red/90"
                >
                    + New Bundle
                </button>
            </div>

            {showForm && (
                <form onSubmit={handleSubmit} className="bg-white/[0.04] rounded-xl p-6 shadow-sm border border-warm-tan/20 mb-6 space-y-4">
                    <h2 className="font-semibold text-brand-black">{editing ? "Edit Bundle" : "New Bundle"}</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-warm-cream/40 mb-1">Name</label>
                            <input
                                type="text"
                                value={form.name}
                                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                                required
                                className="w-full border border-warm-tan/30 rounded-lg px-3 py-2 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-warm-cream/40 mb-1">Discount %</label>
                            <input
                                type="number"
                                value={form.discountPercent}
                                onChange={(e) => setForm((p) => ({ ...p, discountPercent: Number(e.target.value) }))}
                                min={0}
                                max={100}
                                required
                                className="w-full border border-warm-tan/30 rounded-lg px-3 py-2 text-sm"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-warm-cream/40 mb-1">Description</label>
                        <textarea
                            value={form.description}
                            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                            rows={2}
                            className="w-full border border-warm-tan/30 rounded-lg px-3 py-2 text-sm"
                        />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-warm-cream/40 mb-1">Min Items</label>
                            <input
                                type="number"
                                value={form.minItems}
                                onChange={(e) => setForm((p) => ({ ...p, minItems: Number(e.target.value) }))}
                                min={1}
                                required
                                className="w-full border border-warm-tan/30 rounded-lg px-3 py-2 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-warm-cream/40 mb-1">Max Items</label>
                            <input
                                type="number"
                                value={form.maxItems}
                                onChange={(e) => setForm((p) => ({ ...p, maxItems: Number(e.target.value) }))}
                                min={1}
                                required
                                className="w-full border border-warm-tan/30 rounded-lg px-3 py-2 text-sm"
                            />
                        </div>
                        <div className="flex items-end">
                            <label className="flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={form.isActive}
                                    onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
                                />
                                Active
                            </label>
                        </div>
                    </div>

                    {categories.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium text-warm-cream/40 mb-2">
                                Allowed Categories (leave empty for all)
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {categories.map((cat) => (
                                    <button
                                        key={cat.id}
                                        type="button"
                                        onClick={() => toggleCategory(cat.id)}
                                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                                            form.allowedCategoryIds.includes(cat.id)
                                                ? "bg-brand-red text-white border-brand-red"
                                                : "bg-white/[0.04] text-warm-cream/40 border-warm-tan/30 hover:border-brand-red"
                                        }`}
                                    >
                                        {cat.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button type="submit" className="bg-brand-red text-white px-6 py-2 rounded-lg text-sm font-semibold hover:bg-brand-red/90">
                            {editing ? "Update" : "Create"}
                        </button>
                        <button type="button" onClick={resetForm} className="px-6 py-2 rounded-lg text-sm text-warm-cream/40 border border-warm-tan/30 hover:bg-warm-cream">
                            Cancel
                        </button>
                    </div>
                </form>
            )}

            <div className="bg-white/[0.04] rounded-xl shadow-sm border border-warm-tan/20 overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-warm-cream text-warm-cream/40">
                        <tr>
                            <th className="text-left px-4 py-3 font-medium">Name</th>
                            <th className="text-left px-4 py-3 font-medium">Items Range</th>
                            <th className="text-left px-4 py-3 font-medium">Discount</th>
                            <th className="text-left px-4 py-3 font-medium">Status</th>
                            <th className="text-right px-4 py-3 font-medium">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {bundles.map((bundle) => (
                            <tr key={bundle.id} className="border-t border-warm-tan/10">
                                <td className="px-4 py-3 font-medium text-brand-black">{bundle.name}</td>
                                <td className="px-4 py-3 text-warm-cream/40">
                                    {bundle.minItems}–{bundle.maxItems}
                                </td>
                                <td className="px-4 py-3">
                                    <span className="bg-brand-red/10 text-brand-red px-2 py-0.5 rounded text-xs font-semibold">
                                        {bundle.discountPercent}%
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                        bundle.isActive ? "bg-brand-green/10 text-brand-green" : "bg-warm-cream/5 text-warm-cream/40"
                                    }`}>
                                        {bundle.isActive ? "Active" : "Inactive"}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <button onClick={() => handleEdit(bundle)} className="text-brand-red text-xs hover:underline mr-3">
                                        Edit
                                    </button>
                                    <button onClick={() => handleDelete(bundle.id)} className="text-red-500 text-xs hover:underline">
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {bundles.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-4 py-8 text-center text-warm-cream/40">
                                    No bundle rules yet.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
