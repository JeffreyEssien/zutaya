"use client";

import { motion } from "framer-motion";
import { ChefHat, Calendar } from "lucide-react";
import type { CompletionMode } from "@/types";

interface Props {
    selected: CompletionMode;
    onSelect: (mode: CompletionMode) => void;
    eventsEnabled?: boolean;
}

export default function EatModeSelector({ selected, onSelect, eventsEnabled = true }: Props) {
    const allOptions: { key: CompletionMode; label: string; sub: string; icon: React.ElementType; enabled: boolean }[] = [
        { key: "cook_myself", label: "Cook it myself", sub: "Raw & processed your way", icon: ChefHat, enabled: true },
        { key: "event", label: "At my event", sub: "Chef comes to you", icon: Calendar, enabled: eventsEnabled },
    ];
    const options = allOptions.filter((o) => o.enabled);

    return (
        <div className="mb-6">
            <label className="block text-[10px] font-semibold text-warm-cream/40 uppercase tracking-[0.2em] mb-3">
                How will you eat it?
            </label>
            <div className={`grid gap-2 ${options.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                {options.map((opt) => {
                    const Icon = opt.icon;
                    const isActive = selected === opt.key;
                    return (
                        <motion.button
                            key={opt.key}
                            type="button"
                            onClick={() => onSelect(opt.key)}
                            whileTap={{ scale: 0.97 }}
                            className={`relative flex flex-col items-center text-center p-3 rounded-xl border transition-all cursor-pointer ${
                                isActive
                                    ? "bg-brand-green/15 border-brand-green/50"
                                    : "bg-warm-cream/5 border-warm-cream/8 hover:border-warm-cream/20"
                            }`}
                        >
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-1.5 ${
                                isActive ? "bg-brand-green text-white" : "bg-warm-cream/10 text-warm-cream/70"
                            }`}>
                                <Icon size={16} />
                            </div>
                            <p className={`text-xs font-semibold ${isActive ? "text-warm-cream" : "text-warm-cream/80"}`}>{opt.label}</p>
                            <p className="text-[10px] text-warm-cream/40 mt-0.5 leading-tight">{opt.sub}</p>
                            {isActive && <motion.span layoutId="mode-dot" className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-brand-green" />}
                        </motion.button>
                    );
                })}
            </div>
        </div>
    );
}
