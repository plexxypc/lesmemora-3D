import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Development only: lets a phone or another computer on your Wi-Fi open the
  // dev server by its network address (for example http://192.168.1.20:3000).
  // Production builds ignore this setting.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*", "192.0.2.2"],
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    root: process.cwd(),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
