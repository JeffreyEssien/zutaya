"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { NAV_LINKS, SITE_NAME } from "@/lib/constants";
import { useCartStore } from "@/lib/cartStore";
import CartDrawer from "@/components/modules/CartDrawer";
import { useState, useEffect, useRef } from "react";
import { getSiteSettings } from "@/lib/queries";
import type { SiteSettings } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, ShoppingBag, Menu } from "lucide-react";
import ScrollProgress from "@/components/ui/ScrollProgress";
import { formatCurrency } from "@/lib/formatCurrency";

export default function Header() {
    const { totalItems, toggle } = useCartStore();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [settings, setSettings] = useState<SiteSettings | null>(null);
    const [mounted, setMounted] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const count = totalItems();
    const router = useRouter();
    const searchRef = useRef<HTMLInputElement>(null);

    // Live search state
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        setMounted(true);
        getSiteSettings().then(setSettings).catch(() => { });
    }, []);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    useEffect(() => {
        if (searchOpen && searchRef.current) searchRef.current.focus();
    }, [searchOpen]);

    // Debounced live search
    useEffect(() => {
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        if (searchQuery.trim().length < 2) {
            setSearchResults([]);
            return;
        }
        setSearchLoading(true);
        searchTimeoutRef.current = setTimeout(async () => {
            try {
                const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery.trim())}`);
                const data = await res.json();
                setSearchResults(data.results || []);
            } catch {
                setSearchResults([]);
            }
            setSearchLoading(false);
        }, 300);
        return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
    }, [searchQuery]);

    // Lock body scroll when mobile menu is open
    useEffect(() => {
        if (mobileOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => { document.body.style.overflow = ""; };
    }, [mobileOpen]);

    const displayName = settings?.siteName || SITE_NAME;

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const q = searchQuery.trim();
        if (!q) return;
        router.push(`/shop?q=${encodeURIComponent(q)}`);
        setSearchOpen(false);
        setSearchQuery("");
        setSearchResults([]);
    };

    const handleResultClick = (slug: string) => {
        router.push(`/product/${slug}`);
        setSearchOpen(false);
        setSearchQuery("");
        setSearchResults([]);
    };

    return (
        <>
            <ScrollProgress />
            <header
                className={`sticky top-0 z-50 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${scrolled
                    ? "glass-panel shadow-sm"
                    : "bg-transparent"
                    }`}
            >
                <nav className={`relative mx-auto max-w-7xl px-6 flex items-center justify-between transition-all duration-500 ${scrolled ? "h-16" : "h-20"}`}>
                    {/* Logo */}
                    <Link href="/" className="font-serif text-2xl tracking-widest text-brand-dark flex items-center gap-2 hover:opacity-80 transition-opacity">
                        {settings?.logoUrl ? (
                            <div className="relative h-8 w-auto aspect-[3/1]">
                                <Image
                                    src={settings.logoUrl}
                                    alt={displayName}
                                    fill
                                    className="object-contain object-left"
                                    sizes="120px"
                                />
                            </div>
                        ) : (
                            <span className="relative">
                                {displayName}
                                <span className="absolute -bottom-1 left-0 w-0 group-hover:w-full h-px bg-brand-purple transition-all duration-500" />
                            </span>
                        )}
                    </Link>

                    {/* Desktop Nav — centered absolutely */}
                    <ul className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
                        {NAV_LINKS.map((link) => (
                            <li key={link.href}>
                                <Link
                                    href={link.href}
                                    className="group relative text-sm font-sans text-brand-dark/70 hover:text-brand-dark transition-colors duration-300 py-2"
                                >
                                    {link.label}
                                    <span className="absolute -bottom-0.5 left-0 w-full h-[1.5px] bg-brand-purple origin-left scale-x-0 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100" />
                                </Link>
                            </li>
                        ))}
                    </ul>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                        {/* Search */}
                        <AnimatePresence mode="wait">
                            {searchOpen ? (
                                <motion.form
                                    key="search-form"
                                    initial={{ width: 0, opacity: 0 }}
                                    animate={{ width: "auto", opacity: 1 }}
                                    exit={{ width: 0, opacity: 0 }}
                                    transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                                    onSubmit={handleSearch}
                                    className="flex items-center gap-1 overflow-hidden"
                                >
                                    <input
                                        ref={searchRef}
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search products..."
                                        className="w-36 sm:w-48 border border-brand-lilac/30 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-purple/20 focus:border-brand-purple/40 bg-white/80 backdrop-blur-sm transition-all"
                                        onBlur={() => { if (!searchQuery) setSearchOpen(false); }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => { setSearchOpen(false); setSearchQuery(""); setSearchResults([]); }}
                                        className="p-2 text-brand-dark/40 hover:text-brand-dark rounded-full hover:bg-brand-lilac/10 transition-colors cursor-pointer"
                                        aria-label="Close search"
                                    >
                                        <X size={16} />
                                    </button>

                                    {/* Live search results dropdown */}
                                    <AnimatePresence>
                                        {searchOpen && searchQuery.trim().length >= 2 && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -8 }}
                                                transition={{ duration: 0.2 }}
                                                className="absolute top-full right-0 mt-2 w-72 sm:w-80 bg-white rounded-2xl shadow-2xl border border-brand-lilac/10 overflow-hidden z-50"
                                            >
                                                {searchLoading ? (
                                                    <div className="p-4 space-y-3">
                                                        {[1, 2, 3].map((i) => (
                                                            <div key={i} className="flex gap-3 animate-pulse">
                                                                <div className="w-11 h-14 rounded-lg bg-neutral-100 shimmer-bg" />
                                                                <div className="flex-1 space-y-1.5 py-1">
                                                                    <div className="h-3 bg-neutral-100 rounded-full w-3/4 shimmer-bg" />
                                                                    <div className="h-2.5 bg-neutral-100 rounded-full w-1/2 shimmer-bg" />
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : searchResults.length > 0 ? (
                                                    <div>
                                                        <div className="max-h-72 overflow-y-auto">
                                                            {searchResults.map((item) => (
                                                                <button
                                                                    type="button"
                                                                    key={item.id}
                                                                    onClick={() => handleResultClick(item.slug)}
                                                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-brand-lilac/5 transition-colors cursor-pointer text-left"
                                                                >
                                                                    <div className="relative w-11 h-14 rounded-lg overflow-hidden bg-neutral-50 flex-shrink-0">
                                                                        {item.image && (
                                                                            <Image
                                                                                src={item.image}
                                                                                alt={item.name}
                                                                                fill
                                                                                sizes="44px"
                                                                                className="object-cover"
                                                                            />
                                                                        )}
                                                                    </div>
                                                                    <div className="min-w-0 flex-1">
                                                                        <p className="text-sm font-medium text-brand-dark truncate">{item.name}</p>
                                                                        <p className="text-xs text-brand-dark/40">{item.category}</p>
                                                                        <p className="text-xs font-semibold text-brand-purple mt-0.5">{formatCurrency(item.price)}</p>
                                                                    </div>
                                                                </button>
                                                            ))}
                                                        </div>
                                                        <button
                                                            type="submit"
                                                            className="w-full px-4 py-2.5 border-t border-brand-lilac/10 text-xs text-brand-purple hover:bg-brand-lilac/5 transition-colors cursor-pointer font-medium"
                                                        >
                                                            Search for &ldquo;{searchQuery}&rdquo; →
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="p-6 text-center">
                                                        <p className="text-sm text-brand-dark/40">No products found</p>
                                                        <button
                                                            type="submit"
                                                            className="mt-2 text-xs text-brand-purple hover:underline cursor-pointer"
                                                        >
                                                            Browse all products →
                                                        </button>
                                                    </div>
                                                )}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.form>
                            ) : (
                                <motion.button
                                    key="search-btn"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    type="button"
                                    onClick={() => setSearchOpen(true)}
                                    className="p-2.5 text-brand-dark/60 hover:text-brand-purple rounded-full hover:bg-brand-lilac/10 transition-all duration-300 cursor-pointer"
                                    aria-label="Search"
                                >
                                    <Search size={18} strokeWidth={1.5} />
                                </motion.button>
                            )}
                        </AnimatePresence>

                        {/* Cart */}
                        <button
                            type="button"
                            onClick={toggle}
                            className="relative p-2.5 text-brand-dark/60 hover:text-brand-purple rounded-full hover:bg-brand-lilac/10 transition-all duration-300 cursor-pointer"
                            aria-label="Open cart"
                        >
                            <ShoppingBag size={18} strokeWidth={1.5} />
                            <AnimatePresence>
                                {mounted && count > 0 && (
                                    <motion.span
                                        key={count}
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        exit={{ scale: 0 }}
                                        transition={{ type: "spring", stiffness: 500, damping: 25 }}
                                        className="absolute -top-0.5 -right-0.5 h-4.5 w-4.5 rounded-full bg-brand-purple text-white text-[10px] font-bold flex items-center justify-center shadow-lg shadow-brand-purple/30"
                                    >
                                        {count}
                                    </motion.span>
                                )}
                            </AnimatePresence>
                        </button>

                        {/* Mobile Menu Toggle */}
                        <button
                            type="button"
                            onClick={() => setMobileOpen(!mobileOpen)}
                            className="md:hidden p-2.5 text-brand-dark/60 hover:text-brand-purple rounded-full hover:bg-brand-lilac/10 transition-all cursor-pointer"
                            aria-label={mobileOpen ? "Close menu" : "Open menu"}
                        >
                            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
                        </button>
                    </div>
                </nav>
            </header>

            {/* Mobile Menu Overlay */}
            <AnimatePresence>
                {mobileOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            onClick={() => setMobileOpen(false)}
                            className="fixed inset-0 z-[45] bg-black/20 backdrop-blur-sm md:hidden"
                        />
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                            className="fixed top-0 left-0 right-0 z-[46] bg-white pt-24 pb-8 px-8 md:hidden shadow-2xl border-b border-brand-lilac/15"
                        >
                            <nav>
                                <ul className="space-y-1">
                                    {NAV_LINKS.map((link, i) => (
                                        <motion.li
                                            key={link.href}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: 0.05 + i * 0.08, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                                        >
                                            <Link
                                                href={link.href}
                                                onClick={() => setMobileOpen(false)}
                                                className="block py-3 text-2xl font-serif text-brand-dark/80 hover:text-brand-purple transition-colors"
                                            >
                                                {link.label}
                                            </Link>
                                        </motion.li>
                                    ))}
                                </ul>
                            </nav>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.3 }}
                                className="mt-8 pt-6 border-t border-brand-lilac/15"
                            >
                                <p className="text-xs text-brand-dark/30 uppercase tracking-[0.25em]">
                                    {displayName} — Premium Meat Delivery
                                </p>
                            </motion.div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <CartDrawer />
        </>
    );
}
