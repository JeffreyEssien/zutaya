import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ✅ Move allowedDevOrigins to the root level
  allowedDevOrigins: ['172.20.3.44'],

  images: {
    // Optimize at the source CDN's edge via a custom loader (Cloudinary
    // f_auto/q_auto/w_, Unsplash/Pexels resize params) instead of Next's server
    // optimizer, which 500'd under the concurrency of an image grid. No
    // `/_next/image` proxy = fast, reliable, responsive images.
    loader: "custom",
    loaderFile: "./lib/imageLoader.ts",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      // Admins can paste image links from any host, and seed data carries
      // assorted Unsplash/Pexels URLs. Allow any https host through the
      // optimizer so next/image never throws "hostname not configured" and
      // crashes a page. New uploads still route through Cloudinary.
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
