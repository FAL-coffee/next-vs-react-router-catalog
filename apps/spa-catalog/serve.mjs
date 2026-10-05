// Minimal static host for the built SPA: what a CDN with a "404 -> index.html"
// rule does. Used by `pnpm start` and by scripts/measure.mjs.
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
  const file = join(DIST, rel);
  if (file.startsWith(DIST) && existsSync(file) && statSync(file).isFile()) {
    res.writeHead(200, {
      "content-type": MIME[extname(file)] ?? "application/octet-stream",
      "cache-control": rel.startsWith("/assets/") ? "public, max-age=31536000, immutable" : "no-cache",
    });
    return res.end(readFileSync(file));
  }
  if ((req.headers.accept ?? "").includes("text/html")) {
    res.writeHead(200, { "content-type": MIME[".html"], "cache-control": "no-cache" });
    return res.end(readFileSync(join(DIST, "index.html")));
  }
  res.writeHead(404, { "content-type": "text/plain" });
  res.end("not found");
}).listen(Number(process.env.PORT ?? 3002), () => console.log(`spa listening on http://localhost:${process.env.PORT ?? 3002}`));
