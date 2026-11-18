import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // The e2e container reaches the dev server as http://devserver:3000.
  allowedDevOrigins: ["devserver"],
  cacheComponents: true,
  partialPrefetching: true,
  // The service worker (notifications) must never be served stale.
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
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
