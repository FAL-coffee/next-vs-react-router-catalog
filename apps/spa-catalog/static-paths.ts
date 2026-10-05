import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Plugin } from "vite";
import rawProducts from "../../packages/catalog-data/src/products.json" with { type: "json" };

/**
 * 静的ルート生成。Next の generateStaticParams に相当する SPA 側の仕組み。
 *
 * 静的ホストにはファイルしか無いので、`/products/brazil-cerrado` に対応する
 * ファイルがディスクに無いとリロードや直接アクセスは本物の 404 になる。
 * 商品 ID はビルド時に分かっているので、既知のルートごとに index.html の
 * コピーを吐く。未知の ID はホストが本物の 404 を返したままになる。これは
 * 全部 index.html に回す rewrite ではできないこと。
 */
export function staticPaths(): Plugin {
  const paths = ["about", ...rawProducts.map((p) => `products/${p.id}`)];
  let outDir = "dist";
  return {
    name: "catalog:static-paths",
    apply: "build",
    configResolved(config) {
      outDir = config.build.outDir;
    },
    closeBundle() {
      const html = readFileSync(join(outDir, "index.html"));
      for (const p of paths) {
        mkdirSync(join(outDir, p), { recursive: true });
        writeFileSync(join(outDir, p, "index.html"), html);
      }
      console.log(`static-paths: wrote ${paths.length} routes`);
    },
  };
}
