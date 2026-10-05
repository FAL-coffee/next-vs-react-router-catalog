import { test, expect, type Page } from "@playwright/test";

const FRAMEWORK: Record<string, string> = { next: "Next.js", rr: "React Router" };

async function readStock(page: Page): Promise<number> {
  const text = await page.getByTestId("product-stock").first().innerText();
  const m = text.match(/\d+/);
  return m ? Number(m[0]) : 0;
}

test.describe("一覧・検索", () => {
  test("全商品が表示される", async ({ page }, testInfo) => {
    await page.goto("/");
    await expect(page.getByTestId("framework")).toHaveText(FRAMEWORK[testInfo.project.name]);
    await expect(page.getByTestId("product-card")).toHaveCount(8);
    await expect(page.getByTestId("result-count")).toHaveText("8 件");
  });

  test("フリーワード検索が URL に反映され絞り込める", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("検索").fill("コロンビア");
    await page.getByRole("button", { name: "検索" }).click();
    await expect(page).toHaveURL(/q=/);
    await expect(page.getByTestId("product-card")).toHaveCount(1);
    await expect(page.getByTestId("product-name")).toHaveText("コロンビア ウイラ");
  });

  test("カテゴリで絞り込める", async ({ page }) => {
    await page.goto("/?category=equipment");
    await expect(page.getByTestId("product-card")).toHaveCount(2);
    await expect(page.getByLabel("カテゴリ")).toHaveValue("equipment");
  });

  test("該当なしのときは空表示", async ({ page }) => {
    await page.goto("/?q=zzz-no-such-product");
    await expect(page.getByTestId("empty")).toBeVisible();
    await expect(page.getByTestId("result-count")).toHaveText("0 件");
  });
});

test.describe("詳細", () => {
  test("商品情報とタイトルが表示される", async ({ page }) => {
    await page.goto("/products/ethiopia-yirgacheffe");
    await expect(page).toHaveTitle(/エチオピア イルガチェフェ/);
    await expect(page.getByTestId("product-name")).toHaveText("エチオピア イルガチェフェ");
    await expect(page.getByTestId("product-price")).toContainText("¥1,480");
    await expect(page.getByTestId("product-stock")).toHaveText("在庫 12");
  });

  test("在庫切れは予約ボタンが無効", async ({ page }) => {
    await page.goto("/products/guatemala-antigua");
    const button = page.getByTestId("reserve-form").getByRole("button");
    await expect(button).toBeDisabled();
    await expect(button).toHaveText("在庫切れ");
  });

  test("存在しない商品は 404", async ({ page }) => {
    const response = await page.goto("/products/nope");
    expect(response?.status()).toBe(404);
    await expect(page.getByTestId("not-found")).toBeVisible();
  });

  test("loader/render 中の例外は error boundary で受ける", async ({ page }) => {
    const response = await page.goto("/products/colombia-huila?fail=1");
    expect(response?.status()).toBe(500);
    await expect(page.getByTestId("error-boundary")).toBeVisible();
  });
});

test.describe("予約（mutation）", () => {
  test("予約すると在庫が減り、一覧にも反映される", async ({ page }) => {
    await page.goto("/products/paper-filter-02");
    const before = await readStock(page);
    await page.getByTestId("reserve-form").getByLabel("数量").fill("2");
    await page.getByRole("button", { name: "予約する" }).click();
    const result = page.getByTestId("reserve-result");
    await expect(result).toHaveAttribute("data-status", "ok");
    await expect(result).toContainText(`残り ${before - 2}`);
    await expect(page.getByTestId("product-stock")).toHaveText(`在庫 ${before - 2}`);

    await page.goto("/?q=paper-filter-02");
    await expect(page.getByTestId("product-stock")).toHaveText(`在庫 ${before - 2}`);
  });

  test("在庫を超える数量はエラー", async ({ page }) => {
    await page.goto("/products/hario-v60");
    await page.getByTestId("reserve-form").getByLabel("数量").fill("9999");
    await page.getByRole("button", { name: "予約する" }).click();
    const result = page.getByTestId("reserve-result");
    await expect(result).toHaveAttribute("data-status", "error");
    await expect(result).toContainText("在庫が足りません");
  });

  test("JavaScript なしでも検索と予約が動く（progressive enhancement）", async ({ browser, baseURL }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
    const page = await context.newPage();
    await page.goto("/");
    await page.getByLabel("検索").fill("宇治");
    await page.getByRole("button", { name: "検索" }).click();
    await expect(page.getByTestId("product-card")).toHaveCount(1);

    await page.goto("/products/assam-ctc");
    const before = await readStock(page);
    await page.getByTestId("reserve-form").getByLabel("数量").fill("1");
    await page.getByRole("button", { name: "予約する" }).click();
    await expect(page.getByTestId("product-stock")).toHaveText(`在庫 ${before - 1}`);
    await context.close();
  });
});

test.describe("API", () => {
  test("一覧 JSON", async ({ request }) => {
    const res = await request.get("/api/products");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("application/json");
    const body = await res.json();
    expect(body.products).toHaveLength(8);
  });

  test("検索パラメータが効く", async ({ request }) => {
    const body = await (await request.get("/api/products?category=tea")).json();
    expect(body.products.map((p: { id: string }) => p.id)).toEqual(["uji-sencha", "assam-ctc"]);
  });

  test("単品 JSON と 404", async ({ request }) => {
    const ok = await request.get("/api/products/uji-sencha");
    expect(ok.status()).toBe(200);
    expect((await ok.json()).product.id).toBe("uji-sencha");
    const missing = await request.get("/api/products/nope");
    expect(missing.status()).toBe(404);
    expect(await missing.json()).toEqual({ error: "not_found" });
  });
});

test.describe("その他", () => {
  test("About ページ", async ({ page }) => {
    await page.goto("/about");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("About");
  });

  test("未知の URL は 404", async ({ page }) => {
    const response = await page.goto("/nope/nope");
    expect(response?.status()).toBe(404);
    await expect(page.getByTestId("not-found")).toBeVisible();
  });
});
