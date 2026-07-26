import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Produce a self-contained build for deployment */
  output: "standalone",

  /* No external image optimization service configured */
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
