import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import ToastProvider from "@/components/ui/ToastProvider";
import WhatsAppFloat from "@/components/ui/WhatsAppFloat";
import { getSiteSettings } from "@/lib/queries";

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

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.zutayang.com").replace(/\/+$/, "");
  const title = settings?.siteName ? `${settings.siteName} | Premium Meat Delivery` : "Zúta Ya | Premium Meat Delivery · Lagos";
  const description = "Premium meat delivery in Lagos. Fresh, chilled, and frozen cuts delivered to your door.";

  return {
    title,
    description,
    icons: settings?.faviconUrl ? { icon: settings.faviconUrl } : { icon: "/og-image.jpg" },
    openGraph: {
      title,
      description,
      url: siteUrl,
      siteName: "Zúta Ya",
      images: [{ url: `${siteUrl}/og-image.jpg`, width: 1200, height: 1200, alt: "Zúta Ya Logo" }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${siteUrl}/og-image.jpg`],
    },
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
        <ToastProvider />
        {children}
        <WhatsAppFloat />
      </body>
    </html>
  );
}
