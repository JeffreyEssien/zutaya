"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Clock, RefreshCw, Play, CheckCircle, XCircle, SkipForward, Package, Truck, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface CronLog {
    id: string;
    job_name: string;
    status: "success" | "error" | "skipped";
    details: string | null;
    items_processed: number;
    ran_at: string;
}

const JOB_CONFIG = [
    {
        key: "subscription_renewals",
        label: "Subscription Renewals",
        desc: "Processes due subscriptions, creates orders, advances next date",
        schedule: "Daily at 7:00 AM",
        endpoint: "/api/cron/subscriptions",
        icon: Package,
        color: "text-brand-purple",
        bg: "bg-brand-purple/8",
    },
    {
        key: "delivery_reminders",
        label: "Delivery Reminders",
        desc: "Emails customers with orders currently out for delivery",
        schedule: "Daily at 9:00 AM",
        endpoint: "/api/cron/delivery-reminders",
        icon: Truck,
        color: "text-emerald-600",
        bg: "bg-emerald-50",
    },
    {
        key: "expiry_sweep",
        label: "Inventory Sweep",
        desc: "Flags low-stock items and sends admin alert email",
        schedule: "Daily at 6:00 AM",
        endpoint: "/api/cron/expiry-sweep",
        icon: AlertTriangle,
        color: "text-amber-600",
        bg: "bg-amber-50",
    },
] as const;

const statusConfig = {
    success: { icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50", variant: "success" as const },
    error: { icon: XCircle, color: "text-red-600", bg: "bg-red-50", variant: "danger" as const },
    skipped: { icon: SkipForward, color: "text-amber-600", bg: "bg-amber-50", variant: "warning" as const },
};

export default function CronDashboard({ initialLogs }: { initialLogs: CronLog[] }) {
    const router = useRouter();
    const [logs, setLogs] = useState<CronLog[]>(initialLogs);
    const [running, setRunning] = useState<string | null>(null);

    const triggerJob = async (endpoint: string, jobKey: string) => {
        setRunning(jobKey);
        try {
            const res = await fetch(endpoint);
            const data = await res.json();
            if (res.ok) {
                toast.success(`Job completed`, { description: JSON.stringify(data) });
            } else {
                toast.error("Job failed", { description: data.error || "Unknown error" });
            }
            router.refresh();
            // Re-fetch logs
            const logsRes = await fetch("/api/admin/cron-logs");
            if (logsRes.ok) {
                const { logs: newLogs } = await logsRes.json();
                if (newLogs) setLogs(newLogs);
            }
        } catch {
            toast.error("Failed to trigger job");
        } finally {
            setRunning(null);
        }
    };

    const getLastRun = (jobKey: string) => logs.find((l) => l.job_name === jobKey);

    const successCount = logs.filter((l) => l.status === "success").length;
    const errorCount = logs.filter((l) => l.status === "error").length;
    const totalProcessed = logs.reduce((s, l) => s + l.items_processed, 0);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-serif text-brand-dark flex items-center gap-3">
                        <Clock size={28} className="text-brand-purple" />
                        Scheduled Jobs
                    </h1>
                    <p className="text-sm text-brand-dark/50 mt-1">Automated tasks powered by Vercel Cron</p>
                </div>
                <Button variant="ghost" onClick={() => router.refresh()}>
                    <span className="flex items-center gap-2"><RefreshCw size={14} /> Refresh</span>
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard label="Total Runs" value={logs.length} />
                <StatCard label="Successful" value={successCount} accent="text-emerald-600" />
                <StatCard label="Errors" value={errorCount} accent="text-red-500" />
                <StatCard label="Items Processed" value={totalProcessed} accent="text-brand-purple" />
            </div>

            {/* Job Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {JOB_CONFIG.map((job) => {
                    const Icon = job.icon;
                    const lastRun = getLastRun(job.key);
                    const lastStatus = lastRun ? statusConfig[lastRun.status] : null;
                    const LastIcon = lastStatus?.icon;
                    const isRunning = running === job.key;

                    return (
                        <div key={job.key} className="bg-white rounded-xl border border-brand-lilac/15 p-5 shadow-sm space-y-4">
                            <div className="flex items-start gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${job.bg}`}>
                                    <Icon size={18} className={job.color} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-brand-dark text-sm">{job.label}</h3>
                                    <p className="text-xs text-brand-dark/40 mt-0.5">{job.desc}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 text-xs text-brand-dark/40">
                                <Clock size={11} />
                                <span>{job.schedule}</span>
                            </div>

                            {lastRun && (
                                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${lastStatus?.bg}`}>
                                    {LastIcon && <LastIcon size={13} className={lastStatus?.color} />}
                                    <span className={`text-xs font-medium ${lastStatus?.color}`}>
                                        {lastRun.status === "success" ? "Last run succeeded" : lastRun.status === "error" ? "Last run failed" : "Last run skipped"}
                                    </span>
                                    <span className="text-[10px] text-brand-dark/30 ml-auto">
                                        {new Date(lastRun.ran_at).toLocaleString("en-NG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                                    </span>
                                </div>
                            )}

                            {lastRun?.details && (
                                <p className="text-[11px] text-brand-dark/40 leading-relaxed line-clamp-2">{lastRun.details}</p>
                            )}

                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => triggerJob(job.endpoint, job.key)}
                                loading={isRunning}
                                className="w-full"
                            >
                                <span className="flex items-center gap-1.5">
                                    <Play size={12} />
                                    Run Now
                                </span>
                            </Button>
                        </div>
                    );
                })}
            </div>

            {/* Logs Table */}
            <div>
                <h2 className="font-serif text-lg text-brand-dark mb-3">Execution History</h2>
                {logs.length === 0 ? (
                    <div className="bg-white rounded-xl border border-brand-lilac/15 p-12 text-center">
                        <Clock size={32} className="mx-auto mb-3 text-brand-dark/15" />
                        <p className="text-brand-dark/40 text-sm">No cron jobs have run yet. They'll execute on schedule or you can trigger them manually.</p>
                    </div>
                ) : (
                    <>
                        {/* Desktop */}
                        <div className="hidden md:block bg-white rounded-xl border border-brand-lilac/15 overflow-hidden">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-brand-lilac/10 bg-brand-lilac/[0.03]">
                                        <th className="text-left px-4 py-3 text-[10px] font-semibold text-brand-dark/40 uppercase tracking-wider">Job</th>
                                        <th className="text-left px-4 py-3 text-[10px] font-semibold text-brand-dark/40 uppercase tracking-wider">Status</th>
                                        <th className="text-left px-4 py-3 text-[10px] font-semibold text-brand-dark/40 uppercase tracking-wider">Details</th>
                                        <th className="text-center px-4 py-3 text-[10px] font-semibold text-brand-dark/40 uppercase tracking-wider">Processed</th>
                                        <th className="text-right px-4 py-3 text-[10px] font-semibold text-brand-dark/40 uppercase tracking-wider">Time</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-brand-lilac/5">
                                    {logs.map((log) => {
                                        const cfg = statusConfig[log.status];
                                        const job = JOB_CONFIG.find((j) => j.key === log.job_name);
                                        return (
                                            <tr key={log.id} className="hover:bg-brand-lilac/[0.03]">
                                                <td className="px-4 py-3 font-medium text-brand-dark">{job?.label || log.job_name}</td>
                                                <td className="px-4 py-3"><Badge variant={cfg.variant}>{log.status}</Badge></td>
                                                <td className="px-4 py-3 text-brand-dark/50 text-xs max-w-xs truncate">{log.details || "—"}</td>
                                                <td className="px-4 py-3 text-center text-brand-dark/60 font-mono">{log.items_processed}</td>
                                                <td className="px-4 py-3 text-right text-brand-dark/40 text-xs">
                                                    {new Date(log.ran_at).toLocaleString("en-NG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile */}
                        <div className="md:hidden space-y-2">
                            {logs.map((log) => {
                                const cfg = statusConfig[log.status];
                                const job = JOB_CONFIG.find((j) => j.key === log.job_name);
                                const StatusIcon = cfg.icon;
                                return (
                                    <div key={log.id} className="bg-white rounded-lg border border-brand-lilac/15 p-4 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium text-sm text-brand-dark">{job?.label || log.job_name}</span>
                                            <Badge variant={cfg.variant}>{log.status}</Badge>
                                        </div>
                                        {log.details && <p className="text-xs text-brand-dark/40 line-clamp-2">{log.details}</p>}
                                        <div className="flex items-center justify-between text-[10px] text-brand-dark/30">
                                            <span>{log.items_processed} processed</span>
                                            <span>{new Date(log.ran_at).toLocaleString("en-NG", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
    return (
        <div className="bg-white rounded-xl border border-brand-lilac/15 p-4 text-center">
            <p className={`text-2xl font-bold ${accent || "text-brand-dark"}`}>{value}</p>
            <p className="text-[10px] text-brand-dark/40 uppercase tracking-wider mt-1">{label}</p>
        </div>
    );
}
