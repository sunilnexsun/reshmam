import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // STATIC_PREVIEW=1 builds a snapshot that can be hosted as plain files (no image optimizer).
  images: { unoptimized: process.env.STATIC_PREVIEW === "1" },
  assetPrefix: process.env.STATIC_PREVIEW === "1" ? "/rp" : undefined,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
