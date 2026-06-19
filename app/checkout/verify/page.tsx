"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Check, X, Loader2, Package, Printer, ArrowRight } from "lucide-react";
import Header from "@/components/modules/Header";
import Footer from "@/components/modules/Footer";
import Button from "@/components/ui/Button";

function VerifyContent() {
    const search = useSearchParams();
    const router = useRouter();
    const reference = search.get("reference") || search.get("trxref");

    const [state, setState] = useState<
        | { kind: "loading" }
        | { kind: "success"; orderId: string | null; channel?: string; alreadySettled?: boolean }
        | { kind: "failed"; error: string; orderId: string | null }
    >({ kind: "loading" });

    useEffect(() => {
        if (!reference) {
            setState({ kind: "failed", error: "No payment reference provided.", orderId: null });
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(`/api/paystack/verify?reference=${encodeURIComponent(reference)}`);
                const data = await res.json();
                if (cancelled) return;
                if (data.success) {
                    setState({
                        kind: "success",
                        orderId: data.orderId ?? null,
                        channel: data.channel,
                        alreadySettled: !!data.alreadySettled,
                    });
                } else {
                    setState({
                        kind: "failed",
                        error: data.error ?? "Payment could not be verified.",
                        orderId: data.orderId ?? null,
                    });
                }
            } catch (err) {
                if (!cancelled) {
                    setState({ kind: "failed", error: String(err), orderId: null });
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [reference]);

    return (
        <>
            <Header />
            <main className="max-w-3xl mx-auto px-6 py-20">
                {state.kind === "loading" && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center"
                    >
                        <Loader2 className="w-12 h-12 text-brand-green mx-auto animate-spin mb-6" />
                        <h1 className="font-serif text-2xl text-warm-cream mb-2">Confirming your payment…</h1>
                        <p className="text-sm text-warm-cream/45">
                            We're verifying your transaction with Paystack. This usually takes a couple of seconds.
                        </p>
                    </motion.div>
                )}

                {state.kind === "success" && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                        className="text-center"
                    >
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.15, type: "spring", stiffness: 200, damping: 15 }}
                            className="w-20 h-20 rounded-full bg-brand-green/10 flex items-center justify-center border border-brand-green/20 mx-auto mb-6"
                        >
                            <Check size={36} className="text-brand-green" strokeWidth={3} />
                        </motion.div>
                        <h1 className="font-serif text-3xl text-warm-cream mb-3">Payment Confirmed!</h1>
                        <p className="text-warm-cream/55 text-sm max-w-md mx-auto mb-4">
                            Thank you. Your receipt is on the way to your inbox and your order is being prepared.
                        </p>
                        {state.channel && (
                            <p className="text-xs text-warm-cream/35 mb-6">
                                Paid via {state.channel.replace(/_/g, " ")}
                            </p>
                        )}
                        <div className="flex gap-3 justify-center flex-wrap mt-4">
                            <Button variant="outline" onClick={() => window.print()}>
                                <span className="flex items-center gap-2">
                                    <Printer size={16} /> Print Receipt
                                </span>
                            </Button>
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
                        {state.alreadySettled && (
                            <p className="text-[11px] text-warm-cream/30 mt-6">
                                This payment was already confirmed.
                            </p>
                        )}
                    </motion.div>
                )}

                {state.kind === "failed" && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center"
                    >
                        <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 mx-auto mb-6">
                            <X size={36} className="text-red-500" strokeWidth={3} />
                        </div>
                        <h1 className="font-serif text-3xl text-warm-cream mb-3">Payment Not Confirmed</h1>
                        <p className="text-warm-cream/55 text-sm max-w-md mx-auto mb-2">
                            {state.error}
                        </p>
                        {reference && (
                            <p className="text-[11px] font-mono text-warm-cream/30 mb-6">
                                Ref: {reference}
                            </p>
                        )}
                        <div className="flex gap-3 justify-center flex-wrap">
                            <Button onClick={() => router.push("/checkout")}>Try Again</Button>
                            <Button variant="outline" onClick={() => router.push("/")}>Back Home</Button>
                        </div>
                    </motion.div>
                )}
            </main>
            <Footer />
        </>
    );
}

export default function VerifyPage() {
    return (
        <Suspense
            fallback={
                <main className="max-w-3xl mx-auto px-6 py-20 text-center">
                    <Loader2 className="w-12 h-12 text-brand-green mx-auto animate-spin" />
                </main>
            }
        >
            <VerifyContent />
        </Suspense>
    );
}
