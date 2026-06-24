import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Build Your Meat Box — Party & Owambe Meat Packs in Lagos",
  description:
    "Build a custom meat box and save with bundle pricing — perfect for party meat, owambe and bulk freezer stocking. Beef, chicken, goat & assorted meat delivered fresh across Lagos by Zúta Ya.",
  alternates: { canonical: "/bundles" },
  openGraph: {
    title: "Build Your Meat Box | Zúta Ya",
    description:
      "Custom meat boxes & party/owambe meat packs with bundle pricing. Delivered fresh across Lagos.",
    url: "/bundles",
    type: "website",
  },
};

export default function BundlesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
