import { handle } from "hono/vercel";
import { app } from "./app";

// Vercel serverless function (Web-standard Request/Response handler). The SPA
// build bundles this file, hono included, into apps/spa-catalog/api/index.js so
// the deployed function has no runtime dependencies.
export default handle(app);
