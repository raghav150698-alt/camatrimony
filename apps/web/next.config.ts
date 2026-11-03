import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  transpilePackages: [
    "@camatrimony/ui",
    "@camatrimony/shared",
    "@camatrimony/api-client",
    "@camatrimony/auth",
    "@camatrimony/payments"
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.camatrimonybncn.com",
        pathname: "/v1/uploads/**"
      }
    ],
    unoptimized: true
  }
};

export default nextConfig;
