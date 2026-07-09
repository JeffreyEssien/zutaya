import { getProducts } from "@/lib/queries";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/constants";
import { buildGoogleFeedItems, feedToXml } from "@/lib/googleFeed";
import { SITE_URL } from "@/lib/seo";

// Always read live products so price/stock edits are reflected on Google's
// next scheduled fetch. Cached at the CDN edge for 30 min to protect the DB.
export const dynamic = "force-dynamic";

export async function GET() {
    const products = await getProducts().catch(() => []);
    const xml = feedToXml(buildGoogleFeedItems(products), {
        title: SITE_NAME,
        link: SITE_URL,
        description: `${SITE_NAME} — ${SITE_DESCRIPTION}`,
    });

    return new Response(xml, {
        headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600",
        },
    });
}
