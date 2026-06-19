"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Script from "next/script";
import { motion } from "framer-motion";
import { Loader2, CreditCard, Check, X, ArrowRight, Package } from "lucide-react";
import Header from "@/components/modules/Header";
import Footer from "@/components/modules/Footer";
import Button from "@/components/ui/Button";

declare global {
    interface Window {
        PaystackPop?: new () => {
            resumeTransaction: (
                accessCode: string,
                hooks?: {
                    onSuccess?: (tx: { reference: string }) => void;
                    onCancel?: () => void;
                    onError?: (err: { message?: string }) => void;
                },
            ) => void;
        };
    }
}

function ResumeContent() {
    const search = useSearchParams();
    const router = useRouter();
    const token = search.get("token");
    const [state, setState] = useState<
        | { kind: "loading"; message: string }
        | { kind: "already_paid"; orderId: string | null }
        | { kind: "popup_open" }
        | { kind: "error"; message: string }
    >({ kind: "loading", message: "Looking up your order…" });

    useEffect(() => {
        if (!token) {
            setState({ kind: "error", message: "Missing link token. Please use the link from your email." });
            return;
        }
        let cancelled = false;

        const start = async () => {
            try {
                const res = await fetch("/api/paystack/resume", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ token }),
                });
                const data = await res.json();
                if (cancelled) return;

                if (!res.ok || !data.success) {
                    setState({ kind: "error", message: data.error || "Could not resume payment." });
                    return;
                }

                if (data.alreadyPaid) {
                    setState({ kind: "already_paid", orderId: data.orderId ?? null });
                    return;
                }

                // Wait briefly for the Paystack script to load if needed
                let tries = 0;
                while (!window.PaystackPop && tries < 30) {
                    await new Promise((r) => setTimeout(r, 100));
                    tries++;
                }
                if (!window.PaystackPop) {
                    setState({ kind: "error", message: "Payment SDK failed to load. Please refresh and try again." });
                    return;
                }

                setState({ kind: "popup_open" });
                const popup = new window.PaystackPop();
                popup.resumeTransaction(data.accessCode, {
                    onSuccess: (tx) => {
                        window.location.href = `/checkout/verify?reference=${encodeURIComponent(tx.reference)}`;
                    },
                    onCancel: () => {
                        setState({
                            kind: "error",
                            message: "Payment cancelled. You can re-open this link anytime to try again.",
                        });
                    },
                    onError: (err) => {
                        setState({ kind: "error", message: `Payment error: ${err.message ?? "unknown"}` });
                    },
                });
            } catch (err) {
                if (!cancelled) {
                    setState({ kind: "error", message: String(err) });
                }
            }
        };

        start();
        return () => {
            cancelled = true;
        };
    }, [token]);

    return (
        <>
            <Script src="https://js.paystack.co/v2/inline.js" strategy="afterInteractive" />
            <Header />
            <main className="max-w-3xl mx-auto px-6 py-24">
                {state.kind === "loading" && (
                    <div className="text-center">
                        <Loader2 className="w-12 h-12 text-brand-green mx-auto animate-spin mb-6" />
                        <h1 className="font-serif text-2xl text-warm-cream mb-2">{state.message}</h1>
                    </div>
                )}

                {state.kind === "popup_open" && (
                    <div className="text-center">
                        <CreditCard className="w-12 h-12 text-brand-green mx-auto mb-6" />
                        <h1 className="font-serif text-2xl text-warm-cream mb-2">Opening secure checkout…</h1>
                        <p className="text-sm text-warm-cream/45">Don't close this tab — the Paystack window should appear.</p>
                    </div>
                )}

                {state.kind === "already_paid" && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
                        <div className="w-20 h-20 rounded-full bg-brand-green/10 flex items-center justify-center border border-brand-green/20 mx-auto mb-6">
                            <Check size={36} className="text-brand-green" strokeWidth={3} />
                        </div>
                        <h1 className="font-serif text-3xl text-warm-cream mb-3">Good news — you've already paid!</h1>
                        <p className="text-warm-cream/55 text-sm max-w-md mx-auto mb-6">
                            Our records show your payment was successful. We've sent your receipt and your order is being prepared.
                        </p>
                        <div className="flex gap-3 justify-center flex-wrap">
                            {state.orderId && (
                                <Button onClick={() => router.push(`/track?id=${state.orderId}`)}>
                                    <span className="flex items-center gap-2">
                                        <Package size={16} /> Track Order
                                    </span>
                                </Button>
                            )}
                            <Button variant="outline" onClick={() => router.push("/shop")}>
                                <span className="flex items-center gap-2">
                                    Continue Shopping <ArrowRight size={16} />
                                </span>
                            </Button>
                        </div>
                    </motion.div>
                )}

                {state.kind === "error" && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
                        <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 mx-auto mb-6">
                            <X size={36} className="text-red-500" strokeWidth={3} />
                        </div>
                        <h1 className="font-serif text-3xl text-warm-cream mb-3">Couldn't Resume Payment</h1>
                        <p className="text-warm-cream/55 text-sm max-w-md mx-auto mb-6">{state.message}</p>
                        <div className="flex gap-3 justify-center flex-wrap">
                            <Button onClick={() => window.location.reload()}>Try Again</Button>
                            <Button variant="outline" onClick={() => router.push("/")}>Back Home</Button>
                        </div>
                    </motion.div>
                )}
            </main>
            <Footer />
        </>
    );
}

export default function ResumePage() {
    return (
        <Suspense
            fallback={
                <main className="max-w-3xl mx-auto px-6 py-20 text-center">
                    <Loader2 className="w-12 h-12 text-brand-green mx-auto animate-spin" />
                </main>
            }
        >
            <ResumeContent />
        </Suspense>
    );
}
