"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { WHATSAPP_NUMBER } from "@/lib/constants";
import { MessageCircle, X } from "lucide-react";

export default function WhatsAppFloat() {
    const pathname = usePathname();
    const [showTooltip, setShowTooltip] = useState(false);
    const [hasScrolled, setHasScrolled] = useState(false);

    // Don't show on admin pages
    if (pathname?.startsWith("/admin")) return null;

    useEffect(() => {
        const handleScroll = () => setHasScrolled(window.scrollY > 300);
        window.addEventListener("scroll", handleScroll);
        // Show tooltip after 5 seconds
        const timer = setTimeout(() => setShowTooltip(true), 5000);
        const hideTimer = setTimeout(() => setShowTooltip(false), 12000);
        return () => {
            window.removeEventListener("scroll", handleScroll);
            clearTimeout(timer);
            clearTimeout(hideTimer);
        };
    }, []);

    const openChat = () => {
        const message = encodeURIComponent(
            "Hi! 👋 I'm browsing your store and I have a question."
        );
        window.open(
            `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`,
            "_blank"
        );
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex items-end gap-3">
            {/* Tooltip bubble */}
            <AnimatePresence>
                {showTooltip && (
                    <motion.div
                        initial={{ opacity: 0, x: 10, scale: 0.9 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 10, scale: 0.9 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        className="bg-[#222] rounded-2xl shadow-xl border border-warm-cream/15 p-4 max-w-[220px] relative"
                    >
                        <button
                            onClick={() => setShowTooltip(false)}
                            className="absolute top-2 right-2 text-warm-cream/20 hover:text-warm-cream/50 transition-colors cursor-pointer"
                        >
                            <X size={12} />
                        </button>
                        <p className="text-xs text-warm-cream/70 leading-relaxed">
                            👋 <span className="font-semibold text-warm-cream">Need help?</span>
                            <br />Chat with us on WhatsApp!
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* WhatsApp FAB */}
            <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 1, type: "spring", stiffness: 200, damping: 15 }}
                onClick={openChat}
                className="w-14 h-14 rounded-full bg-[#25D366] text-white shadow-lg shadow-[#25D366]/30 flex items-center justify-center hover:shadow-xl hover:shadow-[#25D366]/40 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
                aria-label="Chat on WhatsApp"
            >
                <MessageCircle size={24} fill="white" strokeWidth={0} />
            </motion.button>

            {/* Pulse ring */}
            <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 1.2 }}
                className="absolute bottom-0 right-0 w-14 h-14 rounded-full bg-[#25D366]/20 animate-ping pointer-events-none"
                style={{ animationDuration: "3s" }}
            />
        </div>
    );
}
