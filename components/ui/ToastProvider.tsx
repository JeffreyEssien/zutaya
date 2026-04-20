"use client";

import { Toaster } from "sonner";

export default function ToastProvider() {
    return (
        <Toaster
            position="bottom-right"
            gap={8}
            toastOptions={{
                duration: 3000,
                classNames: {
                    toast: "bg-[#222] border border-warm-cream/15 shadow-xl rounded-xl text-warm-cream font-sans",
                    title: "text-sm font-semibold",
                    description: "text-xs text-warm-cream/50",
                    actionButton: "bg-brand-green text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-brand-dark transition-colors",
                    cancelButton: "bg-warm-cream/5 text-warm-cream/70 px-3 py-1.5 rounded-lg text-xs font-medium",
                    success: "border-emerald-200/40",
                    error: "border-red-200/40",
                },
            }}
        />
    );
}
