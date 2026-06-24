import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ✅ Move allowedDevOrigins to the root level
  allowedDevOrigins: ['172.20.3.44'],

  images: {
    // Serve images straight from their source CDNs (Cloudinary, Unsplash, Pexels)
    // instead of proxying through Next's optimizer. The optimizer was fetching +
    // AVIF-encoding large remote images on every request and timing out (500s)
    // under the concurrency of an image grid. Sources are already CDN-optimized,
    // so direct delivery is faster and can't fail. (Proper per-image optimization
    // later = Cloudinary URL transforms, not the Next optimizer.)
    unoptimized: true,
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
