"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, PieChart, Pie, Cell, Legend
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import {
    DollarSign, TrendingUp, TrendingDown, BarChart3, ShoppingBag, Package,
    Users, UserPlus, Repeat, Gem, Ticket, Percent, Truck, Clock,
    Activity, Factory, Tag, RefreshCw, AlertTriangle, Zap, Layers, Target,
    Beef, Scale, MapPin, Thermometer,
} from "lucide-react";
import { formatCurrency } from "@/lib/formatCurrency";
import type { AnalyticsData } from "@/lib/analytics";

// --- Animated Counter Hook ---
function useAnimatedCounter(target: number, duration = 1200) {
    const [value, setValue] = useState(0);
    const frameRef = useRef<number | null>(null);

    useEffect(() => {
        const start = performance.now();
        const from = 0;

        const animate = (timestamp: number) => {
            const elapsed = timestamp - start;
            const progress = Math.min(elapsed / duration, 1);
            // Ease out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setValue(from + (target - from) * eased);
            if (progress < 1) {
                frameRef.current = requestAnimationFrame(animate);
            }
        };

        frameRef.current = requestAnimationFrame(animate);
        return () => {
            if (frameRef.current) cancelAnimationFrame(frameRef.current);
        };
    }, [target, duration]);

    return value;
}

// --- Stagger container ---
const stagger = {
    hidden: {},
    show: { transition: { staggerChildren: 0.06 } },
};

const fadeUp = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const } },
};

interface AnalyticsDashboardProps {
    data: AnalyticsData;
}

export default function AnalyticsDashboard({ data }: AnalyticsDashboardProps) {
    const [activeTab, setActiveTab] = useState<"sales" | "meat" | "inventory" | "customers" | "marketing" | "operations">("sales");

    const tabs = [
        { id: "sales", label: "Sales & Profit", icon: DollarSign },
        { id: "meat", label: "Meat & Delivery", icon: Beef },
        { id: "inventory", label: "Inventory", icon: Package },
        { id: "customers", label: "Customers", icon: Users },
        { id: "marketing", label: "Marketing", icon: Ticket },
        { id: "operations", label: "Operations", icon: Truck },
    ] as const;

    return (
        <div className="space-y-8">
            {/* Header + Velocity Badge */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div>
                    <h1 className="text-3xl font-serif text-warm-cream">Analytics</h1>
                    <div className="flex items-center gap-3 mt-2">
                        <p className="text-warm-cream/50 text-sm">Comprehensive store insights</p>
                        {data.revenueVelocity.trendPercent !== 0 && (
                            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full ${data.revenueVelocity.trendPercent > 0
                                ? "bg-emerald-500/10 text-emerald-400"
                                : "bg-red-500/10 text-red-400"
                                }`}>
                                {data.revenueVelocity.trendPercent > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                {Math.abs(data.revenueVelocity.trendPercent).toFixed(1)}% vs 30d avg
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex space-x-1 bg-white/[0.04] backdrop-blur-sm p-1 rounded-xl border border-warm-cream/[0.08] shadow-sm">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 flex items-center gap-2 cursor-pointer ${activeTab === tab.id
                                ? "text-brand-green"
                                : "text-warm-cream/50 hover:text-warm-cream"
                                }`}
                        >
                            {activeTab === tab.id && (
                                <motion.div
                                    layoutId="activeTab"
                                    className="absolute inset-0 bg-white/[0.08] rounded-lg shadow-md border border-warm-cream/10"
                                    transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                                />
                            )}
                            <span className="relative z-10 flex items-center gap-2">
                                <tab.icon size={14} />
                                <span className="hidden sm:inline">{tab.label}</span>
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab Content with AnimatePresence */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25 }}
                >
                    {activeTab === "sales" && <SalesView data={data} />}
                    {activeTab === "meat" && <MeatDeliveryView data={data} />}
                    {activeTab === "inventory" && <InventoryView data={data} />}
                    {activeTab === "customers" && <CustomersView data={data} />}
                    {activeTab === "marketing" && <MarketingView data={data} />}
                    {activeTab === "operations" && <OperationsView data={data} />}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}


// ============================================================
//  SALES VIEW
// ============================================================

function SalesView({ data }: { data: AnalyticsData }) {
    return (
        <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
            <motion.div variants={stagger} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <GlassKPI title="Total Revenue" value={data.sales.totalRevenue} format="currency" icon={DollarSign} />
                <GlassKPI title="Gross Profit" value={data.profit.grossProfit} format="currency" icon={TrendingUp} accent="green" subtitle={`${data.profit.grossMargin.toFixed(1)}% Margin`} />
                <GlassKPI title="Net Revenue" value={data.sales.netRevenue} format="currency" icon={BarChart3} subtitle="Excl. Shipping" />
                <GlassKPI title="Avg Order Value" value={data.sales.aov} format="currency" icon={ShoppingBag} />
            </motion.div>

            {/* Revenue Velocity */}
            <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <VelocityCard label="Daily Avg (7d)" value={data.revenueVelocity.avg7d} />
                <VelocityCard label="Daily Avg (30d)" value={data.revenueVelocity.avg30d} />
                <div className="glass-card p-5 flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${data.revenueVelocity.trendPercent >= 0 ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
                        <Zap size={20} className={data.revenueVelocity.trendPercent >= 0 ? "text-emerald-600" : "text-red-600"} />
                    </div>
                    <div>
                        <p className="text-xs text-warm-cream/50 font-medium">Momentum</p>
                        <p className={`text-xl font-bold font-serif ${data.revenueVelocity.trendPercent >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                            {data.revenueVelocity.trendPercent >= 0 ? "+" : ""}{data.revenueVelocity.trendPercent.toFixed(1)}%
                        </p>
                    </div>
                </div>
            </motion.div>

            <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 glass-card p-6">
                    <h3 className="text-lg font-medium text-warm-cream mb-6">Revenue Trend</h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <LineChart data={data.sales.trend}>
                                <defs>
                                    <linearGradient id="purpleGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#355E3B" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#355E3B" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
                                <XAxis dataKey="date" stroke="rgba(255,255,255,0.25)" fontSize={12} tickFormatter={d => new Date(d).toLocaleDateString(undefined, { weekday: 'short' })} />
                                <YAxis stroke="rgba(255,255,255,0.25)" fontSize={12} tickFormatter={v => `₦${v / 1000}k`} />
                                <Tooltip formatter={(val) => formatCurrency(Number(val))} />
                                <Line type="monotone" dataKey="value" stroke="#355E3B" strokeWidth={3} dot={{ r: 4, fill: "#355E3B" }} activeDot={{ r: 6 }} fill="url(#purpleGrad)" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="glass-card p-6">
                    <h3 className="text-lg font-medium text-warm-cream mb-6">Revenue by Status</h3>
                    <div className="space-y-4">
                        {Object.entries(data.sales.revenueByStatus).map(([status, amount]) => {
                            const pct = data.sales.totalRevenue > 0 ? (amount / data.sales.totalRevenue) * 100 : 0;
                            return (
                                <div key={status}>
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="capitalize text-sm text-warm-cream/50">{status}</span>
                                        <span className="font-medium text-sm">{formatCurrency(amount)}</span>
                                    </div>
                                    <div className="h-2 bg-warm-cream/10 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${pct}%` }}
                                            transition={{ duration: 0.8, ease: "easeOut" }}
                                            className="h-full bg-gradient-to-r from-brand-green to-violet-400 rounded-full"
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </motion.div>

            {/* Category Performance + Top Selling */}
            <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="glass-card p-6">
                    <h3 className="text-lg font-medium text-warm-cream mb-4">Category Performance</h3>
                    {data.categoryPerformance.length > 0 ? (
                        <div className="h-[250px]">
                            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                <BarChart data={data.categoryPerformance} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.06)" />
                                    <XAxis type="number" fontSize={12} tickFormatter={v => `₦${v / 1000}k`} />
                                    <YAxis type="category" dataKey="name" fontSize={12} width={90} />
                                    <Tooltip formatter={(val) => formatCurrency(Number(val))} />
                                    <Bar dataKey="revenue" fill="url(#barGrad)" radius={[0, 6, 6, 0]} />
                                    <defs>
                                        <linearGradient id="barGrad" x1="0" y1="0" x2="1" y2="0">
                                            <stop offset="0%" stopColor="#355E3B" />
                                            <stop offset="100%" stopColor="#4a8055" />
                                        </linearGradient>
                                    </defs>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <p className="text-warm-cream/40 text-sm py-10 text-center">No category data yet</p>
                    )}
                </div>
                <div className="glass-card p-6">
                    <h3 className="text-lg font-medium text-warm-cream mb-4">Top Selling Products</h3>
                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-warm-cream/30 text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="pb-3">Product</th>
                                    <th className="pb-3 text-right">Units</th>
                                    <th className="pb-3 text-right">Revenue</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-warm-cream/[0.06]">
                                {data.products.topSelling.map((p, i) => (
                                    <tr key={p.id} className="hover:bg-white/[0.03] transition-colors">
                                        <td className="py-3 font-medium text-warm-cream flex items-center gap-2">
                                            <span className="text-xs text-brand-green/60 font-mono w-5">#{i + 1}</span>
                                            {p.name}
                                        </td>
                                        <td className="py-3 text-right text-warm-cream/70">{p.quantity}</td>
                                        <td className="py-3 text-right font-medium">{formatCurrency(p.revenue)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {/* Mobile Cards */}
                    <div className="md:hidden flex flex-col gap-3">
                        {data.products.topSelling.map((p, i) => (
                            <div key={p.id} className="bg-white/[0.04] rounded-lg border border-warm-cream/[0.08] p-3 shadow-sm flex flex-col gap-2">
                                <div className="flex items-center gap-2 border-b border-warm-cream/10 pb-2">
                                    <span className="text-xs font-mono font-bold text-brand-green bg-warm-cream/10 px-2 py-0.5 rounded-full">#{i + 1}</span>
                                    <span className="font-medium text-warm-cream">{p.name}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] uppercase text-warm-cream/40">Units Sold</span>
                                        <span className="font-medium text-warm-cream">{p.quantity}</span>
                                    </div>
                                    <div className="flex flex-col text-right">
                                        <span className="text-[10px] uppercase text-warm-cream/40">Revenue</span>
                                        <span className="font-medium text-warm-cream">{formatCurrency(p.revenue)}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {data.products.topSelling.length === 0 && (
                            <div className="text-center py-6 text-warm-cream/50 text-sm border border-warm-cream/20 rounded-lg border-dashed">
                                No products found
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}


// ============================================================
//  MEAT & DELIVERY VIEW
// ============================================================

const ZONE_COLORS = ["#355E3B", "#06b6d4", "#f59e0b", "#10b981", "#ef4444", "#6366f1", "#ec4899", "#14b8a6"];

function MeatDeliveryView({ data }: { data: AnalyticsData }) {
    const m = data.meat;

    return (
        <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
            {/* KPI Cards */}
            <motion.div variants={stagger} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <GlassKPI title="Total Kg Sold" value={m.totalKgSold} format="number" icon={Scale} accent="green" subtitle="All time" />
                <GlassKPI title="Expiring Stock" value={m.expiringStockCount} format="number" icon={Thermometer} accent={m.expiringStockCount > 0 ? "red" : "green"} subtitle="Within 7 days" />
                <GlassKPI title="Delivery Zones" value={m.deliveryZoneBreakdown.length} format="number" icon={MapPin} subtitle="Active zones" />
                <GlassKPI title="Gross Margin" value={data.profit.grossMargin} format="percent" icon={TrendingUp} accent="amber" />
            </motion.div>

            {/* Charts Row */}
            <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Kg Sold by Category */}
                <div className="glass-card p-6">
                    <h3 className="text-lg font-medium text-warm-cream mb-4">Kg Sold by Category</h3>
                    {m.kgByCategory.length > 0 ? (
                        <div className="h-[280px]">
                            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                <BarChart data={m.kgByCategory}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
                                    <XAxis dataKey="name" fontSize={12} stroke="rgba(255,255,255,0.25)" />
                                    <YAxis fontSize={12} stroke="rgba(255,255,255,0.25)" tickFormatter={v => `${v}kg`} />
                                    <Tooltip formatter={(val) => [`${Number(val).toFixed(1)} kg`, "Weight"]} />
                                    <defs>
                                        <linearGradient id="kgGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#10b981" />
                                            <stop offset="100%" stopColor="#6ee7b7" />
                                        </linearGradient>
                                    </defs>
                                    <Bar dataKey="kg" fill="url(#kgGrad)" radius={[6, 6, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <p className="text-warm-cream/40 text-sm py-10 text-center">No sales data yet</p>
                    )}
                </div>

                {/* Delivery Zone Breakdown */}
                <div className="glass-card p-6">
                    <h3 className="text-lg font-medium text-warm-cream mb-4">Delivery Zone Breakdown</h3>
                    {m.deliveryZoneBreakdown.length > 0 ? (
                        <div className="h-[280px]">
                            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                <PieChart>
                                    <Pie
                                        data={m.deliveryZoneBreakdown.map(d => ({ name: d.zone, value: d.orders }))}
                                        cx="50%" cy="50%"
                                        innerRadius={60} outerRadius={90}
                                        paddingAngle={3}
                                        dataKey="value"
                                    >
                                        {m.deliveryZoneBreakdown.map((_, i) => (
                                            <Cell key={i} fill={ZONE_COLORS[i % ZONE_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(val, _, entry) => {
                                        const zone = m.deliveryZoneBreakdown.find(d => d.zone === entry.payload.name);
                                        return [`${val} orders (${formatCurrency(zone?.revenue || 0)})`, entry.payload.name];
                                    }} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <p className="text-warm-cream/40 text-sm py-10 text-center">No delivery data yet</p>
                    )}
                </div>
            </motion.div>

            {/* Gross Margin Trend */}
            <motion.div variants={fadeUp} className="glass-card p-6">
                <h3 className="text-lg font-medium text-warm-cream mb-4">Gross Margin Trend (7d)</h3>
                <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        <LineChart data={m.grossMarginTrend}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
                            <XAxis dataKey="date" fontSize={12} stroke="rgba(255,255,255,0.25)" tickFormatter={d => new Date(d).toLocaleDateString(undefined, { weekday: "short" })} />
                            <YAxis fontSize={12} stroke="rgba(255,255,255,0.25)" tickFormatter={v => `${v}%`} domain={[0, 100]} />
                            <Tooltip formatter={(val) => [`${Number(val).toFixed(1)}%`, "Margin"]} />
                            <defs>
                                <linearGradient id="marginGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <Line type="monotone" dataKey="margin" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, fill: "#f59e0b" }} activeDot={{ r: 6 }} fill="url(#marginGrad)" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </motion.div>

            {/* Expiring Stock Table */}
            {m.expiringItems.length > 0 && (
                <motion.div variants={fadeUp} className="glass-card p-6">
                    <h3 className="text-lg font-medium text-warm-cream mb-4 flex items-center gap-2">
                        <AlertTriangle size={18} className="text-red-500" /> Expiring Stock (Next 7 Days)
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-warm-cream/30 text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="pb-3">Product</th>
                                    <th className="pb-3 text-right">Stock</th>
                                    <th className="pb-3 text-right">Expires</th>
                                    <th className="pb-3 text-right">Days Left</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-warm-cream/[0.06]">
                                {m.expiringItems.map((item, i) => {
                                    const daysLeft = Math.ceil((new Date(item.expiryDate).getTime() - Date.now()) / 86400000);
                                    return (
                                        <tr key={i} className="hover:bg-red-500/5 transition-colors">
                                            <td className="py-3 font-medium text-warm-cream">{item.name}</td>
                                            <td className="py-3 text-right text-warm-cream/70">{item.stock}</td>
                                            <td className="py-3 text-right text-warm-cream/70">{new Date(item.expiryDate).toLocaleDateString("en-NG", { month: "short", day: "numeric" })}</td>
                                            <td className="py-3 text-right">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${daysLeft <= 2 ? "bg-red-500/10 text-red-400" : daysLeft <= 5 ? "bg-amber-500/10 text-amber-400" : "bg-yellow-500/10 text-yellow-400"}`}>
                                                    {daysLeft <= 0 ? "Expired" : `${daysLeft}d`}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            )}

            {/* Zone Revenue Table */}
            {m.deliveryZoneBreakdown.length > 0 && (
                <motion.div variants={fadeUp} className="glass-card p-6">
                    <h3 className="text-lg font-medium text-warm-cream mb-4">Zone Performance</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-warm-cream/30 text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="pb-3">Zone</th>
                                    <th className="pb-3 text-right">Orders</th>
                                    <th className="pb-3 text-right">Revenue</th>
                                    <th className="pb-3 text-right">Avg Order</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-warm-cream/[0.06]">
                                {m.deliveryZoneBreakdown.map((z, i) => (
                                    <tr key={i} className="hover:bg-white/[0.03] transition-colors">
                                        <td className="py-3 font-medium text-warm-cream flex items-center gap-2">
                                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ZONE_COLORS[i % ZONE_COLORS.length] }} />
                                            {z.zone}
                                        </td>
                                        <td className="py-3 text-right text-warm-cream/70">{z.orders}</td>
                                        <td className="py-3 text-right font-medium">{formatCurrency(z.revenue)}</td>
                                        <td className="py-3 text-right text-warm-cream/70">{formatCurrency(z.orders > 0 ? z.revenue / z.orders : 0)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
}


// ============================================================
//  INVENTORY VIEW
// ============================================================

function InventoryView({ data }: { data: AnalyticsData }) {
    return (
        <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
            <motion.div variants={stagger} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <GlassKPI title="Value (Cost)" value={data.inventory.totalValuationCost} format="currency" icon={Factory} />
                <GlassKPI title="Value (Retail)" value={data.inventory.totalValuationRetail} format="currency" icon={Tag} />
                <GlassKPI title="Projected Margin" value={data.inventory.projectedMargin} format="percent" icon={TrendingUp} accent="amber" />
                <GlassKPI title="Turnover Rate" value={data.products.turnoverRate * 100} format="percent" icon={RefreshCw} subtitle="Sold / Stock" />
            </motion.div>

            <motion.div variants={fadeUp} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass-card p-6">
                    <h3 className="text-lg font-medium text-warm-cream mb-4">Stock Health</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <MiniGlassKPI label="Low Stock" value={data.inventory.lowStockCount.toString()} alert={data.inventory.lowStockCount > 0} />
                        <MiniGlassKPI label="Out of Stock" value={data.inventory.outOfStockCount.toString()} alert={data.inventory.outOfStockCount > 0} />
                        <MiniGlassKPI label="Shrinkage" value={formatCurrency(data.inventory.shrinkageValue)} alert />
                        <MiniGlassKPI label="Total Items" value={data.inventory.totalItems.toString()} />
                    </div>
                </div>
                <div className="glass-card p-6 bg-gradient-to-br from-brand-green/5 to-brand-green/[0.02]">
                    <h3 className="text-sm font-bold text-warm-cream/40 uppercase mb-4 flex items-center gap-2">
                        <AlertTriangle size={14} /> Inventory Insights
                    </h3>
                    <ul className="space-y-3 text-sm text-warm-cream/50">
                        <li className="flex items-start gap-2">
                            <span className="text-brand-green mt-1">•</span>
                            <span><b>{data.inventory.lowStockCount}</b> items below reorder level.</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-emerald-500 mt-1">•</span>
                            <span><b>{formatCurrency(data.inventory.totalValuationRetail - data.inventory.totalValuationCost)}</b> potential profit locked in stock.</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-red-500 mt-1">•</span>
                            <span>Shrinkage loss: <b>{formatCurrency(data.inventory.shrinkageValue)}</b></span>
                        </li>
                    </ul>
                </div>
            </motion.div>
        </motion.div>
    );
}


// ============================================================
//  CUSTOMERS VIEW
// ============================================================

function CustomersView({ data }: { data: AnalyticsData }) {
    return (
        <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
            <motion.div variants={stagger} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <GlassKPI title="Total Customers" value={data.customers.total} format="number" icon={Users} />
                <GlassKPI title="New (30d)" value={data.customers.new} format="number" icon={UserPlus} accent="green" />
                <GlassKPI title="Returning Rate" value={data.customers.returningRate} format="percent" icon={Repeat} />
                <GlassKPI title="Avg CLV" value={data.customers.clv} format="currency" icon={Gem} subtitle="Lifetime Value" />
            </motion.div>

            <motion.div variants={fadeUp} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass-card p-6">
                    <h3 className="text-lg font-medium text-warm-cream mb-6">Guest vs Registered</h3>
                    <div className="h-[220px] flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <PieChart>
                                <Pie data={[
                                    { name: "Registered", value: data.customers.registeredVsGuest.registered },
                                    { name: "Guest", value: data.customers.registeredVsGuest.guest }
                                ]} cx="50%" cy="50%" innerRadius={65} outerRadius={85} paddingAngle={5} dataKey="value">
                                    <Cell fill="#355E3B" />
                                    <Cell fill="rgba(253,246,236,0.15)" />
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Conversion Funnel */}
                <div className="glass-card p-6">
                    <h3 className="text-lg font-medium text-warm-cream mb-6 flex items-center gap-2">
                        <Target size={18} className="text-brand-green" /> Order Funnel
                    </h3>
                    <FunnelViz data={data.conversionFunnel} total={data.conversionFunnel.pending + data.conversionFunnel.shipped + data.conversionFunnel.delivered} />
                </div>
            </motion.div>
        </motion.div>
    );
}


// ============================================================
//  MARKETING VIEW
// ============================================================

function MarketingView({ data }: { data: AnalyticsData }) {
    return (
        <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
            <motion.div variants={stagger} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <GlassKPI title="Coupon Usage" value={data.marketing.couponUsage} format="number" icon={Ticket} />
                <GlassKPI title="Discount Impact" value={data.marketing.discountImpact} format="percent" icon={Percent} accent="amber" />
                <GlassKPI title="Profit/Order" value={data.profit.profitPerOrder} format="currency" icon={DollarSign} accent="green" />
                <GlassKPI title="Total COGS" value={data.profit.totalCOGS} format="currency" icon={Layers} />
            </motion.div>

            <motion.div variants={fadeUp} className="glass-card p-6">
                <h3 className="text-lg font-medium text-warm-cream mb-4">Top Performing Coupons</h3>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-warm-cream/30 text-xs uppercase tracking-wider">
                            <tr>
                                <th className="pb-3">Code</th>
                                <th className="pb-3 text-right">Usage Count</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-warm-cream/[0.06]">
                            {data.marketing.topCoupons.map(c => (
                                <tr key={c.code} className="hover:bg-white/[0.03] transition-colors">
                                    <td className="py-3 font-mono font-medium text-brand-green">{c.code}</td>
                                    <td className="py-3 text-right">{c.count}</td>
                                </tr>
                            ))}
                            {data.marketing.topCoupons.length === 0 && (
                                <tr><td colSpan={2} className="p-6 text-center text-warm-cream/30">No coupon usage yet</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                {/* Mobile Cards */}
                <div className="md:hidden flex flex-col gap-3">
                    {data.marketing.topCoupons.map(c => (
                        <div key={c.code} className="bg-white/[0.04] flex justify-between items-center rounded-lg border border-warm-cream/20 p-4 shadow-sm">
                            <span className="font-mono font-bold text-brand-green">{c.code}</span>
                            <div className="flex flex-col text-right">
                                <span className="text-[10px] uppercase text-warm-cream/40">Uses</span>
                                <span className="font-medium text-warm-cream text-lg leading-none">{c.count}</span>
                            </div>
                        </div>
                    ))}
                    {data.marketing.topCoupons.length === 0 && (
                        <div className="text-center py-6 text-warm-cream/50 text-sm border border-warm-cream/20 rounded-lg border-dashed">
                            No coupon usage yet
                        </div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}


// ============================================================
//  OPERATIONS VIEW
// ============================================================

function OperationsView({ data }: { data: AnalyticsData }) {
    return (
        <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6">
            <motion.div variants={stagger} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <GlassKPI title="Fulfillment Rate" value={data.operations.fulfillmentRate} format="percent" icon={Truck} accent={data.operations.fulfillmentRate > 90 ? "green" : "amber"} />
                <GlassKPI title="Pending Backlog" value={data.operations.backlog} format="number" icon={Clock} accent={data.operations.backlog > 5 ? "red" : "purple"} />
                <GlassKPI title="Activity (24h)" value={data.operations.recentActivityCount} format="number" icon={Activity} subtitle="Events" />
            </motion.div>

            {/* Peak Hours Heatmap */}
            <motion.div variants={fadeUp} className="glass-card p-6">
                <h3 className="text-lg font-medium text-warm-cream mb-2">Peak Sales Hours</h3>
                <p className="text-xs text-warm-cream/40 mb-6">Order volume by hour of day</p>
                <PeakHoursHeatmap data={data.peakHours} />
            </motion.div>

            {/* Conversion Funnel */}
            <motion.div variants={fadeUp} className="glass-card p-6">
                <h3 className="text-lg font-medium text-warm-cream mb-6 flex items-center gap-2">
                    <Target size={18} className="text-brand-green" /> Conversion Funnel
                </h3>
                <div className="grid grid-cols-3 gap-4 text-center mb-6">
                    <FunnelStat label="Processing Rate" value={data.conversionFunnel.pendingToShippedRate} />
                    <FunnelStat label="Delivery Rate" value={data.conversionFunnel.shippedToDeliveredRate} />
                    <FunnelStat label="Overall Conversion" value={data.conversionFunnel.overallConversionRate} />
                </div>
                <FunnelViz data={data.conversionFunnel} total={data.conversionFunnel.pending + data.conversionFunnel.shipped + data.conversionFunnel.delivered} />
            </motion.div>
        </motion.div>
    );
}


// ============================================================
//  REUSABLE COMPONENTS
// ============================================================

const ACCENT_MAP = {
    purple: { bg: "from-brand-green/10 to-brand-green/5", icon: "bg-brand-green/10 text-brand-green", ring: "ring-brand-green/20" },
    green: { bg: "from-emerald-500/10 to-green-500/5", icon: "bg-emerald-500/10 text-emerald-400", ring: "ring-emerald-500/20" },
    amber: { bg: "from-amber-500/10 to-yellow-500/5", icon: "bg-amber-500/10 text-amber-400", ring: "ring-amber-500/20" },
    red: { bg: "from-red-500/10 to-rose-500/5", icon: "bg-red-500/10 text-red-400", ring: "ring-red-500/20" },
};

function GlassKPI({ title, value, format, icon: Icon, accent = "purple", subtitle }: {
    title: string; value: number; format: "currency" | "percent" | "number";
    icon: React.ElementType; accent?: "purple" | "green" | "amber" | "red"; subtitle?: string;
}) {
    const animated = useAnimatedCounter(value);
    const displayValue = format === "currency"
        ? formatCurrency(animated)
        : format === "percent"
            ? `${animated.toFixed(1)}%`
            : Math.round(animated).toLocaleString();

    const colors = ACCENT_MAP[accent];

    return (
        <motion.div variants={fadeUp} className={`glass-card p-5 bg-gradient-to-br ${colors.bg} group hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300`}>
            <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-warm-cream/50 uppercase tracking-wider">{title}</p>
                    <h3 className="text-2xl font-serif text-warm-cream mt-1 font-bold truncate">{displayValue}</h3>
                    {subtitle && <p className="text-xs text-warm-cream/40 mt-0.5">{subtitle}</p>}
                </div>
                <div className={`p-2.5 rounded-xl ${colors.icon} transition-transform group-hover:scale-110`}>
                    <Icon size={18} />
                </div>
            </div>
        </motion.div>
    );
}

function VelocityCard({ label, value }: { label: string; value: number }) {
    return (
        <div className="glass-card p-5">
            <p className="text-xs text-warm-cream/50 font-medium">{label}</p>
            <p className="text-xl font-bold font-serif text-warm-cream mt-1">{formatCurrency(value)}</p>
            <p className="text-xs text-warm-cream/30 mt-0.5">per day</p>
        </div>
    );
}

function MiniGlassKPI({ label, value, alert = false }: { label: string; value: string; alert?: boolean }) {
    return (
        <div className={`p-4 rounded-xl border text-center transition-colors ${alert ? "border-red-500/20 bg-red-500/5" : "border-warm-cream/[0.08] bg-white/[0.03]"}`}>
            <p className="text-xs text-warm-cream/50 uppercase tracking-wider">{label}</p>
            <p className={`text-lg font-bold font-serif mt-1 ${alert ? "text-red-600" : "text-warm-cream"}`}>{value}</p>
        </div>
    );
}

function FunnelViz({ data, total }: { data: AnalyticsData["conversionFunnel"]; total: number }) {
    if (total === 0) return <p className="text-warm-cream/40 text-sm text-center py-6">No order data yet</p>;

    const stages = [
        { label: "Pending", count: data.pending, color: "bg-amber-400" },
        { label: "Shipped", count: data.shipped, color: "bg-blue-400" },
        { label: "Delivered", count: data.delivered, color: "bg-emerald-400" },
    ];

    return (
        <div className="space-y-3">
            {stages.map((s, i) => {
                const pct = (s.count / total) * 100;
                return (
                    <div key={s.label}>
                        <div className="flex justify-between text-sm mb-1">
                            <span className="text-warm-cream/50">{s.label}</span>
                            <span className="font-medium">{s.count} ({pct.toFixed(0)}%)</span>
                        </div>
                        <div className="h-3 bg-warm-cream/5 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.8, delay: i * 0.15, ease: "easeOut" }}
                                className={`h-full rounded-full ${s.color}`}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function FunnelStat({ label, value }: { label: string; value: number }) {
    return (
        <div>
            <p className="text-xs text-warm-cream/40 uppercase tracking-wider">{label}</p>
            <p className="text-2xl font-bold font-serif text-warm-cream mt-1">{value.toFixed(1)}%</p>
        </div>
    );
}

function PeakHoursHeatmap({ data }: { data: AnalyticsData["peakHours"] }) {
    const maxCount = Math.max(...data.map(d => d.count), 1);

    return (
        <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-1.5">
            {data.map(d => {
                const intensity = d.count / maxCount;
                const bg = d.count === 0
                    ? "bg-warm-cream/5 text-warm-cream/20"
                    : intensity > 0.75
                        ? "bg-brand-green text-white"
                        : intensity > 0.5
                            ? "bg-brand-green/60 text-white"
                            : intensity > 0.25
                                ? "bg-brand-green/25 text-brand-green"
                                : "bg-brand-green/10 text-brand-green/70";

                const label = d.hour === 0 ? "12am" : d.hour < 12 ? `${d.hour}am` : d.hour === 12 ? "12pm" : `${d.hour - 12}pm`;

                return (
                    <div key={d.hour} className={`${bg} rounded-lg p-2 text-center transition-all hover:scale-105 cursor-default group relative`}>
                        <p className="text-[10px] font-medium">{label}</p>
                        <p className="text-xs font-bold">{d.count}</p>
                        {d.count > 0 && (
                            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-brand-dark text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                                {formatCurrency(d.revenue)}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
