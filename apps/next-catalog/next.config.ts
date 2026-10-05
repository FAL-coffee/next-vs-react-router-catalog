import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ここ以外はあえて既定値のまま。「とりあえず Next.js」が素の状態で何を
  // 同梱しているかを比べるのがこのリポジトリの目的なので。
  transpilePackages: ["@catalog/data"],
  output: "standalone",
};

export default nextConfig;
