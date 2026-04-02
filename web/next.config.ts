import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.56.1"],
  async rewrites() {
    return [
      {
        source: "/@:handle",
        destination: "/channel/:handle",
      },
    ];
  },
};

export default nextConfig;
