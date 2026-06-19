"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Header from "@/components/modules/Header";
import Footer from "@/components/modules/Footer";
import { useCartStore } from "@/lib/cartStore";
import CheckoutForm from "@/components/modules/CheckoutForm";
import CheckoutSummary from "@/components/modules/CheckoutSummary";
import Button from "@/components/ui/Button";
import { ShoppingBag, ArrowRight, ArrowLeft } from "lucide-react";

export default function CheckoutPage() {
    const { items } = useCartStore();
    const router = useRouter();
    const [shippingFee, setShippingFee] = useState(0);
    const [packagingFee, setPackagingFee] = useState(0);
    const [processingFee, setProcessingFee] = useState(0);

    if (items.length === 0) {
        return (
            <>
                <Header />
                <main className="max-w-7xl mx-auto px-6 py-24">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center"
                    >
                        <div className="w-20 h-20 rounded-full bg-warm-cream/10 flex items-center justify-center mx-auto mb-6">
                            <ShoppingBag size={32} className="text-warm-cream/15" />
                        </div>
                        <h1 className="font-serif text-3xl text-warm-cream mb-3">Your cart is empty</h1>
                        <p className="text-warm-cream/40 mb-8 text-sm">Add some items before checking out.</p>
                        <Button onClick={() => router.push("/shop")}>
                            <span className="flex items-center gap-2">
                                Continue Shopping <ArrowRight size={16} />
                            </span>
                        </Button>
                    </motion.div>
                </main>
                <Footer />
            </>
        );
    }

    return (
        <>
            <Header />
            <main className="max-w-7xl mx-auto px-6 py-12">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-1.5 text-xs text-warm-cream/35 hover:text-brand-green transition-colors cursor-pointer"
                    >
                        <ArrowLeft size={12} />
                        Back to cart
                    </button>
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="font-serif text-3xl md:text-4xl text-warm-cream mb-10"
                >
                    Checkout
                </motion.h1>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
                    <div className="lg:col-span-3">
                        <CheckoutForm
                            onShippingChange={setShippingFee}
                            onPackagingChange={setPackagingFee}
                            onProcessingFeeChange={setProcessingFee}
                            onComplete={() => {
                                // No-op: success is now driven by /checkout/verify
                                // (Paystack popup redirects there directly).
                            }}
                        />
                    </div>
                    <div className="lg:col-span-2">
                        <CheckoutSummary
                            shippingFee={shippingFee}
                            packagingFee={packagingFee}
                            processingFee={processingFee}
                        />
                    </div>
                </div>
            </main>
            <Footer />
        </>
    );
}
