import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@camatrimony/ui",
    "@camatrimony/shared",
    "@camatrimony/api-client",
    "@camatrimony/auth"
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "camatrimony-api.gentle-mode-2ab9.workers.dev",
        pathname: "/v1/uploads/**"
      }
    ],
    unoptimized: true
  }
};

export default nextConfig;
