import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": path.resolve(__dirname, "src"),
    };
    return config;
  },
  output: "standalone", // enables standalone build for deployment
  experimental: {
    esmExternals: true, // ensures proper module resolution
  },
  images: {
    domains: ["lh3.googleusercontent.com"], // whitelist Google profile pics
  },
};

export default nextConfig;
