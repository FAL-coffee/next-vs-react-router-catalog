import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Plugin } from "vite";
import rawProducts from "../../packages/catalog-data/src/products.json" with { type: "json" };

/**
 * Static route generation: the SPA counterpart of Next's generateStaticParams.
 *
 * A static host only has files, so `/products/brazil-cerrado` needs one on disk
 * or a reload / direct visit is a real 404. The product ids are known at build
 * time, so emit a copy of index.html for every known route. Unknown ids keep
 * returning a genuine 404 from the host, which a catch-all rewrite could not do.
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
