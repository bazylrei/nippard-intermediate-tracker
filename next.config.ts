import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // The program builder's old addresses (bookmarks, home-screen shortcuts) land on the new screens.
  async redirects() {
    return [
      { source: "/builder", destination: "/programs", permanent: true },
      { source: "/builder/:programId", destination: "/programs/:programId", permanent: true },
    ];
  },
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
