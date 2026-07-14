import { listReviews } from "@/lib/reviews";
import { getProducts } from "@/lib/queries";
import ReviewsAdminContent from "@/components/modules/ReviewsAdminContent";

export const dynamic = "force-dynamic";

export default async function AdminReviewsPage() {
    const [reviews, products] = await Promise.all([
        listReviews("all"),
        getProducts().catch(() => []),
    ]);
    const productNames: Record<string, string> = {};
    for (const p of products) productNames[p.id] = p.name;

    return <ReviewsAdminContent initialReviews={reviews} productNames={productNames} />;
}
