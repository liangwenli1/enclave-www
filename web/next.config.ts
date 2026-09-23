import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 自带 node_modules 子集的独立产物，镜像里只需要 node 和这个目录。
  output: "standalone",
  poweredByHeader: false,
};

export default nextConfig;
