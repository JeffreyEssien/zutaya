"use client";

import { useState, useEffect } from "react";
import type { NewsletterSubscriber, NewsletterCampaign } from "@/types";
import {
    Mail, Users, Send, Plus, Trash2, Eye, Edit3, X,
    ChevronDown, ChevronUp, Search, RefreshCw, AlertCircle,
} from "lucide-react";

type Tab = "campaigns" | "subscribers";

const STATUS_STYLES: Record<string, string> = {
    draft: "bg-yellow-50 text-yellow-700 border-yellow-200",
    sending: "bg-blue-50 text-blue-700 border-blue-200",
    sent: "bg-brand-green/10 text-brand-green border-brand-green/20",
};

export default function AdminNewsletterPage() {
    const [tab, setTab] = useState<Tab>("campaigns");
    const [campaigns, setCampaigns] = useState<NewsletterCampaign[]>([]);
    const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    // Campaign editor state
    const [showEditor, setShowEditor] = useState(false);
    const [editingCampaign, setEditingCampaign] = useState<NewsletterCampaign | null>(null);
    const [subject, setSubject] = useState("");
    const [content, setContent] = useState("");
    const [saving, setSaving] = useState(false);
    const [sendingId, setSendingId] = useState<string | null>(null);

    // Preview state
    const [previewCampaign, setPreviewCampaign] = useState<NewsletterCampaign | null>(null);

    const fetchData = async () => {
        setLoading(true);
        const [campRes, subRes] = await Promise.all([
            fetch("/api/newsletter/campaigns"),
            fetch("/api/newsletter/campaigns?type=subscribers"),
        ]);
        if (campRes.ok) setCampaigns(await campRes.json());
        if (subRes.ok) setSubscribers(await subRes.json());
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const activeSubscribers = subscribers.filter((s) => !s.unsubscribedAt);
    const filteredSubscribers = subscribers.filter(
        (s) =>
            s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (s.firstName && s.firstName.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const openEditor = (campaign?: NewsletterCampaign) => {
        if (campaign) {
            setEditingCampaign(campaign);
            setSubject(campaign.subject);
            setContent(campaign.content);
        } else {
            setEditingCampaign(null);
            setSubject("");
            setContent("");
        }
        setShowEditor(true);
    };

    const saveCampaign = async () => {
        if (!subject.trim() || !content.trim()) return;
        setSaving(true);

        const body = editingCampaign
            ? { action: "update", id: editingCampaign.id, subject, content }
            : { action: "create", subject, content };

        const res = await fetch("/api/newsletter/campaigns", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        if (res.ok) {
            setShowEditor(false);
            setSubject("");
            setContent("");
            setEditingCampaign(null);
            fetchData();
        }
        setSaving(false);
    };

    const sendCampaign = async (campaign: NewsletterCampaign) => {
        if (activeSubscribers.length === 0) return;
        if (!confirm(`Send "${campaign.subject}" to ${activeSubscribers.length} subscribers?`)) return;

        setSendingId(campaign.id);
        await fetch("/api/newsletter/campaigns", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "send", id: campaign.id, subject: campaign.subject, content: campaign.content }),
        });
        setSendingId(null);
        fetchData();
    };

    const deleteCampaign = async (id: string) => {
        if (!confirm("Delete this campaign?")) return;
        await fetch("/api/newsletter/campaigns", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "delete", id }),
        });
        fetchData();
    };

    const deleteSubscriber = async (id: string) => {
        if (!confirm("Remove this subscriber?")) return;
        await fetch("/api/newsletter/campaigns", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "delete_subscriber", id }),
        });
        fetchData();
    };

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-red" />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-brand-black">Newsletter</h1>
                    <p className="text-sm text-muted-brown mt-1">Manage subscribers and email campaigns</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchData}
                        className="p-2 rounded-lg border border-warm-tan/20 text-muted-brown hover:bg-warm-cream transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw size={16} />
                    </button>
                    <button
                        onClick={() => openEditor()}
                        className="flex items-center gap-2 bg-brand-red text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-brand-red/90 transition-colors"
                    >
                        <Plus size={16} />
                        New Campaign
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <StatCard
                    label="Total Subscribers"
                    value={subscribers.length}
                    icon={<Users size={18} />}
                    color="text-brand-red"
                    bg="bg-brand-red/5"
                />
                <StatCard
                    label="Active"
                    value={activeSubscribers.length}
                    icon={<Mail size={18} />}
                    color="text-brand-green"
                    bg="bg-brand-green/5"
                />
                <StatCard
                    label="Campaigns"
                    value={campaigns.length}
                    icon={<Send size={18} />}
                    color="text-blue-600"
                    bg="bg-blue-50"
                />
                <StatCard
                    label="Emails Sent"
                    value={campaigns.reduce((s, c) => s + c.recipientCount, 0)}
                    icon={<Mail size={18} />}
                    color="text-warm-tan"
                    bg="bg-warm-tan/10"
                />
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-warm-cream rounded-lg p-1 mb-6 w-fit">
                {(["campaigns", "subscribers"] as Tab[]).map((t) => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                            tab === t
                                ? "bg-white text-brand-black shadow-sm"
                                : "text-muted-brown hover:text-brand-black"
                        }`}
                    >
                        {t === "campaigns" ? "Campaigns" : `Subscribers (${activeSubscribers.length})`}
                    </button>
                ))}
            </div>

            {/* ── Campaigns Tab ── */}
            {tab === "campaigns" && (
                <div className="space-y-4">
                    {campaigns.length === 0 ? (
                        <div className="bg-white rounded-xl border border-warm-tan/20 p-12 text-center">
                            <Mail size={40} className="mx-auto text-muted-brown/30 mb-3" />
                            <p className="text-muted-brown mb-4">No campaigns yet. Create your first one!</p>
                            <button
                                onClick={() => openEditor()}
                                className="bg-brand-red text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-brand-red/90 transition-colors"
                            >
                                Create Campaign
                            </button>
                        </div>
                    ) : (
                        campaigns.map((c) => (
                            <div
                                key={c.id}
                                className="bg-white rounded-xl border border-warm-tan/20 p-5 hover:shadow-sm transition-shadow"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="font-semibold text-brand-black truncate">
                                                {c.subject}
                                            </h3>
                                            <span
                                                className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLES[c.status]}`}
                                            >
                                                {c.status}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-4 text-xs text-muted-brown">
                                            <span>
                                                Created{" "}
                                                {new Date(c.createdAt).toLocaleDateString("en-NG", {
                                                    month: "short",
                                                    day: "numeric",
                                                    year: "numeric",
                                                })}
                                            </span>
                                            {c.sentAt && (
                                                <span>
                                                    Sent{" "}
                                                    {new Date(c.sentAt).toLocaleDateString("en-NG", {
                                                        month: "short",
                                                        day: "numeric",
                                                        year: "numeric",
                                                    })}
                                                </span>
                                            )}
                                            {c.recipientCount > 0 && (
                                                <span>{c.recipientCount} recipients</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            onClick={() => setPreviewCampaign(previewCampaign?.id === c.id ? null : c)}
                                            className="p-2 rounded-lg text-muted-brown hover:bg-warm-cream transition-colors"
                                            title="Preview"
                                        >
                                            <Eye size={16} />
                                        </button>
                                        {c.status === "draft" && (
                                            <>
                                                <button
                                                    onClick={() => openEditor(c)}
                                                    className="p-2 rounded-lg text-muted-brown hover:bg-warm-cream transition-colors"
                                                    title="Edit"
                                                >
                                                    <Edit3 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => sendCampaign(c)}
                                                    disabled={sendingId === c.id || activeSubscribers.length === 0}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-green text-white text-xs font-semibold hover:bg-brand-green/90 transition-colors disabled:opacity-50"
                                                >
                                                    {sendingId === c.id ? (
                                                        <RefreshCw size={14} className="animate-spin" />
                                                    ) : (
                                                        <Send size={14} />
                                                    )}
                                                    Send
                                                </button>
                                            </>
                                        )}
                                        <button
                                            onClick={() => deleteCampaign(c.id)}
                                            className="p-2 rounded-lg text-red-400 hover:bg-red-50 transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                {/* Preview Expand */}
                                {previewCampaign?.id === c.id && (
                                    <div className="mt-4 pt-4 border-t border-warm-tan/10">
                                        <div
                                            className="prose prose-sm max-w-none text-brand-black/80"
                                            dangerouslySetInnerHTML={{ __html: c.content }}
                                        />
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* ── Subscribers Tab ── */}
            {tab === "subscribers" && (
                <div>
                    {/* Search */}
                    <div className="relative mb-4">
                        <Search
                            size={16}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-brown/50"
                        />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by email or name..."
                            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-warm-tan/20 text-sm focus:outline-none focus:border-brand-red/40 bg-white"
                        />
                    </div>

                    <div className="bg-white rounded-xl border border-warm-tan/20 overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-warm-cream/50">
                                <tr>
                                    <th className="text-left px-4 py-3 font-medium text-muted-brown">Email</th>
                                    <th className="text-left px-4 py-3 font-medium text-muted-brown hidden sm:table-cell">Name</th>
                                    <th className="text-left px-4 py-3 font-medium text-muted-brown hidden md:table-cell">Source</th>
                                    <th className="text-left px-4 py-3 font-medium text-muted-brown">Status</th>
                                    <th className="text-left px-4 py-3 font-medium text-muted-brown hidden lg:table-cell">Subscribed</th>
                                    <th className="text-right px-4 py-3 font-medium text-muted-brown w-12"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredSubscribers.map((sub) => (
                                    <tr key={sub.id} className="border-t border-warm-tan/10 hover:bg-warm-cream/30 transition-colors">
                                        <td className="px-4 py-3 text-brand-black font-medium">{sub.email}</td>
                                        <td className="px-4 py-3 text-muted-brown hidden sm:table-cell">{sub.firstName || "—"}</td>
                                        <td className="px-4 py-3 hidden md:table-cell">
                                            <span className="px-2 py-0.5 rounded text-xs bg-warm-cream text-muted-brown">
                                                {sub.source}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            {sub.unsubscribedAt ? (
                                                <span className="px-2 py-0.5 rounded text-xs bg-red-50 text-red-500 font-medium">
                                                    Unsubscribed
                                                </span>
                                            ) : (
                                                <span className="px-2 py-0.5 rounded text-xs bg-brand-green/10 text-brand-green font-medium">
                                                    Active
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-muted-brown text-xs hidden lg:table-cell">
                                            {new Date(sub.subscribedAt).toLocaleDateString("en-NG", {
                                                month: "short",
                                                day: "numeric",
                                                year: "numeric",
                                            })}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                onClick={() => deleteSubscriber(sub.id)}
                                                className="p-1.5 rounded text-red-400 hover:bg-red-50 transition-colors"
                                                title="Remove"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredSubscribers.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-8 text-center text-muted-brown">
                                            {searchQuery ? "No subscribers match your search." : "No subscribers yet."}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── Campaign Editor Modal ── */}
            {showEditor && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        {/* Editor Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-warm-tan/10">
                            <h2 className="text-lg font-bold text-brand-black">
                                {editingCampaign ? "Edit Campaign" : "New Campaign"}
                            </h2>
                            <button
                                onClick={() => setShowEditor(false)}
                                className="p-2 rounded-lg text-muted-brown hover:bg-warm-cream transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Editor Body */}
                        <div className="p-6 space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-brand-black mb-1.5">
                                    Subject Line
                                </label>
                                <input
                                    type="text"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    placeholder="e.g. Fresh Weekend Deals Inside!"
                                    className="w-full border border-warm-tan/30 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-brand-red/40"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-brand-black mb-1.5">
                                    Content (HTML supported)
                                </label>
                                <textarea
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder="Write your newsletter content here... HTML is supported for rich formatting."
                                    rows={12}
                                    className="w-full border border-warm-tan/30 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-brand-red/40 font-mono leading-relaxed resize-y"
                                />
                                <p className="text-xs text-muted-brown mt-1.5">
                                    Tip: Use HTML tags like &lt;h2&gt;, &lt;p&gt;, &lt;strong&gt;, &lt;a href=&quot;...&quot;&gt; for rich formatting.
                                </p>
                            </div>

                            {/* Preview */}
                            {content && (
                                <div>
                                    <label className="block text-sm font-medium text-brand-black mb-1.5">
                                        Preview
                                    </label>
                                    <div className="border border-warm-tan/20 rounded-lg p-4 bg-warm-cream/30">
                                        <div
                                            className="prose prose-sm max-w-none text-brand-black/80"
                                            dangerouslySetInnerHTML={{ __html: content }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Editor Footer */}
                        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-warm-tan/10 bg-warm-cream/30 rounded-b-2xl">
                            <button
                                onClick={() => setShowEditor(false)}
                                className="px-4 py-2 rounded-lg text-sm text-muted-brown hover:bg-warm-cream transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={saveCampaign}
                                disabled={saving || !subject.trim() || !content.trim()}
                                className="flex items-center gap-2 bg-brand-red text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-brand-red/90 transition-colors disabled:opacity-50"
                            >
                                {saving ? (
                                    <RefreshCw size={14} className="animate-spin" />
                                ) : null}
                                {editingCampaign ? "Update" : "Save Draft"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function StatCard({
    label,
    value,
    icon,
    color,
    bg,
}: {
    label: string;
    value: number;
    icon: React.ReactNode;
    color: string;
    bg: string;
}) {
    return (
        <div className="bg-white rounded-xl border border-warm-tan/20 p-4">
            <div className="flex items-center justify-between mb-3">
                <span className={`p-2 rounded-lg ${bg} ${color}`}>{icon}</span>
            </div>
            <p className="text-2xl font-bold text-brand-black">{value.toLocaleString()}</p>
            <p className="text-xs text-muted-brown mt-0.5">{label}</p>
        </div>
    );
}
