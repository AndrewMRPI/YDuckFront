import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "yd-uck-front.vercel.app",
          },
        ],
        destination: "https://yellowduckycorp.com/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
