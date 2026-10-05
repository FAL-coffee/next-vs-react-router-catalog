// ビルド済み SPA を配信する最小の静的サーバ。素の CDN と同じ振る舞いで、
// ファイルがあれば返し（`/products/<id>/` は static-paths.ts がビルド時に
// 生成した index.html に解決される）、それ以外は本物の 404 を返す。
// `pnpm start` と scripts/measure.mjs が使う。
import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const DIST = join(fileURLToPath(new URL(".", import.meta.url)), "dist");
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".json": "application/json",
};

createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  const rel = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, "");
  let file = join(DIST, rel);
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
  if (file.startsWith(DIST) && existsSync(file) && statSync(file).isFile()) {
    res.writeHead(200, {
      "content-type": MIME[extname(file)] ?? "application/octet-stream",
      "cache-control": rel.startsWith("/assets/") ? "public, max-age=31536000, immutable" : "no-cache",
    });
    return res.end(readFileSync(file));
  }
  res.writeHead(404, { "content-type": "text/plain" });
  res.end("not found");
}).listen(Number(process.env.PORT ?? 3002), () => console.log(`spa listening on http://localhost:${process.env.PORT ?? 3002}`));
