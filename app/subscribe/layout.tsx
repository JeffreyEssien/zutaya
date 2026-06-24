import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Meat Subscriptions — Weekly & Monthly Delivery",
  description:
    "Never run out of meat. Subscribe for weekly, biweekly or monthly delivery of fresh cuts across Lagos with Zúta Ya. Flexible, cancel anytime.",
  alternates: { canonical: "/subscribe" },
  openGraph: {
    title: "Meat Subscriptions | Zúta Ya",
    description:
      "Subscribe for weekly, biweekly or monthly delivery of fresh meat across Lagos. Flexible, cancel anytime.",
    url: "/subscribe",
    type: "website",
  },
};

export default function SubscribeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
