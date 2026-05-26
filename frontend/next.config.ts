import type { NextConfig } from "next";

const apiProxyTarget =
  process.env.API_PROXY_TARGET ?? "http://127.0.0.1:4000";

/**
 * Next.js blocks /_next/* when the browser host differs from the dev server host.
 * Wildcards are not supported — add your LAN IP from `ipconfig getifaddr en0`.
 */
const allowedDevOrigins = [
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "192.168.1.4",
  ...(process.env.ALLOWED_DEV_ORIGINS?.split(",").map((o) => o.trim()).filter(Boolean) ??
    []),
];

const nextConfig: NextConfig = {
  allowedDevOrigins,
  turbopack: {
    root: "..",
  },
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${apiProxyTarget}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
