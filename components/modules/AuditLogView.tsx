"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import {
    Shield, RefreshCw, Search, LogIn, LogOut, Edit3, Trash2,
    Plus, Package, CreditCard, Eye, User, Clock, ChevronDown,
    ChevronRight, Download, Calendar, Activity, AlertTriangle,
    Settings, X, ArrowUpDown,
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

type SortField = "created_at" | "action" | "admin_name";
type SortDir = "asc" | "desc";

const ACTION_CONFIG: Record<string, { icon: typeof Shield; color: string; bg: string; border: string; label: string }> = {
    login: { icon: LogIn, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200", label: "Signed In" },
    logout: { icon: LogOut, color: "text-slate-500", bg: "bg-slate-50", border: "border-slate-200", label: "Signed Out" },
    create: { icon: Plus, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200", label: "Created" },
    update: { icon: Edit3, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", label: "Updated" },
    delete: { icon: Trash2, color: "text-red-600", bg: "bg-red-50", border: "border-red-200", label: "Deleted" },
    status_change: { icon: Package, color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200", label: "Status Changed" },
    payment_update: { icon: CreditCard, color: "text-teal-600", bg: "bg-teal-50", border: "border-teal-200", label: "Payment Updated" },
    view: { icon: Eye, color: "text-gray-500", bg: "bg-gray-50", border: "border-gray-200", label: "Viewed" },
    settings: { icon: Settings, color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-200", label: "Settings" },
};

function getActionConfig(action: string) {
    return ACTION_CONFIG[action] || { icon: Shield, color: "text-brand-dark/50", bg: "bg-brand-dark/5", border: "border-brand-dark/10", label: action };
}

function formatRelativeTime(dateStr: string) {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    return date.toLocaleDateString("en-NG", { month: "short", day: "numeric" });
}

const ITEMS_PER_PAGE = 50;

export default function AuditLogView({ initialLogs }: { initialLogs: AuditLog[] }) {
    const router = useRouter();
    const [logs] = useState<AuditLog[]>(initialLogs);
    const [search, setSearch] = useState("");
    const [filterAction, setFilterAction] = useState("");
    const [filterAdmin, setFilterAdmin] = useState("");
    const [dateRange, setDateRange] = useState<"all" | "today" | "week" | "month">("all");
    const [sortField, setSortField] = useState<SortField>("created_at");
    const [sortDir, setSortDir] = useState<SortDir>("desc");
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [refreshing, setRefreshing] = useState(false);

    const uniqueActions = useMemo(() => [...new Set(logs.map((l) => l.action))].sort(), [logs]);
    const uniqueAdmins = useMemo(() => [...new Set(logs.map((l) => l.admin_email))].sort(), [logs]);

    const activeFilters = [filterAction, filterAdmin, dateRange !== "all" ? dateRange : "", search].filter(Boolean).length;

    const filtered = useMemo(() => {
        const now = new Date();
        return logs
            .filter((log) => {
                if (filterAction && log.action !== filterAction) return false;
                if (filterAdmin && log.admin_email !== filterAdmin) return false;
                if (dateRange !== "all") {
                    const logDate = new Date(log.created_at);
                    if (dateRange === "today" && logDate.toDateString() !== now.toDateString()) return false;
                    if (dateRange === "week" && now.getTime() - logDate.getTime() > 7 * 86400000) return false;
                    if (dateRange === "month" && now.getTime() - logDate.getTime() > 30 * 86400000) return false;
                }
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
            })
            .sort((a, b) => {
                const dir = sortDir === "asc" ? 1 : -1;
                if (sortField === "created_at") return dir * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
                if (sortField === "action") return dir * a.action.localeCompare(b.action);
                return dir * a.admin_name.localeCompare(b.admin_name);
            });
    }, [logs, search, filterAction, filterAdmin, dateRange, sortField, sortDir]);

    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
    const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

    // Group paginated results by date
    const grouped = useMemo(() => {
        const map = new Map<string, AuditLog[]>();
        for (const log of paginated) {
            const day = new Date(log.created_at).toLocaleDateString("en-NG", {
                weekday: "long", year: "numeric", month: "long", day: "numeric",
            });
            if (!map.has(day)) map.set(day, []);
            map.get(day)!.push(log);
        }
        return map;
    }, [paginated]);

    // Stats
    const stats = useMemo(() => {
        const now = new Date();
        const today = logs.filter((l) => new Date(l.created_at).toDateString() === now.toDateString());
        const actionCounts = new Map<string, number>();
        for (const l of logs) actionCounts.set(l.action, (actionCounts.get(l.action) || 0) + 1);
        const topAction = [...actionCounts.entries()].sort((a, b) => b[1] - a[1])[0];
        const uniqueAdminCount = new Set(logs.map((l) => l.admin_email)).size;

        return { todayCount: today.length, total: logs.length, topAction, uniqueAdminCount };
    }, [logs]);

    const clearFilters = useCallback(() => {
        setSearch("");
        setFilterAction("");
        setFilterAdmin("");
        setDateRange("all");
        setPage(1);
    }, []);

    const handleRefresh = useCallback(() => {
        setRefreshing(true);
        router.refresh();
        setTimeout(() => setRefreshing(false), 1000);
    }, [router]);

    const toggleSort = useCallback((field: SortField) => {
        if (sortField === field) {
            setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        } else {
            setSortField(field);
            setSortDir("desc");
        }
    }, [sortField]);

    const exportCSV = useCallback(() => {
        const headers = ["Timestamp", "Admin", "Email", "Action", "Entity Type", "Entity ID", "Details", "IP Address"];
        const rows = filtered.map((l) => [
            new Date(l.created_at).toISOString(),
            l.admin_name,
            l.admin_email,
            l.action,
            l.entity_type || "",
            l.entity_id || "",
            (l.details || "").replace(/,/g, ";"),
            l.ip_address || "",
        ]);
        const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }, [filtered]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-serif text-brand-dark flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-brand-dark to-brand-dark/80 rounded-xl flex items-center justify-center shadow-lg shadow-brand-dark/10">
                            <Shield size={20} className="text-white" />
                        </div>
                        Audit Log
                    </h1>
                    <p className="text-sm text-brand-dark/40 mt-1.5 ml-[52px]">
                        Immutable record of all admin activity
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={exportCSV}>
                        <span className="flex items-center gap-2"><Download size={13} /> Export</span>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={refreshing}>
                        <span className="flex items-center gap-2">
                            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
                            Refresh
                        </span>
                    </Button>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard icon={Activity} label="Total Events" value={stats.total} color="text-brand-dark" bg="bg-brand-dark/5" />
                <StatCard icon={Clock} label="Today" value={stats.todayCount} color="text-emerald-600" bg="bg-emerald-50" />
                <StatCard icon={User} label="Active Admins" value={stats.uniqueAdminCount} color="text-blue-600" bg="bg-blue-50" />
                <StatCard
                    icon={AlertTriangle}
                    label="Top Action"
                    value={stats.topAction ? `${getActionConfig(stats.topAction[0]).label} (${stats.topAction[1]})` : "—"}
                    color="text-amber-600"
                    bg="bg-amber-50"
                />
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl border border-brand-dark/[0.06] p-4 space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-dark/25" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            placeholder="Search by name, email, action, details..."
                            className="w-full pl-10 pr-4 py-2.5 border border-brand-dark/[0.08] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-dark/10 focus:border-brand-dark/20 bg-brand-dark/[0.02] placeholder:text-brand-dark/25"
                        />
                        {search && (
                            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-dark/25 hover:text-brand-dark/50">
                                <X size={14} />
                            </button>
                        )}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <select
                            value={filterAction}
                            onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}
                            className="px-3 py-2.5 border border-brand-dark/[0.08] rounded-xl text-sm bg-brand-dark/[0.02] appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-dark/10 min-w-[130px]"
                        >
                            <option value="">All Actions</option>
                            {uniqueActions.map((a) => (
                                <option key={a} value={a}>{getActionConfig(a).label}</option>
                            ))}
                        </select>
                        <select
                            value={filterAdmin}
                            onChange={(e) => { setFilterAdmin(e.target.value); setPage(1); }}
                            className="px-3 py-2.5 border border-brand-dark/[0.08] rounded-xl text-sm bg-brand-dark/[0.02] appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-dark/10 min-w-[130px]"
                        >
                            <option value="">All Admins</option>
                            {uniqueAdmins.map((a) => (
                                <option key={a} value={a}>{a}</option>
                            ))}
                        </select>
                        <select
                            value={dateRange}
                            onChange={(e) => { setDateRange(e.target.value as typeof dateRange); setPage(1); }}
                            className="px-3 py-2.5 border border-brand-dark/[0.08] rounded-xl text-sm bg-brand-dark/[0.02] appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-dark/10 min-w-[120px]"
                        >
                            <option value="all">All Time</option>
                            <option value="today">Today</option>
                            <option value="week">Last 7 days</option>
                            <option value="month">Last 30 days</option>
                        </select>
                    </div>
                </div>

                {/* Active filters + sort */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                        {activeFilters > 0 && (
                            <>
                                <span className="text-xs text-brand-dark/40">{filtered.length} of {logs.length} results</span>
                                <button onClick={clearFilters} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1">
                                    <X size={10} /> Clear filters
                                </button>
                            </>
                        )}
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="text-[10px] text-brand-dark/30 uppercase tracking-wider mr-1">Sort:</span>
                        {(["created_at", "action", "admin_name"] as SortField[]).map((field) => (
                            <button
                                key={field}
                                onClick={() => toggleSort(field)}
                                className={`text-[11px] px-2 py-1 rounded-lg transition-colors ${
                                    sortField === field
                                        ? "bg-brand-dark text-white"
                                        : "text-brand-dark/40 hover:bg-brand-dark/5"
                                }`}
                            >
                                {field === "created_at" ? "Time" : field === "action" ? "Action" : "Admin"}
                                {sortField === field && (
                                    <ArrowUpDown size={9} className="inline ml-1" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Timeline */}
            {filtered.length === 0 ? (
                <div className="bg-white rounded-2xl border border-brand-dark/[0.06] p-20 text-center">
                    <div className="w-16 h-16 bg-brand-dark/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Shield size={28} className="text-brand-dark/15" />
                    </div>
                    <p className="text-brand-dark/40 text-sm font-medium">No logs match your filters</p>
                    <p className="text-brand-dark/25 text-xs mt-1">Try adjusting your search or filter criteria</p>
                    {activeFilters > 0 && (
                        <Button variant="ghost" size="sm" onClick={clearFilters} className="mt-4">
                            Clear all filters
                        </Button>
                    )}
                </div>
            ) : (
                <div className="space-y-6">
                    {Array.from(grouped.entries()).map(([day, dayLogs]) => (
                        <div key={day}>
                            <div className="flex items-center gap-3 mb-3 sticky top-0 bg-neutral-50/95 backdrop-blur-sm py-2 z-10">
                                <Calendar size={13} className="text-brand-dark/30" />
                                <h2 className="text-xs font-semibold text-brand-dark/50 uppercase tracking-wider">{day}</h2>
                                <div className="h-px flex-1 bg-brand-dark/[0.06]" />
                                <span className="text-[10px] text-brand-dark/30 tabular-nums">{dayLogs.length} event{dayLogs.length !== 1 ? "s" : ""}</span>
                            </div>

                            {/* Timeline connector */}
                            <div className="relative ml-[19px]">
                                <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-brand-dark/10 via-brand-dark/5 to-transparent" />
                                <div className="space-y-1.5 pl-7">
                                    {dayLogs.map((log) => (
                                        <LogEntry
                                            key={log.id}
                                            log={log}
                                            expanded={expandedId === log.id}
                                            onToggle={() => setExpandedId(expandedId === log.id ? null : log.id)}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between bg-white rounded-2xl border border-brand-dark/[0.06] px-5 py-3">
                            <span className="text-xs text-brand-dark/40">
                                Page {page} of {totalPages} ({filtered.length} entries)
                            </span>
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="px-3 py-1.5 text-xs rounded-lg border border-brand-dark/[0.08] disabled:opacity-30 hover:bg-brand-dark/5 transition-colors"
                                >
                                    Previous
                                </button>
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    let pageNum: number;
                                    if (totalPages <= 5) pageNum = i + 1;
                                    else if (page <= 3) pageNum = i + 1;
                                    else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
                                    else pageNum = page - 2 + i;
                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => setPage(pageNum)}
                                            className={`w-8 h-8 text-xs rounded-lg transition-colors ${
                                                page === pageNum
                                                    ? "bg-brand-dark text-white"
                                                    : "hover:bg-brand-dark/5 text-brand-dark/50"
                                            }`}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}
                                <button
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="px-3 py-1.5 text-xs rounded-lg border border-brand-dark/[0.08] disabled:opacity-30 hover:bg-brand-dark/5 transition-colors"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

/* ─── Stat Card ──────────────────────────────────────────────────── */

function StatCard({ icon: Icon, label, value, color, bg }: {
    icon: typeof Shield;
    label: string;
    value: string | number;
    color: string;
    bg: string;
}) {
    return (
        <div className="bg-white rounded-2xl border border-brand-dark/[0.06] p-4 hover:shadow-md hover:shadow-brand-dark/[0.03] transition-shadow">
            <div className="flex items-center gap-3">
                <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center shrink-0`}>
                    <Icon size={16} className={color} />
                </div>
                <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-brand-dark/35 font-medium">{label}</p>
                    <p className="text-lg font-semibold text-brand-dark truncate">{value}</p>
                </div>
            </div>
        </div>
    );
}

/* ─── Log Entry ──────────────────────────────────────────────────── */

function LogEntry({ log, expanded, onToggle }: { log: AuditLog; expanded: boolean; onToggle: () => void }) {
    const config = getActionConfig(log.action);
    const Icon = config.icon;
    const time = new Date(log.created_at).toLocaleTimeString("en-NG", {
        hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
    const relative = formatRelativeTime(log.created_at);

    return (
        <div className="relative">
            {/* Timeline dot */}
            <div className={`absolute -left-7 top-3.5 w-2.5 h-2.5 rounded-full border-2 border-white ${config.bg} ring-1 ${config.border}`} />

            <div
                onClick={onToggle}
                className={`bg-white rounded-xl border transition-all cursor-pointer group ${
                    expanded
                        ? "border-brand-dark/15 shadow-md shadow-brand-dark/[0.04]"
                        : "border-brand-dark/[0.06] hover:border-brand-dark/10 hover:shadow-sm hover:shadow-brand-dark/[0.02]"
                }`}
            >
                <div className="px-4 py-3 flex items-center gap-3">
                    {/* Icon */}
                    <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center shrink-0`}>
                        <Icon size={14} className={config.color} />
                    </div>

                    {/* Main content */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-brand-dark">{log.admin_name}</span>
                            <Badge variant={
                                log.action === "delete" ? "danger"
                                    : log.action === "login" ? "success"
                                    : log.action === "create" ? "info"
                                    : "warning"
                            }>
                                {config.label}
                            </Badge>
                            {log.entity_type && (
                                <span className="text-xs text-brand-dark/35 font-medium">
                                    {log.entity_type}
                                    {log.entity_id && <span className="text-brand-dark/25 font-mono"> #{log.entity_id.slice(0, 8)}</span>}
                                </span>
                            )}
                        </div>
                        {log.details && !expanded && (
                            <p className="text-xs text-brand-dark/40 mt-0.5 truncate max-w-md">{log.details}</p>
                        )}
                    </div>

                    {/* Right side */}
                    <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right hidden sm:block">
                            <p className="text-[10px] text-brand-dark/30 font-mono">{time}</p>
                            <p className="text-[10px] text-brand-dark/20">{relative}</p>
                        </div>
                        <div className="text-brand-dark/20 group-hover:text-brand-dark/40 transition-colors">
                            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </div>
                    </div>
                </div>

                {/* Expanded details */}
                {expanded && (
                    <div className="border-t border-brand-dark/[0.06] px-4 py-3 bg-brand-dark/[0.01] rounded-b-xl">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <DetailRow label="Admin" value={`${log.admin_name} (${log.admin_email})`} />
                            <DetailRow label="Action" value={config.label} />
                            <DetailRow label="Timestamp" value={new Date(log.created_at).toLocaleString("en-NG", {
                                year: "numeric", month: "long", day: "numeric",
                                hour: "2-digit", minute: "2-digit", second: "2-digit",
                            })} />
                            {log.ip_address && <DetailRow label="IP Address" value={log.ip_address} mono />}
                            {log.entity_type && <DetailRow label="Entity Type" value={log.entity_type} />}
                            {log.entity_id && <DetailRow label="Entity ID" value={log.entity_id} mono />}
                        </div>
                        {log.details && (
                            <div className="mt-3 pt-3 border-t border-brand-dark/[0.04]">
                                <p className="text-[10px] text-brand-dark/30 uppercase tracking-wider font-medium mb-1">Details</p>
                                <p className="text-xs text-brand-dark/60 leading-relaxed whitespace-pre-wrap">{log.details}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
    return (
        <div>
            <p className="text-[10px] text-brand-dark/30 uppercase tracking-wider font-medium">{label}</p>
            <p className={`text-xs text-brand-dark/70 mt-0.5 ${mono ? "font-mono" : ""}`}>{value}</p>
        </div>
    );
}
