"use client";

import { Star } from "lucide-react";
import { useState } from "react";

/** Read-only star display. Supports half-fill via fractional `value`. */
export function StarRating({ value, size = 16, className = "" }: { value: number; size?: number; className?: string }) {
    return (
        <div className={`inline-flex items-center gap-0.5 ${className}`} aria-label={`${value} out of 5 stars`}>
            {[1, 2, 3, 4, 5].map((i) => {
                const fill = Math.max(0, Math.min(1, value - (i - 1))); // 0..1 for this star
                return (
                    <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
                        <Star size={size} className="absolute inset-0 text-warm-cream/25" strokeWidth={1.5} />
                        {fill > 0 && (
                            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                                <Star size={size} className="text-gold-accent fill-gold-accent" strokeWidth={1.5} />
                            </span>
                        )}
                    </span>
                );
            })}
        </div>
    );
}

/** Interactive star picker for the review form. */
export function StarInput({ value, onChange, size = 28 }: { value: number; onChange: (v: number) => void; size?: number }) {
    const [hover, setHover] = useState(0);
    const shown = hover || value;
    return (
        <div className="inline-flex items-center gap-1" onMouseLeave={() => setHover(0)}>
            {[1, 2, 3, 4, 5].map((i) => (
                <button
                    key={i}
                    type="button"
                    onClick={() => onChange(i)}
                    onMouseEnter={() => setHover(i)}
                    aria-label={`${i} star${i > 1 ? "s" : ""}`}
                    className="cursor-pointer p-0.5"
                >
                    <Star
                        size={size}
                        strokeWidth={1.5}
                        className={i <= shown ? "text-gold-accent fill-gold-accent" : "text-warm-cream/30"}
                    />
                </button>
            ))}
        </div>
    );
}
