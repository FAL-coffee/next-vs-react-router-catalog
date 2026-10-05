import { test, expect, type Page } from "@playwright/test";
import { NEXT_URL, RR_URL } from "../playwright.config";

/**
 * Cross-app checks: the two servers must answer the same thing for the same
 * request. Uses only read paths whose state no other test mutates
 * (`tea` and `coffee` categories).
 */
async function mainText(page: Page, url: string): Promise<string> {
  await page.goto(url);
  const text = await page.locator("main").innerText();
  return text.replace(/\s+/g, " ").trim();
}

for (const path of ["/api/products?category=tea", "/api/products?category=coffee", "/api/products/uji-sencha", "/api/products/nope"]) {
  test(`API parity: ${path}`, async ({ request }) => {
    const [a, b] = await Promise.all([request.get(NEXT_URL + path), request.get(RR_URL + path)]);
    expect(a.status()).toBe(b.status());
    expect(await a.json()).toEqual(await b.json());
  });
}

for (const path of ["/?category=tea", "/?category=coffee", "/products/uji-sencha", "/products/nope", "/nope"]) {
  test(`rendered text parity: ${path}`, async ({ page }) => {
    const a = await mainText(page, NEXT_URL + path);
    const b = await mainText(page, RR_URL + path);
    expect(a).toBe(b);
  });
}
