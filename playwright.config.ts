import { existsSync } from "node:fs";
import { defineConfig } from "@playwright/test";

/**
 * The same spec runs against both apps. Each app is a separate project with
 * its own baseURL; `parity.spec.ts` talks to both servers directly.
 */
export const NEXT_URL = "http://localhost:3001";
export const RR_URL = "http://localhost:3002";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    trace: "retain-on-failure",
    // Reuse a pre-installed Chromium when one is provided (CI / cloud
    // sandboxes); otherwise fall back to the browsers `playwright install` manages.
    launchOptions: process.env.PW_CHROMIUM_PATH
      ? { executablePath: process.env.PW_CHROMIUM_PATH }
      : existsSync("/opt/pw-browsers/chromium")
        ? { executablePath: "/opt/pw-browsers/chromium" }
        : {},
  },
  projects: [
    { name: "next", use: { baseURL: NEXT_URL }, testIgnore: /parity/ },
    { name: "rr", use: { baseURL: RR_URL }, testIgnore: /parity/ },
    { name: "parity", testMatch: /parity/ },
  ],
  webServer: [
    {
      command: "pnpm --filter next-catalog start",
      url: NEXT_URL,
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: "pnpm --filter rr-catalog start",
      url: RR_URL,
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
