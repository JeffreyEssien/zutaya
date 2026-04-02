import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ✅ Move allowedDevOrigins to the root level
  allowedDevOrigins: ['172.20.3.44'],

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },
};

export default nextConfig;
