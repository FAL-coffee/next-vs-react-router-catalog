import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Deliberately left at defaults otherwise: the point of this repo is to
  // compare what "とりあえず Next.js" ships with out of the box.
  transpilePackages: ["@catalog/data"],
  output: "standalone",
};

export default nextConfig;
