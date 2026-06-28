import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pub-4a3e334f734f4b669489b78b2a739715.r2.dev",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      }
    ],
  },
  async rewrites() {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001/api";
    return [
      {
        source: "/api/wiki/image/:path*",
        destination: `${apiBaseUrl}/wiki/image/:path*`,
      },
      {
        source: "/api/account/avatar/:path*",
        destination: `${apiBaseUrl}/account/avatar/:path*`,
      },
    ];
  },
};

export default nextConfig;
