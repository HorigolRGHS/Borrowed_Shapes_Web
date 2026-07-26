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
    // Rewrite tới route handler nội bộ (chạy runtime, đọc env mỗi request).
    // KHÔNG nhúng backend URL ở đây vì rewrites() chỉ chạy lúc build → URL bị đóng băng.
    return [
      {
        source: "/api/wiki/image/:path*",
        destination: "/api/cdn/wiki/image/:path*",
      },
      {
        source: "/api/account/avatar/:path*",
        destination: "/api/cdn/account/avatar/:path*",
      },
      {
        source: "/api/media/:path*",
        destination: "/api/cdn/storage/media/:path*",
      },
    ];
  },
};

export default nextConfig;
