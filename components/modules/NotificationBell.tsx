"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { Bell, X, ShoppingBag, CreditCard, Package, AlertTriangle, Check } from "lucide-react";
import { useNotificationStore, type AdminNotification } from "@/lib/notificationStore";
import { formatCurrency } from "@/lib/formatCurrency";

const POLL_INTERVAL = 30000;

const typeConfig: Record<AdminNotification["type"], { icon: typeof Bell; color: string; bg: string }> = {
    new_order: { icon: ShoppingBag, color: "text-purple-600", bg: "bg-purple-50" },
    payment_submitted: { icon: CreditCard, color: "text-amber-600", bg: "bg-amber-50" },
    payment_confirmed: { icon: Check, color: "text-emerald-600", bg: "bg-emerald-50" },
    low_stock: { icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50" },
    order_status: { icon: Package, color: "text-blue-600", bg: "bg-blue-50" },
};

export default function NotificationBell() {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const bellRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const [mounted, setMounted] = useState(false);
    const { notifications, unreadCount, addNotification, markAllRead, markRead } = useNotificationStore();
    const seenOrderIds = useRef<Set<string>>(new Set());
    const lastPoll = useRef<string>(new Date().toISOString());
    const initialLoad = useRef(true);

    useEffect(() => { setMounted(true); }, []);

    if (!pathname?.startsWith("/admin")) return null;

    // Close when clicking outside
    useEffect(() => {
        if (!isOpen) return;
        const handleClick = (e: MouseEvent) => {
            const target = e.target as Node;
            if (
                panelRef.current && !panelRef.current.contains(target) &&
                bellRef.current && !bellRef.current.contains(target)
            ) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [isOpen]);

    // Poll for new orders
    const pollNotifications = useCallback(async () => {
        try {
            const res = await fetch(`/api/admin/notifications?since=${encodeURIComponent(lastPoll.current)}`);
            if (!res.ok) return;
            const data = await res.json();

            for (const order of data.recentOrders || []) {
                if (seenOrderIds.current.has(order.id)) continue;
                seenOrderIds.current.add(order.id);
                if (initialLoad.current) continue;

                addNotification({
                    type: "new_order",
                    title: "New Order!",
                    message: `${order.customerName} placed an order for ${formatCurrency(order.total)}`,
                    orderId: order.id,
                    timestamp: order.createdAt,
                });
                playNotificationSound();
            }

            for (const payment of data.pendingPayments || []) {
                if (seenOrderIds.current.has(`payment-${payment.id}`)) continue;
                seenOrderIds.current.add(`payment-${payment.id}`);
                if (initialLoad.current) continue;

                addNotification({
                    type: "payment_submitted",
                    title: "Payment Awaiting Approval",
                    message: `${payment.customerName} submitted payment of ${formatCurrency(payment.total)}${payment.senderName ? ` from ${payment.senderName}` : ""}`,
                    orderId: payment.id,
                    timestamp: new Date().toISOString(),
                });
                playNotificationSound();
            }

            for (const item of data.expiringStock || []) {
                const key = `expiring-${item.id}`;
                if (seenOrderIds.current.has(key)) continue;
                seenOrderIds.current.add(key);
                if (initialLoad.current) continue;

                const daysLeft = Math.ceil((new Date(item.expiryDate).getTime() - Date.now()) / 86400000);
                addNotification({
                    type: "low_stock",
                    title: "Expiring Stock",
                    message: `${item.name} (${item.stock} units) expires in ${daysLeft <= 0 ? "today" : `${daysLeft} day${daysLeft !== 1 ? "s" : ""}`}`,
                    timestamp: new Date().toISOString(),
                });
                playNotificationSound();
            }

            for (const item of data.lowStock || []) {
                const key = `lowstock-${item.id}`;
                if (seenOrderIds.current.has(key)) continue;
                seenOrderIds.current.add(key);
                if (initialLoad.current) continue;

                addNotification({
                    type: "low_stock",
                    title: "Low Stock Alert",
                    message: `${item.name} has only ${item.stock} units left (reorder level: ${item.reorderLevel})`,
                    timestamp: new Date().toISOString(),
                });
            }

            initialLoad.current = false;
            lastPoll.current = new Date().toISOString();
        } catch (err) {
            console.warn("Notification poll failed:", err);
        }
    }, [addNotification]);

    useEffect(() => {
        pollNotifications();
        const interval = setInterval(pollNotifications, POLL_INTERVAL);
        return () => clearInterval(interval);
    }, [pollNotifications]);

    return (
        <>
            <button
                ref={bellRef}
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Notifications"
            >
                <Bell size={20} className="text-white/70" />
                {unreadCount > 0 && (
                    <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm"
                    >
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </motion.span>
                )}
            </button>

            {/* Portal-rendered panel so it's never clipped by sidebar */}
            {mounted && isOpen && createPortal(
                <div className="fixed inset-0 z-[9999]">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/20"
                        onClick={() => setIsOpen(false)}
                    />
                    {/* Panel */}
                    <div
                        ref={panelRef}
                        className="absolute top-2 right-2 sm:top-4 sm:right-4 w-[calc(100vw-16px)] sm:w-[400px] max-h-[80vh] bg-white rounded-2xl shadow-2xl border border-brand-lilac/15 overflow-hidden flex flex-col"
                    >
                        {/* Header */}
                        <div className="px-5 py-4 border-b border-brand-lilac/10 flex items-center justify-between bg-brand-lilac/[0.02] shrink-0">
                            <div>
                                <h3 className="text-sm font-semibold text-brand-dark">Notifications</h3>
                                <p className="text-[10px] text-brand-dark/40 mt-0.5">
                                    {notifications.length === 0
                                        ? "No notifications yet"
                                        : `${notifications.length} notification${notifications.length !== 1 ? "s" : ""}`}
                                </p>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1.5 hover:bg-brand-lilac/10 rounded-lg transition-colors cursor-pointer"
                            >
                                <X size={16} className="text-brand-dark/40" />
                            </button>
                        </div>

                        {/* Notification List */}
                        <div className="overflow-y-auto flex-1">
                            {notifications.length === 0 ? (
                                <div className="py-16 text-center">
                                    <Bell size={36} className="mx-auto text-brand-dark/10 mb-3" />
                                    <p className="text-sm text-brand-dark/30">All quiet for now</p>
                                    <p className="text-[10px] text-brand-dark/20 mt-1">New orders will appear here in real-time</p>
                                </div>
                            ) : (
                                notifications.map((notif) => (
                                    <NotificationItem
                                        key={notif.id}
                                        notification={notif}
                                        onRead={() => markRead(notif.id)}
                                    />
                                ))
                            )}
                        </div>

                        {/* Footer */}
                        {notifications.length > 0 && (
                            <div className="px-5 py-3 border-t border-brand-lilac/10 bg-brand-lilac/[0.02] shrink-0">
                                <button
                                    onClick={() => markAllRead()}
                                    className="text-xs text-brand-purple hover:text-brand-purple/70 font-medium transition-colors cursor-pointer"
                                >
                                    Mark all as read
                                </button>
                            </div>
                        )}
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}

function NotificationItem({ notification, onRead }: { notification: AdminNotification; onRead: () => void }) {
    const config = typeConfig[notification.type];
    const Icon = config.icon;
    const timeAgo = getTimeAgo(notification.timestamp);

    return (
        <div
            className={`px-5 py-4 border-b border-brand-lilac/5 hover:bg-brand-lilac/[0.03] transition-colors cursor-pointer ${!notification.read ? "bg-brand-purple/[0.03]" : ""}`}
            onClick={onRead}
        >
            <div className="flex gap-3">
                <div className={`w-10 h-10 rounded-xl ${config.bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon size={18} className={config.color} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm leading-tight ${!notification.read ? "font-semibold text-brand-dark" : "text-brand-dark/70"}`}>
                            {notification.title}
                        </p>
                        {!notification.read && (
                            <span className="w-2 h-2 rounded-full bg-brand-purple flex-shrink-0 mt-1.5" />
                        )}
                    </div>
                    <p className="text-xs text-brand-dark/50 mt-1 leading-relaxed">
                        {notification.message}
                    </p>
                    <p className="text-[10px] text-brand-dark/25 mt-1.5">{timeAgo}</p>
                </div>
            </div>
        </div>
    );
}

function getTimeAgo(timestamp: string): string {
    const now = Date.now();
    const then = new Date(timestamp).getTime();
    const diff = now - then;

    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

function playNotificationSound() {
    try {
        const ctx = new AudioContext();
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.frequency.setValueAtTime(800, ctx.currentTime);
        oscillator.frequency.setValueAtTime(1000, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.3);
    } catch {
        // Audio not available
    }
}
