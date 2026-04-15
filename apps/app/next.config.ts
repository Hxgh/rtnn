import path from "node:path";
import type { NextConfig } from "next";

const workspaceRoot = path.resolve(process.cwd(), "../..");

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: workspaceRoot,
  transpilePackages: ["@rtnn/api-sdk", "@rtnn/config", "@rtnn/shared-types"],
  turbopack: {
    root: workspaceRoot,
  },
};

export default nextConfig;
