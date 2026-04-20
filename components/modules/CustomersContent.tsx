"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
    Search, Filter, ChevronDown, Mail, MoreVertical,
    Trash2, ExternalLink, Shield, User, Calendar,
    CreditCard, TrendingUp, Users, ShoppingBag
} from "lucide-react";
import type { EnrichedProfile } from "@/types";
import { formatCurrency } from "@/lib/formatCurrency";

interface CustomersContentProps {
    customers: EnrichedProfile[];
}

export default function CustomersContent({ customers }: CustomersContentProps) {
    const [search, setSearch] = useState("");
    const [sortBy, setSortBy] = useState<"newest" | "oldest" | "spent" | "orders">("newest");
    const [filterRole, setFilterRole] = useState<"all" | "admin" | "customer">("all");

    // KPIs
    const kpis = useMemo(() => {
        const totalCustomers = customers.length;
        const activeCustomers = customers.filter(c => c.orderCount > 0).length;
        const totalRevenue = customers.reduce((sum, c) => sum + c.totalSpent, 0);
        const newThisMonth = customers.filter(c => {
            const date = new Date(c.createdAt);
            const now = new Date();
            return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
        }).length;

        return { totalCustomers, activeCustomers, totalRevenue, newThisMonth };
    }, [customers]);

    // Filter & Sort
    const filteredCustomers = useMemo(() => {
        return customers
            .filter((c) => {
                const matchesSearch =
                    c.fullName?.toLowerCase().includes(search.toLowerCase()) ||
                    c.email.toLowerCase().includes(search.toLowerCase());
                const matchesRole = filterRole === "all" || c.role === filterRole;
                return matchesSearch && matchesRole;
            })
            .sort((a, b) => {
                switch (sortBy) {
                    case "newest": return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                    case "oldest": return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                    case "spent": return b.totalSpent - a.totalSpent;
                    case "orders": return b.orderCount - a.orderCount;
                    default: return 0;
                }
            });
    }, [customers, search, sortBy, filterRole]);

    const container = {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    return (
        <div className="space-y-8 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-3xl font-serif text-warm-cream mb-2">Customers</h1>
                    <p className="text-warm-cream/60">Manage your customer base and view insights</p>
                </div>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white/[0.04] border border-warm-cream/30 rounded-lg text-warm-cream hover:bg-brand-creme/50 transition-colors">
                        <ExternalLink size={16} />
                        <span>Export CSV</span>
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard
                    label="Total Customers"
                    value={kpis.totalCustomers.toString()}
                    icon={Users}
                    trend="+12%" // Dummy trend for now
                />
                <KpiCard
                    label="Active Members"
                    value={kpis.activeCustomers.toString()}
                    icon={User}
                    subtext={`${Math.round((kpis.activeCustomers / (kpis.totalCustomers || 1)) * 100)}% of total`}
                />
                <KpiCard
                    label="Total Revenue"
                    value={formatCurrency(kpis.totalRevenue)}
                    icon={CreditCard}
                    trend="+8%"
                />
                <KpiCard
                    label="New This Month"
                    value={kpis.newThisMonth.toString()}
                    icon={TrendingUp}
                    subtext="Since 1st of month"
                />
            </div>

            {/* Main Content */}
            <div className="glass-card p-6">
                {/* Controls */}
                <div className="flex flex-col md:flex-row gap-4 mb-8 justify-between">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-cream/40" size={18} />
                        <input
                            type="text"
                            placeholder="Search by name or email..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white/50 border border-warm-cream/20 rounded-lg focus:outline-none focus:border-brand-green/50 focus:ring-1 focus:ring-brand-green/50 transition-all"
                        />
                    </div>
                    <div className="flex gap-3">
                        <select
                            value={filterRole}
                            onChange={(e) => setFilterRole(e.target.value as any)}
                            className="px-4 py-2 bg-white/50 border border-warm-cream/20 rounded-lg focus:outline-none focus:border-brand-green/50 text-warm-cream/80"
                        >
                            <option value="all">All Roles</option>
                            <option value="customer">Customers</option>
                            <option value="admin">Admins</option>
                        </select>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as any)}
                            className="px-4 py-2 bg-white/50 border border-warm-cream/20 rounded-lg focus:outline-none focus:border-brand-green/50 text-warm-cream/80"
                        >
                            <option value="newest">Newest Joined</option>
                            <option value="oldest">Oldest Joined</option>
                            <option value="spent">Highest Spenders</option>
                            <option value="orders">Most Orders</option>
                        </select>
                    </div>
                </div>

                {/* Table (Desktop) */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-warm-cream/10 text-left text-xs uppercase tracking-wider text-warm-cream/50">
                                <th className="pb-4 pl-4 font-medium">Customer</th>
                                <th className="pb-4 font-medium">Status</th>
                                <th className="pb-4 font-medium">Orders</th>
                                <th className="pb-4 font-medium">Total Spent</th>
                                <th className="pb-4 font-medium">Joined</th>
                                <th className="pb-4 pr-4 text-right font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-warm-cream/5">
                            <AnimatePresence>
                                {filteredCustomers.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-12 text-center text-warm-cream/40">
                                            No customers found matching your filters.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredCustomers.map((customer) => (
                                        <motion.tr
                                            key={customer.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0 }}
                                            className="group hover:bg-warm-cream/5 transition-colors"
                                        >
                                            <td className="py-4 pl-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="relative h-10 w-10 rounded-full overflow-hidden bg-warm-cream/10 border border-warm-cream/20 flex-shrink-0">
                                                        {customer.avatarUrl ? (
                                                            <Image
                                                                src={customer.avatarUrl}
                                                                alt={customer.fullName}
                                                                fill
                                                                className="object-cover"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-brand-green font-serif font-bold">
                                                                {(customer.fullName || customer.email || "?")[0].toUpperCase()}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-warm-cream">{customer.fullName || "Unnamed User"}</p>
                                                        <p className="text-xs text-warm-cream/50">{customer.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4">
                                                {customer.role === "admin" ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 border border-purple-200">
                                                        <Shield size={10} />
                                                        Admin
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-400 border border-emerald-500/20">
                                                        <User size={10} />
                                                        Customer
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-4">
                                                <div className="flex items-center gap-2">
                                                    <ShoppingBag size={14} className="text-warm-cream/30" />
                                                    <span className="text-warm-cream/80">{customer.orderCount}</span>
                                                </div>
                                            </td>
                                            <td className="py-4">
                                                <span className="font-medium text-warm-cream">
                                                    {formatCurrency(customer.totalSpent)}
                                                </span>
                                            </td>
                                            <td className="py-4 text-warm-cream/60 text-sm">
                                                {new Date(customer.createdAt).toLocaleDateString(undefined, {
                                                    month: 'short', day: 'numeric', year: 'numeric'
                                                })}
                                            </td>
                                            <td className="py-4 pr-4 text-right">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button className="p-2 hover:bg-warm-cream/10 rounded-lg text-warm-cream/60 hover:text-brand-green transition-colors" title="Email Customer">
                                                        <Mail size={16} />
                                                    </button>
                                                    <button className="p-2 hover:bg-warm-cream/10 rounded-lg text-warm-cream/60 hover:text-brand-green transition-colors" title="View Details">
                                                        <MoreVertical size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))
                                )}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden flex flex-col gap-4">
                    <AnimatePresence>
                        {filteredCustomers.length === 0 ? (
                            <div className="py-12 text-center text-warm-cream/40 bg-white/50 rounded-xl border border-warm-cream/10">
                                No customers found matching your filters.
                            </div>
                        ) : (
                            filteredCustomers.map((customer) => (
                                <motion.div
                                    key={customer.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    className="bg-white/[0.04] rounded-xl border border-warm-cream/20 p-4 shadow-sm"
                                >
                                    <div className="flex items-center justify-between border-b border-warm-cream/10 pb-3 mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="relative h-10 w-10 rounded-full overflow-hidden bg-warm-cream/10 border border-warm-cream/20 flex-shrink-0">
                                                {customer.avatarUrl ? (
                                                    <Image src={customer.avatarUrl} alt={customer.fullName} fill className="object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-brand-green font-serif font-bold">
                                                        {(customer.fullName || customer.email || "?")[0].toUpperCase()}
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-medium text-warm-cream leading-tight">{customer.fullName || "Unnamed User"}</p>
                                                <p className="text-xs text-warm-cream/50">{customer.email}</p>
                                            </div>
                                        </div>
                                        <div>
                                            {customer.role === "admin" ? (
                                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-100 text-purple-700 border border-purple-200">
                                                    <Shield size={10} />
                                                    Admin
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-400 border border-emerald-500/20">
                                                    <User size={10} />
                                                    Customer
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div className="bg-warm-cream/5 rounded-lg p-2.5 border border-warm-cream/10">
                                            <p className="text-[10px] uppercase text-warm-cream/40 mb-1">Total Spent</p>
                                            <p className="font-medium text-warm-cream">{formatCurrency(customer.totalSpent)}</p>
                                        </div>
                                        <div className="bg-warm-cream/5 rounded-lg p-2.5 border border-warm-cream/10">
                                            <p className="text-[10px] uppercase text-warm-cream/40 mb-1">Orders</p>
                                            <p className="font-medium text-warm-cream flex flex-row items-center gap-1">
                                                <ShoppingBag size={12} className="text-warm-cream/40" />
                                                <span>{customer.orderCount}</span>
                                            </p>
                                        </div>
                                        <div className="bg-warm-cream/5 rounded-lg p-2.5 border border-warm-cream/10 col-span-2 flex justify-between items-center">
                                            <div>
                                                <p className="text-[10px] uppercase text-warm-cream/40 mb-0.5">Joined</p>
                                                <p className="text-xs text-warm-cream/70 font-medium">
                                                    {new Date(customer.createdAt).toLocaleDateString(undefined, {
                                                        month: 'short', day: 'numeric', year: 'numeric'
                                                    })}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0">
                                                <button className="p-1.5 hover:bg-white/[0.04] rounded-md text-warm-cream/60 hover:text-brand-green transition-colors border border-transparent hover:border-warm-cream/20 shadow-sm" title="Email Customer">
                                                    <Mail size={14} />
                                                </button>
                                                <button className="p-1.5 hover:bg-white/[0.04] rounded-md text-warm-cream/60 hover:text-brand-green transition-colors border border-transparent hover:border-warm-cream/20 shadow-sm" title="View Details">
                                                    <MoreVertical size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </AnimatePresence>
                </div>

                {/* Pagination (Visual Only for now) */}
                <div className="flex items-center justify-between mt-6 pt-6 border-t border-warm-cream/10 text-sm text-warm-cream/50">
                    <p>Showing 1 to {Math.min(filteredCustomers.length, 10)} of {filteredCustomers.length} results</p>
                    <div className="flex gap-2">
                        <button disabled className="px-3 py-1 rounded-md border border-warm-cream/20 opacity-50 cursor-not-allowed">Previous</button>
                        <button disabled className="px-3 py-1 rounded-md border border-warm-cream/20 opacity-50 cursor-not-allowed">Next</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function KpiCard({ label, value, icon: Icon, trend, subtext }: { label: string, value: string, icon: any, trend?: string, subtext?: string }) {
    return (
        <div className="glass-card p-5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity group-hover:scale-110 duration-500">
                <Icon size={48} className="text-brand-green" />
            </div>
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-brand-green/10 flex items-center justify-center text-brand-green">
                    <Icon size={20} />
                </div>
                {trend && (
                    <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        {trend}
                    </span>
                )}
            </div>
            <div>
                <p className="text-warm-cream/50 text-sm font-medium mb-1">{label}</p>
                <h3 className="text-2xl font-serif text-warm-cream">{value}</h3>
                {subtext && <p className="text-xs text-warm-cream/40 mt-1">{subtext}</p>}
            </div>
        </div>
    );
}
