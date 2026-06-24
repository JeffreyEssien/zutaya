import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Build Your Meat Box",
  description:
    "Build a custom meat box from premium cuts and save with bundle pricing. Beef, chicken, goat, offal & more — delivered fresh across Lagos by Zúta Ya.",
  alternates: { canonical: "/bundles" },
  openGraph: {
    title: "Build Your Meat Box | Zúta Ya",
    description:
      "Build a custom meat box from premium cuts and save with bundle pricing. Delivered fresh across Lagos.",
    url: "/bundles",
    type: "website",
  },
};

export default function BundlesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
