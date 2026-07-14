"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Zap } from "lucide-react";

interface Props {
    title?: string;
    subtitle?: string;
    endsAt?: string; // ISO
    link?: string;
    bgColor?: string;
}

function diff(target: number) {
    const ms = Math.max(0, target - Date.now());
    return {
        d: Math.floor(ms / 86_400_000),
        h: Math.floor((ms % 86_400_000) / 3_600_000),
        m: Math.floor((ms % 3_600_000) / 60_000),
        s: Math.floor((ms % 60_000) / 1000),
        ms,
    };
}

function Unit({ value, label }: { value: number; label: string }) {
    return (
        <div className="flex flex-col items-center">
            <span className="font-mono font-bold text-lg sm:text-2xl tabular-nums leading-none">{String(value).padStart(2, "0")}</span>
            <span className="text-[9px] sm:text-[10px] uppercase tracking-wider opacity-70 mt-1">{label}</span>
        </div>
    );
}

export default function CountdownBanner({ title, subtitle, endsAt, link, bgColor }: Props) {
    const target = endsAt ? new Date(endsAt).getTime() : 0;
    const [t, setT] = useState(() => diff(target));
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (!target) return;
        const id = setInterval(() => setT(diff(target)), 1000);
        return () => clearInterval(id);
    }, [target]);

    // Don't render until mounted (avoids SSR/client time mismatch) or if expired/invalid.
    if (!mounted || !target || Number.isNaN(target) || t.ms <= 0) return null;

    const bg = bgColor || "#C0392B";

    const inner = (
        <div className="flex items-center justify-center gap-4 sm:gap-8 flex-wrap px-4 py-3 text-white">
            <div className="flex items-center gap-2 min-w-0">
                <Zap size={18} className="shrink-0 fill-white/90" />
                <div className="min-w-0">
                    <p className="font-bold text-sm sm:text-base leading-tight truncate">{title || "Flash Sale"}</p>
                    {subtitle && <p className="text-xs opacity-80 leading-tight truncate">{subtitle}</p>}
                </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
                {t.d > 0 && <><Unit value={t.d} label="Days" /><span className="font-bold text-lg sm:text-2xl opacity-40">:</span></>}
                <Unit value={t.h} label="Hrs" />
                <span className="font-bold text-lg sm:text-2xl opacity-40">:</span>
                <Unit value={t.m} label="Min" />
                <span className="font-bold text-lg sm:text-2xl opacity-40">:</span>
                <Unit value={t.s} label="Sec" />
            </div>
        </div>
    );

    return (
        <div style={{ backgroundColor: bg }} className="w-full">
            {link ? <Link href={link} className="block hover:opacity-95 transition-opacity">{inner}</Link> : inner}
        </div>
    );
}
