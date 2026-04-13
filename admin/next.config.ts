import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@rtnn/api-sdk", "@rtnn/config", "@rtnn/shared-types"],
};

export default nextConfig;
