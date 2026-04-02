"use client";

import { useState, useEffect } from "react";
import { Calendar, Clock } from "lucide-react";

interface DeliverySchedulerProps {
    onSelect: (deliveryDate: string, deliverySlot: "morning" | "afternoon" | "evening") => void;
    selectedDate?: string;
    selectedSlot?: "morning" | "afternoon" | "evening";
}

interface SlotAvailability {
    morning: boolean;
    afternoon: boolean;
    evening: boolean;
}

const SLOT_LABELS: Record<string, { label: string; time: string }> = {
    morning:   { label: "Morning",   time: "8am – 12pm" },
    afternoon: { label: "Afternoon", time: "12pm – 4pm" },
    evening:   { label: "Evening",   time: "4pm – 7pm" },
};

function getNextSevenDays(): { date: string; label: string; dayName: string }[] {
    const days: { date: string; label: string; dayName: string }[] = [];
    const today = new Date();

    for (let i = 1; i <= 7; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        const iso = d.toISOString().slice(0, 10);
        const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
        const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        days.push({ date: iso, label, dayName });
    }

    return days;
}

export default function DeliveryScheduler({ onSelect, selectedDate, selectedSlot }: DeliverySchedulerProps) {
    const [dates] = useState(getNextSevenDays);
    const [pickedDate, setPickedDate] = useState(selectedDate || "");
    const [pickedSlot, setPickedSlot] = useState<"morning" | "afternoon" | "evening" | "">(selectedSlot || "");
    const [availability, setAvailability] = useState<SlotAvailability | null>(null);
    const [loadingSlots, setLoadingSlots] = useState(false);

    useEffect(() => {
        if (!pickedDate) {
            setAvailability(null);
            return;
        }

        setLoadingSlots(true);
        setPickedSlot("");
        fetch(`/api/delivery/availability?date=${pickedDate}`)
            .then((res) => res.json())
            .then((data: SlotAvailability) => {
                setAvailability(data);
            })
            .catch(() => {
                // If API doesn't exist yet, treat all as available
                setAvailability({ morning: true, afternoon: true, evening: true });
            })
            .finally(() => setLoadingSlots(false));
    }, [pickedDate]);

    const handleSlotClick = (slot: "morning" | "afternoon" | "evening") => {
        if (!availability?.[slot]) return;
        setPickedSlot(slot);
        onSelect(pickedDate, slot);
    };

    return (
        <div className="space-y-5">
            {/* Date Picker */}
            <div>
                <div className="flex items-center gap-2 mb-3">
                    <Calendar size={16} className="text-brand-red" />
                    <h4 className="text-sm font-semibold text-brand-dark">Delivery Date</h4>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                    {dates.map((d) => (
                        <button
                            key={d.date}
                            type="button"
                            onClick={() => setPickedDate(d.date)}
                            className={`flex flex-col items-center py-3 px-2 rounded-xl border text-center transition-all cursor-pointer ${
                                pickedDate === d.date
                                    ? "border-brand-red bg-brand-red/5 text-brand-dark"
                                    : "border-warm-tan/15 hover:border-warm-tan/40 text-muted-brown"
                            }`}
                        >
                            <span className="text-[10px] uppercase tracking-wider font-medium">{d.dayName}</span>
                            <span className="text-sm font-semibold mt-0.5">{d.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Slot Picker */}
            {pickedDate && (
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <Clock size={16} className="text-brand-red" />
                        <h4 className="text-sm font-semibold text-brand-dark">Delivery Slot</h4>
                    </div>

                    {loadingSlots ? (
                        <div className="flex gap-3">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex-1 h-20 rounded-xl shimmer-bg" />
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 gap-3">
                            {(Object.keys(SLOT_LABELS) as Array<"morning" | "afternoon" | "evening">).map((slot) => {
                                const isAvailable = availability?.[slot] ?? true;
                                const isSelected = pickedSlot === slot;

                                return (
                                    <button
                                        key={slot}
                                        type="button"
                                        onClick={() => handleSlotClick(slot)}
                                        disabled={!isAvailable}
                                        className={`flex flex-col items-center py-4 px-3 rounded-xl border text-center transition-all ${
                                            !isAvailable
                                                ? "border-brand-dark/5 bg-brand-dark/[0.02] text-brand-dark/20 cursor-not-allowed"
                                                : isSelected
                                                  ? "border-brand-red bg-brand-red/5 text-brand-dark cursor-pointer"
                                                  : "border-warm-tan/15 hover:border-warm-tan/40 text-muted-brown cursor-pointer"
                                        }`}
                                    >
                                        <span className="text-sm font-semibold">{SLOT_LABELS[slot].label}</span>
                                        <span className="text-[11px] mt-1 opacity-70">{SLOT_LABELS[slot].time}</span>
                                        {!isAvailable && (
                                            <span className="text-[10px] mt-1 text-brand-red/50 font-medium">Full</span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
