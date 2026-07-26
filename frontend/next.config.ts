import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* No external image optimization service configured */
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
