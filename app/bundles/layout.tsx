import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Zútaya Packages — Curated Party & Owambe Meat Boxes in Lagos",
  description:
    "Shop ready-made Zútaya Packages — curated meat boxes at one flat price. Goat, beef, chicken, shaki, kidney and more, portioned and delivered fresh across Lagos by Zúta Ya.",
  alternates: { canonical: "/bundles" },
  openGraph: {
    title: "Zútaya Packages | Zúta Ya",
    description:
      "Curated meat boxes at a flat price — perfect for the family, parties and owambe. Delivered fresh across Lagos.",
    url: "/bundles",
    type: "website",
  },
};

export default function PackagesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
