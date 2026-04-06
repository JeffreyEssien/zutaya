"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { ADMIN_NAV_LINKS, SITE_NAME } from "@/lib/constants";
import { cn } from "@/lib/cn";
import NotificationBell from "@/components/modules/NotificationBell";
import {
    LayoutGrid, Package, ClipboardList, Tag, Users, BarChart3,
    FileText, Box, Ticket, Settings, Truck, Mail, RefreshCw, Gift, Clock, LogOut, Shield
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function AdminSidebar() {
    const pathname = usePathname();
    const [open, setOpen] = useState(false);

    // Close drawer on route change
    useEffect(() => {
        setOpen(false);
    }, [pathname]);

    // Lock body scroll when drawer is open
    useEffect(() => {
        if (open) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => { document.body.style.overflow = ""; };
    }, [open]);

    return (
        <>
            {/* ── Mobile Top Bar ── */}
            <header className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between bg-brand-dark px-4 py-3 lg:hidden">
                <Link href="/admin" className="font-serif text-lg text-white tracking-widest">
                    {SITE_NAME}
                </Link>
                <div className="flex items-center gap-2">
                    <NotificationBell />
                    <button
                        type="button"
                        onClick={() => setOpen(true)}
                        className="text-white/80 hover:text-white p-1 cursor-pointer"
                        aria-label="Open menu"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                        </svg>
                    </button>
                </div>
            </header>

            {/* ── Mobile Drawer Overlay ── */}
            {open && (
                <div
                    className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm lg:hidden"
                    onClick={() => setOpen(false)}
                />
            )}

            {/* ── Mobile Drawer ── */}
            <aside
                className={cn(
                    "fixed top-0 left-0 z-50 flex flex-col w-72 h-full bg-brand-dark transition-transform duration-300 ease-in-out lg:hidden",
                    open ? "translate-x-0" : "-translate-x-full",
                )}
            >
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                    <Link href="/admin" className="font-serif text-xl text-white tracking-widest">
                        {SITE_NAME}
                    </Link>
                    <button
                        type="button"
                        onClick={() => setOpen(false)}
                        className="text-white/60 hover:text-white cursor-pointer"
                        aria-label="Close menu"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <p className="text-xs text-white/40 px-6 pt-3">Admin Panel</p>
                <nav className="flex-1 px-4 py-4">
                    <NavLinks pathname={pathname} />
                </nav>
                <SidebarFooter />
            </aside>

            {/* ── Desktop Sidebar ── */}
            <aside className="hidden lg:flex flex-col w-60 shrink-0 bg-brand-dark min-h-screen">
                <div className="px-6 py-6 border-b border-white/10">
                    <div className="flex items-center justify-between">
                        <Link href="/admin" className="font-serif text-xl text-white tracking-widest">
                            {SITE_NAME}
                        </Link>
                        <NotificationBell />
                    </div>
                    <p className="text-xs text-white/40 mt-1">Admin Panel</p>
                </div>
                <nav className="flex-1 px-4 py-6">
                    <NavLinks pathname={pathname} />
                </nav>
                <SidebarFooter />
            </aside>
        </>
    );
}

function NavLinks({ pathname }: { pathname: string }) {
    return (
        <ul className="space-y-1">
            {ADMIN_NAV_LINKS.map((link) => {
                const active = pathname === link.href;
                return (
                    <li key={link.href}>
                        <Link
                            href={link.href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors relative",
                                active ? "bg-brand-purple text-white" : "text-white/60 hover:text-white hover:bg-white/5",
                            )}
                        >
                            {active && (
                                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-white rounded-full" />
                            )}
                            <NavIcon name={link.icon} />
                            {link.label}
                        </Link>
                    </li>
                );
            })}
        </ul>
    );
}

function SidebarFooter() {
    const router = useRouter();
    const [loggingOut, setLoggingOut] = useState(false);

    const handleLogout = async () => {
        setLoggingOut(true);
        try {
            await fetch("/api/admin/logout", { method: "POST" });
            router.push("/admin/login");
            router.refresh();
        } catch {
            setLoggingOut(false);
        }
    };

    return (
        <div className="px-4 py-4 border-t border-white/10 space-y-2">
            <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-xs text-red-400/80 hover:text-red-300 hover:bg-red-500/10 transition-colors cursor-pointer disabled:opacity-50"
            >
                <LogOut size={14} />
                {loggingOut ? "Signing out..." : "Sign Out"}
            </button>
            <Link href="/" className="flex items-center gap-2 px-3 py-1 text-xs text-white/30 hover:text-white/60 transition-colors">
                ← Back to Store
            </Link>
        </div>
    );
}

const ICON_MAP: Record<string, React.ElementType> = {
    grid: LayoutGrid,
    package: Package,
    clipboard: ClipboardList,
    tag: Tag,
    users: Users,
    chart: BarChart3,
    file: FileText,
    box: Box,
    ticket: Ticket,
    truck: Truck,
    mail: Mail,
    refresh: RefreshCw,
    gift: Gift,
    clock: Clock,
    shield: Shield,
    cog: Settings,
};

function NavIcon({ name }: { name: string }) {
    const Icon = ICON_MAP[name];
    if (!Icon) return <span className="w-4 h-4" />;
    return <Icon size={16} />;
}

