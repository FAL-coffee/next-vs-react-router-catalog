/**
 * Local host for the API. Also serves the built SPA so that one process is
 * enough locally; in production the static files sit on a CDN and only the
 * JSON API runs (see vercel.ts).
 */
import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join, extname, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { getRequestListener } from "@hono/node-server";
import { app } from "./app";

// ---- static SPA ----
const here = fileURLToPath(new URL(".", import.meta.url));
const DIST = [join(here, "../../spa-catalog/dist"), join(here, "../spa-catalog/dist")].find((d) => existsSync(d));
const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".json": "application/json",
  ".woff2": "font/woff2",
};

const honoListener = getRequestListener(app.fetch);

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  if (url.pathname.startsWith("/api/") || !DIST) return honoListener(req, res);

  const rel = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, "");
  const file = join(DIST, rel);
  if (file.startsWith(DIST) && existsSync(file) && statSync(file).isFile()) {
    res.writeHead(200, {
      "content-type": MIME[extname(file)] ?? "application/octet-stream",
      "cache-control": rel.startsWith("/assets/") ? "public, max-age=31536000, immutable" : "no-cache",
    });
    return res.end(readFileSync(file));
  }
  // SPA fallback only for navigations (what a CDN "404 -> index.html" rule would do).
  if ((req.headers.accept ?? "").includes("text/html")) {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-cache" });
    return res.end(readFileSync(join(DIST, "index.html")));
  }
  res.writeHead(404, { "content-type": "text/plain" });
  res.end("not found");
});

const port = Number(process.env.PORT ?? 3002);
server.listen(port, () => console.log(`api listening on http://localhost:${port} (spa: ${DIST ?? "not built"})`));
