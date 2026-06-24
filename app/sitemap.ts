import type { MetadataRoute } from "next";
import { getProducts, getPages } from "@/lib/queries";
import { SITE_URL } from "@/lib/seo";

export const revalidate = 3600; // rebuild hourly

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/shop`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/bundles`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/subscribe`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/track`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
  ];

  // Live product + CMS pages — fail soft so a DB hiccup never breaks the sitemap.
  let dynamicRoutes: MetadataRoute.Sitemap = [];
  try {
    const [products, pages] = await Promise.all([getProducts(), getPages()]);

    const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
      url: `${SITE_URL}/product/${p.slug}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    }));

    const pageRoutes: MetadataRoute.Sitemap = pages.map((pg) => ({
      url: `${SITE_URL}/${pg.slug}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    }));

    dynamicRoutes = [...productRoutes, ...pageRoutes];
  } catch {
    dynamicRoutes = [];
  }

  return [...staticRoutes, ...dynamicRoutes];
}
