import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  /** Меньше JS от icon-пакетов при tree-shaking импортов. */
  experimental: {
    /** Меньше мёртвого кода из barrel-импортов. */
    optimizePackageImports: ["lucide-react", "clsx"],
  },
  allowedDevOrigins: ["192.168.56.1"],
  /**
   * Базовая защита: без MIME-sniffing, кликджекинг (frame), утечек referrer;
   * Permissions-Policy — микрофон только same-origin (запись в студии).
   */
  async headers() {
    const securityHeaders = [
      { key: "X-DNS-Prefetch-Control", value: "on" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value: "camera=(), geolocation=(), microphone=(self)",
      },
    ];
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
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
