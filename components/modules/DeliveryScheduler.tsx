"use client";

import { useState } from "react";
import { Calendar, Clock } from "lucide-react";

interface DeliverySchedulerProps {
    onSelect: (deliveryDate: string) => void;
    selectedDate?: string;
    cutoffHour?: number;
}

function getNextSevenDays(startOffset = 0): { date: string; label: string; dayName: string }[] {
    const days: { date: string; label: string; dayName: string }[] = [];
    const today = new Date();

    for (let i = startOffset; i <= startOffset + 6; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        const iso = d.toISOString().slice(0, 10);
        const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
        const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        days.push({ date: iso, label, dayName });
    }

    return days;
}

export default function DeliveryScheduler({ onSelect, selectedDate, cutoffHour = 12 }: DeliverySchedulerProps) {
    // Past the daily 12pm cutoff, same-day delivery is no longer possible — the
    // earliest selectable date becomes tomorrow.
    const cutoffPassed = new Date().getHours() >= cutoffHour;
    const [dates] = useState(() => getNextSevenDays(cutoffPassed ? 1 : 0));
    const [pickedDate, setPickedDate] = useState(selectedDate || "");

    const handleDateClick = (date: string) => {
        setPickedDate(date);
        onSelect(date);
    };

    return (
        <div className="space-y-4">
            {/* Cutoff notice — always shown so the 12pm rule is clear */}
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs leading-relaxed">
                <Clock size={14} className="mt-0.5 shrink-0" />
                {cutoffPassed ? (
                    <span>
                        It's past today's <strong>12pm cutoff</strong> — orders now are delivered from tomorrow.
                    </span>
                ) : (
                    <span>
                        Order before <strong>12pm</strong> for same-day delivery. Orders placed after 12pm are
                        delivered the next day.
                    </span>
                )}
            </div>

            {/* Date Picker */}
            <div>
                <div className="flex items-center gap-2 mb-3">
                    <Calendar size={16} className="text-brand-green" />
                    <h4 className="text-sm font-semibold text-warm-cream">Delivery Date</h4>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                    {dates.map((d) => (
                        <button
                            key={d.date}
                            type="button"
                            onClick={() => handleDateClick(d.date)}
                            className={`flex flex-col items-center py-3 px-2 rounded-xl border text-center transition-all cursor-pointer ${
                                pickedDate === d.date
                                    ? "border-brand-green bg-brand-green/5 text-warm-cream"
                                    : "border-warm-cream/10 hover:border-warm-cream/20 text-warm-cream/40"
                            }`}
                        >
                            <span className="text-[10px] uppercase tracking-wider font-medium">{d.dayName}</span>
                            <span className="text-sm font-semibold mt-0.5">{d.label}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
