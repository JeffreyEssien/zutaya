import { getCoupons, deleteCoupon, toggleCouponStatus } from "@/lib/queries";
import CouponFormWrapper from "@/components/modules/CouponFormWrapper";
import CouponList from "@/components/modules/CouponList";

import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export default async function AdminCouponsPage() {
    const coupons = await getCoupons();

    async function handleRefresh() {
        "use server";
        revalidatePath("/admin/coupons");
    }

    // We can't pass server actions directly to client components easily without extra files in this setup,
    // so we'll implement the list logic as a server component or use a client wrapper.
    // Let's make the list a client component that calls next actions or we just refresh.

    return (
        <div className="space-y-6">
            <div>
                <h1 className="font-serif text-2xl text-warm-cream">Coupons</h1>
                <p className="text-warm-cream/60 text-sm">Manage discount codes.</p>
            </div>



            <CouponFormWrapper />

            <div className="bg-white/[0.04] rounded-lg border border-warm-cream/20 overflow-hidden">
                <CouponList initialCoupons={coupons} />
            </div>
        </div>
    );
}
