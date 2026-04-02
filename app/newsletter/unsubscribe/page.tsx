"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { SITE_NAME } from "@/lib/constants";

function UnsubscribeContent() {
    const params = useSearchParams();
    const success = params.get("success") === "true";

    return (
        <div className="min-h-screen bg-warm-cream flex items-center justify-center px-4">
            <div className="bg-white rounded-2xl p-10 shadow-sm max-w-md w-full text-center border border-warm-tan/20">
                <div
                    className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${
                        success ? "bg-brand-green/10" : "bg-red-50"
                    }`}
                >
                    <span className="text-4xl">{success ? "👋" : "⚠️"}</span>
                </div>

                <h1 className="font-serif text-2xl font-bold text-brand-black mb-3">
                    {success ? "You've Been Unsubscribed" : "Something Went Wrong"}
                </h1>

                <p className="text-muted-brown mb-6 leading-relaxed">
                    {success
                        ? `You've been removed from the ${SITE_NAME} mailing list. You won't receive any more newsletters from us.`
                        : "We couldn't process your unsubscribe request. The link may have already been used or expired."}
                </p>

                {success && (
                    <p className="text-sm text-muted-brown/70 mb-6">
                        Changed your mind? You can always re-subscribe from our website.
                    </p>
                )}

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link
                        href="/"
                        className="inline-block bg-brand-red text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-brand-red/90 transition-colors text-sm"
                    >
                        Back to Home
                    </Link>
                    <Link
                        href="/shop"
                        className="inline-block border border-warm-tan/30 text-brand-black px-6 py-2.5 rounded-lg font-semibold hover:bg-warm-cream transition-colors text-sm"
                    >
                        Browse Shop
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default function UnsubscribePage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen bg-warm-cream flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-red" />
                </div>
            }
        >
            <UnsubscribeContent />
        </Suspense>
    );
}
