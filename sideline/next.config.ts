import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [{ source: "/import", destination: "/film/new", permanent: true }];
  },
};

export default nextConfig;
