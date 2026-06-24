import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import ToastProvider from "@/components/ui/ToastProvider";
import WhatsAppFloat from "@/components/ui/WhatsAppFloat";
import { getSiteSettings } from "@/lib/queries";
import JsonLd from "@/components/JsonLd";
import { SITE_URL, organizationSchema, websiteSchema, localBusinessSchema } from "@/lib/seo";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();

  const siteUrl = SITE_URL;
  const brand = settings?.siteName || "Zúta Ya";
  const defaultTitle = `${brand} | Premium Meat Delivery · Lagos`;
  const description =
    "Premium meat delivery in Lagos. Fresh, chilled, and frozen cuts — beef, chicken, goat, offal & more — delivered to your door. Order online for same-day delivery.";

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: defaultTitle,
      template: `%s | ${brand}`,
    },
    description,
    keywords: [
      "meat delivery Lagos",
      "buy meat online Lagos",
      "beef delivery Lagos",
      "chicken delivery Lagos",
      "goat meat Lagos",
      "fresh meat Lagos",
      "frozen meat Lagos",
      "butcher Lagos",
      brand,
    ],
    alternates: { canonical: "/" },
    icons: settings?.faviconUrl ? { icon: settings.faviconUrl } : { icon: "/og-image.jpg" },
    openGraph: {
      title: defaultTitle,
      description,
      url: siteUrl,
      siteName: brand,
      locale: "en_NG",
      images: [{ url: `${siteUrl}/og-image.jpg`, width: 1200, height: 1200, alt: `${brand} — Premium Meat Delivery` }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: defaultTitle,
      description,
      images: [`${siteUrl}/og-image.jpg`],
    },
    robots: { index: true, follow: true },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${playfair.variable} font-sans antialiased`}>
        <JsonLd data={[organizationSchema(), websiteSchema(), localBusinessSchema()]} />
        <ToastProvider />
        {children}
        <WhatsAppFloat />
      </body>
    </html>
  );
}
