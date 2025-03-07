import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: {
    buildActivityPosition: 'bottom-right',
    buildActivity: false
  }
};

export default nextConfig;
