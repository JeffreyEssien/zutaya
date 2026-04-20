"use client";

import { useState } from "react";
import type { PrepOption } from "@/types";
import { formatCurrency } from "@/lib/formatCurrency";

interface PrepOptionsSelectorProps {
    options: PrepOption[];
    selected: PrepOption[];
    onChange: (selected: PrepOption[]) => void;
}

export default function PrepOptionsSelector({ options, selected, onChange }: PrepOptionsSelectorProps) {
    const totalFee = selected.reduce((sum, opt) => sum + opt.extraFee, 0);

    const toggle = (option: PrepOption) => {
        const isSelected = selected.some((s) => s.id === option.id);
        if (isSelected) {
            onChange(selected.filter((s) => s.id !== option.id));
        } else {
            onChange([...selected, option]);
        }
    };

    if (!options || options.length === 0) return null;

    return (
        <div className="space-y-3">
            <h4 className="text-sm font-semibold text-warm-cream">Prep Options</h4>
            <div className="space-y-2">
                {options.map((option) => {
                    const isChecked = selected.some((s) => s.id === option.id);
                    return (
                        <label
                            key={option.id}
                            className={`flex items-center justify-between px-4 py-3 rounded-xl border cursor-pointer transition-all ${
                                isChecked
                                    ? "border-brand-red/30 bg-brand-red/5"
                                    : "border-warm-cream/20 hover:border-warm-cream/40"
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => toggle(option)}
                                    className="w-4 h-4 rounded border-warm-cream/30 text-brand-red focus:ring-brand-red/20"
                                />
                                <span className="text-sm text-warm-cream">{option.label}</span>
                            </div>
                            <span className="text-sm text-warm-cream/40 font-medium">
                                +{formatCurrency(option.extraFee)}
                            </span>
                        </label>
                    );
                })}
            </div>
            {totalFee > 0 && (
                <p className="text-sm font-medium text-brand-red">
                    Prep fee: {formatCurrency(totalFee)}
                </p>
            )}
        </div>
    );
}
