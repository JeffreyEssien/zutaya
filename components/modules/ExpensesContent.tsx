"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { Expense } from "@/types";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import { formatCurrency } from "@/lib/formatCurrency";
import { Plus, Pencil, Trash2, X } from "lucide-react";

interface Props {
    initialExpenses: Expense[];
    revenuePoints: { total: number; date: string }[];
}

type Period = "month" | "30d" | "year" | "all";
const PERIOD_LABEL: Record<Period, string> = { month: "This month", "30d": "Last 30 days", year: "This year", all: "All time" };

function periodStart(period: Period): Date | null {
    const now = new Date();
    if (period === "month") return new Date(now.getFullYear(), now.getMonth(), 1);
    if (period === "30d") { const d = new Date(now); d.setDate(d.getDate() - 30); return d; }
    if (period === "year") return new Date(now.getFullYear(), 0, 1);
    return null;
}

const today = () => new Date().toISOString().slice(0, 10);

interface FormState { id?: string; category: string; amount: string; incurredOn: string; description: string; note: string; }
const emptyForm: FormState = { category: EXPENSE_CATEGORIES[0], amount: "", incurredOn: today(), description: "", note: "" };

export default function ExpensesContent({ initialExpenses, revenuePoints }: Props) {
    const [expenses, setExpenses] = useState(initialExpenses);
    const [period, setPeriod] = useState<Period>("month");
    const [form, setForm] = useState<FormState | null>(null);
    const [saving, setSaving] = useState(false);

    const start = periodStart(period);
    const inRange = (iso: string) => !start || new Date(iso) >= start;

    const scopedExpenses = useMemo(() => expenses.filter((e) => inRange(e.incurredOn)), [expenses, period]);
    const totalExpenses = scopedExpenses.reduce((s, e) => s + e.amount, 0);
    const revenue = useMemo(() => revenuePoints.filter((r) => inRange(r.date)).reduce((s, r) => s + r.total, 0), [revenuePoints, period]);
    const netProfit = revenue - totalExpenses;
    const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

    const byCategory = useMemo(() => {
        const map = new Map<string, number>();
        for (const e of scopedExpenses) map.set(e.category, (map.get(e.category) || 0) + e.amount);
        return [...map.entries()].sort((a, b) => b[1] - a[1]);
    }, [scopedExpenses]);

    const save = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form || saving) return;
        const amount = Number(form.amount);
        if (!(amount >= 0) || Number.isNaN(amount) || form.amount === "") { toast.error("Enter a valid amount"); return; }
        setSaving(true);
        try {
            const editing = !!form.id;
            const res = await fetch("/api/admin/expenses", {
                method: editing ? "PATCH" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: form.id,
                    category: form.category,
                    amount,
                    incurredOn: form.incurredOn,
                    description: form.description,
                    note: form.note,
                }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || "Failed");
            if (editing) {
                setExpenses((prev) => prev.map((x) => x.id === form.id ? { ...x, category: form.category, amount, incurredOn: form.incurredOn, description: form.description || undefined, note: form.note || undefined } : x)
                    .sort((a, b) => b.incurredOn.localeCompare(a.incurredOn)));
                toast.success("Expense updated");
            } else {
                setExpenses((prev) => [data.expense, ...prev].sort((a, b) => b.incurredOn.localeCompare(a.incurredOn)));
                toast.success("Expense added");
            }
            setForm(null);
        } catch (err: any) {
            toast.error(err?.message || "Could not save");
        } finally {
            setSaving(false);
        }
    };

    const remove = async (id: string) => {
        if (!confirm("Delete this expense?")) return;
        try {
            const res = await fetch("/api/admin/expenses", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id }),
            });
            if (!res.ok) throw new Error();
            setExpenses((prev) => prev.filter((x) => x.id !== id));
            toast.success("Expense deleted");
        } catch {
            toast.error("Delete failed");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-serif text-warm-cream">Expenses &amp; Profit</h1>
                    <p className="text-sm text-warm-cream/50 mt-1">Log business costs to see your real net profit.</p>
                </div>
                <button onClick={() => setForm({ ...emptyForm, incurredOn: today() })}
                    className="inline-flex items-center gap-2 rounded-full bg-brand-red px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-red/90 transition-colors">
                    <Plus size={16} /> Add Expense
                </button>
            </div>

            {/* Period selector */}
            <div className="flex flex-wrap gap-2">
                {(Object.keys(PERIOD_LABEL) as Period[]).map((p) => (
                    <button key={p} onClick={() => setPeriod(p)}
                        className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${period === p ? "bg-warm-cream text-charcoal" : "bg-warm-cream/5 text-warm-cream/60 hover:bg-warm-cream/10"}`}>
                        {PERIOD_LABEL[p]}
                    </button>
                ))}
            </div>

            {/* P&L cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="rounded-xl border border-warm-cream/10 bg-surface p-5">
                    <p className="text-xs uppercase tracking-wider text-warm-cream/40 mb-1">Revenue (paid orders)</p>
                    <p className="text-2xl font-bold text-warm-cream font-mono">{formatCurrency(revenue)}</p>
                </div>
                <div className="rounded-xl border border-warm-cream/10 bg-surface p-5">
                    <p className="text-xs uppercase tracking-wider text-warm-cream/40 mb-1">Total Expenses</p>
                    <p className="text-2xl font-bold text-red-400 font-mono">{formatCurrency(totalExpenses)}</p>
                </div>
                <div className={`rounded-xl border p-5 ${netProfit >= 0 ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5"}`}>
                    <p className="text-xs uppercase tracking-wider text-warm-cream/40 mb-1">Net Profit</p>
                    <p className={`text-2xl font-bold font-mono ${netProfit >= 0 ? "text-green-400" : "text-red-400"}`}>{formatCurrency(netProfit)}</p>
                    {revenue > 0 && <p className="text-xs text-warm-cream/40 mt-1">{margin.toFixed(1)}% margin</p>}
                </div>
            </div>

            {/* Category breakdown */}
            {byCategory.length > 0 && (
                <div className="rounded-xl border border-warm-cream/10 bg-surface p-5">
                    <p className="text-xs uppercase tracking-wider text-warm-cream/40 mb-3">Expenses by category · {PERIOD_LABEL[period]}</p>
                    <div className="space-y-2">
                        {byCategory.map(([cat, amt]) => (
                            <div key={cat} className="flex items-center gap-3 text-sm">
                                <span className="w-44 shrink-0 text-warm-cream/70 truncate">{cat}</span>
                                <div className="flex-1 h-2 rounded-full bg-warm-cream/10 overflow-hidden">
                                    <div className="h-full bg-brand-red rounded-full" style={{ width: `${totalExpenses > 0 ? (amt / totalExpenses) * 100 : 0}%` }} />
                                </div>
                                <span className="w-28 text-right shrink-0 font-mono text-warm-cream">{formatCurrency(amt)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Expense list */}
            <div className="rounded-xl border border-warm-cream/10 bg-surface overflow-hidden">
                {scopedExpenses.length === 0 ? (
                    <p className="text-sm text-warm-cream/40 py-12 text-center">No expenses in this period. Add your first one.</p>
                ) : (
                    <div className="divide-y divide-warm-cream/10">
                        {scopedExpenses.map((e) => (
                            <div key={e.id} className="flex items-center gap-3 px-4 py-3 hover:bg-warm-cream/[0.03]">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-sm font-medium text-warm-cream">{e.category}</span>
                                        {e.description && <span className="text-xs text-warm-cream/50 truncate">— {e.description}</span>}
                                    </div>
                                    <p className="text-xs text-warm-cream/40 mt-0.5">{new Date(e.incurredOn).toLocaleDateString()}{e.note ? ` · ${e.note}` : ""}</p>
                                </div>
                                <span className="font-mono font-semibold text-warm-cream shrink-0">{formatCurrency(e.amount)}</span>
                                <button onClick={() => setForm({ id: e.id, category: e.category, amount: String(e.amount), incurredOn: e.incurredOn, description: e.description || "", note: e.note || "" })}
                                    className="p-1.5 text-warm-cream/50 hover:text-warm-cream"><Pencil size={15} /></button>
                                <button onClick={() => remove(e.id)} className="p-1.5 text-red-400/70 hover:text-red-400"><Trash2 size={15} /></button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add/Edit modal */}
            {form && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => !saving && setForm(null)}>
                    <div className="w-full max-w-md rounded-2xl bg-base border border-warm-cream/15 p-6" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-serif text-warm-cream">{form.id ? "Edit expense" : "Add expense"}</h2>
                            <button onClick={() => setForm(null)} className="text-warm-cream/50 hover:text-warm-cream"><X size={18} /></button>
                        </div>
                        <form onSubmit={save} className="space-y-3">
                            <div>
                                <label className="block text-xs font-semibold text-warm-cream/70 mb-1">Category</label>
                                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                                    className="w-full rounded-lg bg-surface border border-warm-cream/15 px-3 py-2.5 text-sm text-warm-cream focus:outline-none focus:border-brand-red/50">
                                    {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-warm-cream/70 mb-1">Amount (₦)</label>
                                    <input type="number" min="0" step="0.01" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}
                                        className="w-full rounded-lg bg-surface border border-warm-cream/15 px-3 py-2.5 text-sm text-warm-cream focus:outline-none focus:border-brand-red/50" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-warm-cream/70 mb-1">Date</label>
                                    <input type="date" required value={form.incurredOn} onChange={(e) => setForm({ ...form, incurredOn: e.target.value })}
                                        className="w-full rounded-lg bg-surface border border-warm-cream/15 px-3 py-2.5 text-sm text-warm-cream focus:outline-none focus:border-brand-red/50" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-warm-cream/70 mb-1">Description</label>
                                <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. Goat supply — Kara market"
                                    className="w-full rounded-lg bg-surface border border-warm-cream/15 px-3 py-2.5 text-sm text-warm-cream placeholder:text-warm-cream/40 focus:outline-none focus:border-brand-red/50" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-warm-cream/70 mb-1">Note (optional)</label>
                                <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })}
                                    className="w-full rounded-lg bg-surface border border-warm-cream/15 px-3 py-2.5 text-sm text-warm-cream placeholder:text-warm-cream/40 focus:outline-none focus:border-brand-red/50" />
                            </div>
                            <button type="submit" disabled={saving}
                                className="w-full rounded-full bg-brand-red px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-red/90 transition-colors disabled:opacity-60">
                                {saving ? "Saving…" : form.id ? "Save changes" : "Add expense"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
