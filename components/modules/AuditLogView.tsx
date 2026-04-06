"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import {
    Shield, RefreshCw, Search, LogIn, LogOut, Edit3, Trash2,
    Plus, Package, CreditCard, Eye, Filter, User, Clock,
} from "lucide-react";

interface AuditLog {
    id: string;
    admin_id: string;
    admin_email: string;
    admin_name: string;
    action: string;
    entity_type: string | null;
    entity_id: string | null;
    details: string | null;
    ip_address: string | null;
    created_at: string;
}

const ACTION_CONFIG: Record<string, { icon: typeof Shield; color: string; bg: string; label: string }> = {
    login: { icon: LogIn, color: "text-emerald-600", bg: "bg-emerald-50", label: "Signed In" },
    logout: { icon: LogOut, color: "text-slate-500", bg: "bg-slate-50", label: "Signed Out" },
    create: { icon: Plus, color: "text-blue-600", bg: "bg-blue-50", label: "Created" },
    update: { icon: Edit3, color: "text-amber-600", bg: "bg-amber-50", label: "Updated" },
    delete: { icon: Trash2, color: "text-red-600", bg: "bg-red-50", label: "Deleted" },
    status_change: { icon: Package, color: "text-purple-600", bg: "bg-purple-50", label: "Status Changed" },
    payment_update: { icon: CreditCard, color: "text-teal-600", bg: "bg-teal-50", label: "Payment Updated" },
    view: { icon: Eye, color: "text-gray-500", bg: "bg-gray-50", label: "Viewed" },
};

function getActionConfig(action: string) {
    return ACTION_CONFIG[action] || { icon: Shield, color: "text-brand-dark/50", bg: "bg-brand-lilac/10", label: action };
}

export default function AuditLogView({ initialLogs }: { initialLogs: AuditLog[] }) {
    const router = useRouter();
    const [logs] = useState<AuditLog[]>(initialLogs);
    const [search, setSearch] = useState("");
    const [filterAction, setFilterAction] = useState("");
    const [filterAdmin, setFilterAdmin] = useState("");

    const uniqueActions = useMemo(() => [...new Set(logs.map((l) => l.action))].sort(), [logs]);
    const uniqueAdmins = useMemo(() => [...new Set(logs.map((l) => l.admin_email))].sort(), [logs]);

    const filtered = useMemo(() => {
        return logs.filter((log) => {
            if (filterAction && log.action !== filterAction) return false;
            if (filterAdmin && log.admin_email !== filterAdmin) return false;
            if (search) {
                const q = search.toLowerCase();
                return (
                    log.admin_name.toLowerCase().includes(q) ||
                    log.admin_email.toLowerCase().includes(q) ||
                    log.action.toLowerCase().includes(q) ||
                    (log.details || "").toLowerCase().includes(q) ||
                    (log.entity_type || "").toLowerCase().includes(q) ||
                    (log.entity_id || "").toLowerCase().includes(q)
                );
            }
            return true;
        });
    }, [logs, search, filterAction, filterAdmin]);

    // Group by date
    const grouped = useMemo(() => {
        const map = new Map<string, AuditLog[]>();
        for (const log of filtered) {
            const day = new Date(log.created_at).toLocaleDateString("en-NG", {
                weekday: "long", year: "numeric", month: "long", day: "numeric",
            });
            if (!map.has(day)) map.set(day, []);
            map.get(day)!.push(log);
        }
        return map;
    }, [filtered]);

    const totalToday = logs.filter((l) => {
        const d = new Date(l.created_at);
        const now = new Date();
        return d.toDateString() === now.toDateString();
    }).length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-serif text-brand-dark flex items-center gap-3">
                        <Shield size={28} className="text-brand-purple" />
                        Audit Log
                    </h1>
                    <p className="text-sm text-brand-dark/40 mt-1">
                        Immutable record of all admin actions — {logs.length} entries, {totalToday} today
                    </p>
                </div>
                <Button variant="ghost" onClick={() => router.refresh()}>
                    <span className="flex items-center gap-2"><RefreshCw size={14} /> Refresh</span>
                </Button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-dark/25" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search logs..."
                        className="w-full pl-9 pr-4 py-2.5 border border-brand-lilac/20 rounded-xl text-sm focus:outline-none focus:border-brand-purple/40 bg-white"
                    />
                </div>
                <div className="flex gap-2">
                    <div className="relative">
                        <Filter size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-dark/25" />
                        <select
                            value={filterAction}
                            onChange={(e) => setFilterAction(e.target.value)}
                            className="pl-8 pr-8 py-2.5 border border-brand-lilac/20 rounded-xl text-sm bg-white appearance-none cursor-pointer focus:outline-none focus:border-brand-purple/40"
                        >
                            <option value="">All Actions</option>
                            {uniqueActions.map((a) => (
                                <option key={a} value={a}>{getActionConfig(a).label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="relative">
                        <User size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-dark/25" />
                        <select
                            value={filterAdmin}
                            onChange={(e) => setFilterAdmin(e.target.value)}
                            className="pl-8 pr-8 py-2.5 border border-brand-lilac/20 rounded-xl text-sm bg-white appearance-none cursor-pointer focus:outline-none focus:border-brand-purple/40"
                        >
                            <option value="">All Admins</option>
                            {uniqueAdmins.map((a) => (
                                <option key={a} value={a}>{a}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Timeline */}
            {filtered.length === 0 ? (
                <div className="bg-white rounded-xl border border-brand-lilac/15 p-16 text-center">
                    <Shield size={40} className="mx-auto mb-3 text-brand-dark/10" />
                    <p className="text-brand-dark/40 text-sm">No audit logs found</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {Array.from(grouped.entries()).map(([day, dayLogs]) => (
                        <div key={day}>
                            <div className="flex items-center gap-3 mb-3">
                                <Clock size={13} className="text-brand-dark/30" />
                                <h2 className="text-xs font-semibold text-brand-dark/40 uppercase tracking-wider">{day}</h2>
                                <span className="text-[10px] text-brand-dark/20 bg-brand-lilac/10 px-2 py-0.5 rounded-full">{dayLogs.length}</span>
                            </div>
                            <div className="space-y-1">
                                {dayLogs.map((log) => (
                                    <LogEntry key={log.id} log={log} />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function LogEntry({ log }: { log: AuditLog }) {
    const config = getActionConfig(log.action);
    const Icon = config.icon;
    const time = new Date(log.created_at).toLocaleTimeString("en-NG", {
        hour: "2-digit", minute: "2-digit", second: "2-digit",
    });

    return (
        <div className="flex items-start gap-3 bg-white rounded-xl border border-brand-lilac/10 px-4 py-3 hover:border-brand-lilac/20 transition-colors">
            <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                <Icon size={14} className={config.color} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-brand-dark">{log.admin_name}</span>
                        <Badge variant={log.action === "login" || log.action === "logout" ? "info" : "warning"}>
                            {config.label}
                        </Badge>
                        {log.entity_type && (
                            <span className="text-xs text-brand-dark/40">
                                {log.entity_type}{log.entity_id ? ` #${log.entity_id.slice(0, 8)}` : ""}
                            </span>
                        )}
                    </div>
                    <span className="text-[10px] text-brand-dark/25 font-mono shrink-0">{time}</span>
                </div>
                {log.details && (
                    <p className="text-xs text-brand-dark/50 mt-1 leading-relaxed">{log.details}</p>
                )}
                <div className="flex items-center gap-3 mt-1.5 text-[10px] text-brand-dark/20">
                    <span>{log.admin_email}</span>
                    {log.ip_address && <span>IP: {log.ip_address}</span>}
                </div>
            </div>
        </div>
    );
}
