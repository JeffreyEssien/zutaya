"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Header from "@/components/modules/Header";
import Footer from "@/components/modules/Footer";
import { useCartStore } from "@/lib/cartStore";
import CheckoutForm from "@/components/modules/CheckoutForm";
import CheckoutSummary from "@/components/modules/CheckoutSummary";
import Receipt from "@/components/modules/Receipt";
import BankTransferPanel from "@/components/modules/BankTransferPanel";
import Button from "@/components/ui/Button";
import { ShoppingBag, ArrowRight, ArrowLeft, Check, Printer, Clock, Package } from "lucide-react";

type CheckoutState =
    | { step: "checkout" }
    | { step: "bank_transfer"; orderId: string; total: number }
    | { step: "payment_submitted"; orderId: string }
    | { step: "receipt" };

export default function CheckoutPage() {
    const { items } = useCartStore();
    const router = useRouter();
    const [state, setState] = useState<CheckoutState>({ step: "checkout" });
    const [shippingFee, setShippingFee] = useState(0);
    const [packagingFee, setPackagingFee] = useState(0);

    if (items.length === 0 && state.step === "checkout") {
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

    // Receipt view (after WhatsApp payment or after admin confirms bank transfer)
    if (state.step === "receipt") {
        return (
            <>
                <Header />
                <main className="max-w-7xl mx-auto px-6 py-12">
                    <SuccessBanner />
                    <Receipt />
                    <div className="text-center mt-10 flex gap-4 justify-center flex-wrap">
                        <Button variant="outline" onClick={() => window.print()}>
                            <span className="flex items-center gap-2"><Printer size={16} /> Print Receipt</span>
                        </Button>
                        <a href="/shop"><Button>
                            <span className="flex items-center gap-2">Continue Shopping <ArrowRight size={16} /></span>
                        </Button></a>
                    </div>
                </main>
                <Footer />
            </>
        );
    }

    // Bank transfer: show bank details + sender name input
    if (state.step === "bank_transfer") {
        return (
            <>
                <Header />
                <main className="max-w-7xl mx-auto px-6 py-12">
                    <BankTransferPanel
                        orderId={state.orderId}
                        totalAmount={state.total}
                        onPaymentConfirmed={() =>
                            setState({ step: "payment_submitted", orderId: state.orderId })
                        }
                    />
                </main>
                <Footer />
            </>
        );
    }

    // Payment submitted: waiting for admin
    if (state.step === "payment_submitted") {
        return (
            <>
                <Header />
                <main className="max-w-7xl mx-auto px-6 py-12">
                    <PaymentSubmittedBanner orderId={state.orderId} />
                    <Receipt />
                    <div className="text-center mt-10 flex gap-4 justify-center flex-wrap">
                        <Button variant="outline" onClick={() => window.print()}>
                            <span className="flex items-center gap-2"><Printer size={16} /> Print Receipt</span>
                        </Button>
                        <a href="/shop"><Button>
                            <span className="flex items-center gap-2">Continue Shopping <ArrowRight size={16} /></span>
                        </Button></a>
                    </div>
                </main>
                <Footer />
            </>
        );
    }

    // Default: checkout form
    return (
        <>
            <Header />
            <main className="max-w-7xl mx-auto px-6 py-12">
                {/* Breadcrumb */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mb-8"
                >
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
                            onComplete={(orderInfo) => {
                                if (orderInfo?.paymentMethod === "bank_transfer") {
                                    setState({
                                        step: "bank_transfer",
                                        orderId: orderInfo.orderId,
                                        total: orderInfo.total,
                                    });
                                } else {
                                    setState({ step: "receipt" });
                                }
                            }}
                        />
                    </div>
                    <div className="lg:col-span-2">
                        <CheckoutSummary shippingFee={shippingFee} packagingFee={packagingFee} />
                    </div>
                </div>
            </main>
            <Footer />
        </>
    );
}

function SuccessBanner() {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="text-center mb-12"
        >
            {/* Animated checkmark */}
            <div className="relative w-20 h-20 mx-auto mb-6">
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 15 }}
                    className="w-20 h-20 rounded-full bg-brand-green/10 flex items-center justify-center border border-brand-green/20"
                >
                    <motion.div
                        initial={{ scale: 0, rotate: -90 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ delay: 0.5, type: "spring", stiffness: 300, damping: 20 }}
                    >
                        <Check size={32} className="text-brand-green" strokeWidth={3} />
                    </motion.div>
                </motion.div>
            </div>
            <h1 className="font-serif text-3xl text-warm-cream mb-3">Order Confirmed!</h1>
            <p className="text-warm-cream/50 text-sm max-w-md mx-auto">
                A confirmation email with your receipt has been sent to your inbox.
            </p>
            <a href="/track" className="inline-flex items-center gap-2 mt-5 text-xs font-medium text-brand-green hover:text-warm-cream transition-colors">
                <Package size={14} />
                Track Your Order →
            </a>
        </motion.div>
    );
}

function PaymentSubmittedBanner({ orderId }: { orderId: string }) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="text-center mb-12"
        >
            <div className="relative w-20 h-20 mx-auto mb-6">
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 15 }}
                    className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20"
                >
                    <motion.div
                        initial={{ scale: 0, rotate: -90 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ delay: 0.5, type: "spring", stiffness: 300, damping: 20 }}
                    >
                        <Clock size={32} className="text-amber-500" strokeWidth={2.5} />
                    </motion.div>
                </motion.div>
            </div>
            <h1 className="font-serif text-3xl text-warm-cream mb-3">Payment Submitted!</h1>
            <p className="text-warm-cream/50 text-sm max-w-md mx-auto">
                Your payment confirmation for order <span className="font-mono font-medium text-warm-cream">{orderId}</span> has been received.
                The admin will verify your payment shortly and update your order status.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 text-amber-400 text-xs font-medium rounded-full">
                <Clock size={12} />
                Awaiting Admin Approval
            </div>
            <div className="mt-4">
                <a href="/track" className="inline-flex items-center gap-2 text-xs font-medium text-brand-green hover:text-warm-cream transition-colors">
                    <Package size={14} />
                    Track Your Order →
                </a>
            </div>
        </motion.div>
    );
}
