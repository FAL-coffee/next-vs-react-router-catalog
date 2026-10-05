# Next.js vs React Router: 同一仕様カタログの計測結果

計測日時: 2026-10-05T08:03:45.026Z / Node v22.22.0 / pnpm 10.28.0

両アプリは同じ `@catalog/data` を使い、同じ Playwright スペック（`e2e/`）を通過している。差分はフレームワーク由来のものだけ。

> 数値はこの環境（クラウドコンテナ）での1回の計測。絶対値よりも両者の比を見ること。`pnpm measure && pnpm report` で再現できる。

## 1. バージョン

|  | Next.js | React Router |
| --- | --- | --- |
| フレームワーク | next@16.3.8 | react-router@8.4.0<br>@react-router/dev@8.4.0<br>@react-router/node@8.4.0<br>@react-router/serve@8.4.0 |
| package.json の dependencies | next, react, react-dom | @react-router/node, @react-router/serve, isbot, react, react-dom, react-router |
| package.json の devDependencies | @tailwindcss/postcss, @types/node, @types/react, @types/react-dom, eslint, eslint-config-next, tailwindcss, typescript | @react-router/dev, @tailwindcss/vite, @types/node, @types/react, @types/react-dom, tailwindcss, typescript, vite |


## 2. 書いたコード量（アプリ側ソース）

|  | Next.js | React Router |
| --- | --- | --- |
| ファイル数 | 17 | 14 |
| 非空行数 | 394 | 380 |


## 3. 依存パッケージ（node_modules に実際に解決されたユニークな package@version）

|  | Next.js | React Router | 比 |
| --- | --- | --- | --- |
| 本番依存 パッケージ数 | 59 | 92 | 0.6x |
| 本番依存 ディスクサイズ | 428.22 MB | 36.08 MB | 11.9x |
| 開発依存込み パッケージ数 | 436 | 222 | 2.0x |
| 開発依存込み ディスクサイズ | 537.84 MB | 144.66 MB | 3.7x |
| RSC ランタイム (react-server-dom-*) を同梱 | はい | いいえ |  |
| 画像処理ネイティブライブラリ (sharp / libvips) を同梱 | はい | いいえ |  |


## 4. ビルド

|  | Next.js | React Router | 比 |
| --- | --- | --- | --- |
| 本番ビルド時間（2回中の最速、クリーンビルド） | 10831 ms | 1526 ms | 7.1x |
| ビルド時間 各回 | 10831 ms, 11162 ms | 1870 ms, 1526 ms |  |
| ビルド出力サイズ（キャッシュ除く） | 8.55 MB / 235 files | 450.4 KB / 25 files | 19.4x |
| デプロイに必要な一式 | 195.65 MB<br>(.next/standalone (traced node_modules included) + .next/static) | 36.52 MB<br>(build/ + production node_modules) | 5.4x |


## 5. ランタイム

|  | Next.js | React Router | 比 |
| --- | --- | --- | --- |
| コールドスタート（`start` 実行から `/` が 200 を返すまで） | 950 ms | 658 ms | 1.4x |
| 常駐メモリ RSS（アイドル後、プロセスツリー合計） | 243.31 MB | 158.23 MB | 1.5x |

レイテンシ（ウォームアップ後、逐次 200 リクエスト、localhost）:

| パス | Next p50 | Next p95 | RR p50 | RR p95 |
| --- | --- | --- | --- | --- |
| `/` | 8.03 ms | 14.66 ms | 5.02 ms | 8.71 ms |
| `/products/ethiopia-yirgacheffe` | 6.58 ms | 11.3 ms | 3.96 ms | 6.92 ms |
| `/api/products` | 2.22 ms | 4.3 ms | 2.74 ms | 4.92 ms |


## 6. ページ重量（実ブラウザで networkidle まで読み込んだ転送内容）

### `/`

|  | Next.js | React Router | 比 |
| --- | --- | --- | --- |
| HTML | 22.0 KB | 11.8 KB | 1.9x |
| JS ファイル数 | 8 | 8 |  |
| JS 合計 (raw) | 466.6 KB | 313.6 KB | 1.5x |
| JS 合計 (gzip) | 139.4 KB | 101.9 KB | 1.4x |
| JS 合計 (brotli) | 119.7 KB | 89.4 KB | 1.3x |
| CSS | 11.0 KB | 11.1 KB |  |
| 画像 (枚数 / バイト) | 8 / 16.0 KB | 8 / 79.6 KB |  |
| リクエスト総数 / 総バイト | 33 / 549.9 KB | 19 / 418.1 KB |  |

### `/products/ethiopia-yirgacheffe`

|  | Next.js | React Router | 比 |
| --- | --- | --- | --- |
| HTML | 11.4 KB | 7.2 KB | 1.6x |
| JS ファイル数 | 8 | 8 |  |
| JS 合計 (raw) | 467.9 KB | 313.4 KB | 1.5x |
| JS 合計 (gzip) | 140.0 KB | 101.9 KB | 1.4x |
| JS 合計 (brotli) | 120.3 KB | 89.4 KB | 1.3x |
| CSS | 11.0 KB | 11.1 KB |  |
| 画像 (枚数 / バイト) | 1 / 2.9 KB | 1 / 12.8 KB |  |
| リクエスト総数 / 総バイト | 18 / 525.1 KB | 12 / 346.4 KB |  |

### `/about`

|  | Next.js | React Router | 比 |
| --- | --- | --- | --- |
| HTML | 8.3 KB | 5.4 KB | 1.6x |
| JS ファイル数 | 7 | 7 |  |
| JS 合計 (raw) | 452.1 KB | 312.1 KB | 1.4x |
| JS 合計 (gzip) | 134.0 KB | 101.2 KB | 1.3x |
| JS 合計 (brotli) | 114.9 KB | 88.9 KB | 1.3x |
| CSS | 11.0 KB | 11.1 KB |  |
| 画像 (枚数 / バイト) | 0 / 0 B | 0 / 0 B |  |
| リクエスト総数 / 総バイト | 14 / 502.0 KB | 10 / 329.7 KB |  |


## 7. 露出しているエンドポイント（アプリが定義していないパスへの応答）

同じリクエストを両サーバに投げたときのステータス。`404` 以外が返るものは、アプリのコードとは無関係にフレームワークが生やしている口。

| リクエスト | 意味 | Next.js | React Router |
| --- | --- | --- | --- |
| `GET /` | app route | 200 (text/html) | 200 (text/html) |
| `GET /robots.txt` | not defined by either app | 404 (text/html) | 404 (text/html) |
| `GET /_next/image?url=%2Fimages%2Fuji-sencha.png&w=640&q=75` | Next.js image optimizer (local src) | 200 (image/png) | 404 (text/html) |
| `GET /_next/image?url=https%3A%2F%2Fexample.com%2Fx.png&w=640&q=75` | Next.js image optimizer (remote src) | 400 | 404 (text/html) |
| `GET /_next/image?url=%2Fimages%2Fuji-sencha.png&w=640&q=75`<br>headers: `{"accept":"image/avif,image/webp"}` | image optimizer, AVIF negotiated | 200 (image/webp) | 404 (text/html) |
| `GET /`<br>headers: `{"RSC":"1"}`<br>(リダイレクト追従) | RSC flight payload request (redirects followed) | 200 (text/x-component) | 200 (text/html) |
| `POST /`<br>headers: `{"Next-Action":"0000000000000000000000000000000000000000","Content-Type":"text/plain"}` | Server Action endpoint (bogus id) | 404 (text/plain) | 405 (text/html) |
| `GET /__manifest?p=%2F&version=0` | React Router lazy route discovery manifest | 404 (text/html) | 204 |
| `GET /_root.data` | React Router single-fetch data request (root) | 404 (text/html) | 404 (text/x-script) |
| `GET /products/uji-sencha.data` | React Router single-fetch data request | 404 (text/html) | 200 (text/x-script) |
| `GET /.well-known/appspecific/com.chrome.devtools.json` | Chrome DevTools workspace probe | 404 (text/html) | 404 (text/html) |
| `GET /__nextjs_original-stack-frames` | Next.js dev-only overlay endpoint | 404 (text/html) | 404 (text/html) |
| `GET /_next/static/chunks/main.js` | Next.js static chunk dir | 404 (text/plain) | 404 (text/html) |

`/` のレスポンスヘッダ:

| ヘッダ | Next.js | React Router |
| --- | --- | --- |
| cache-control | private, no-cache, no-store, max-age=0, must-revalidate | - |
| content-encoding | gzip | gzip |
| content-type | text/html; charset=utf-8 | text/html; charset=utf-8 |
| transfer-encoding | chunked | chunked |
| vary | rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch, Accept-Encoding | Accept-Encoding |
| x-powered-by | Next.js | - |


## 8. 公開済み脆弱性の履歴（osv.dev, 取得日 2026-10-05）

パッケージ単位で osv.dev に登録されている advisory を集計。severity は GitHub Advisory Database のラベル。

| グループ | 対象パッケージ | 総数 | CRITICAL | HIGH | MODERATE | LOW |
| --- | --- | --- | --- | --- | --- | --- |
| Next.js | `next` | 67 | 5 | 26 | 28 | 8 |
| React Router | `react-router` `react-router-dom` `@react-router/dev` `@react-router/node` `@react-router/serve` | 21 | 1 | 11 | 8 | 1 |
| Remix v2 (React Router v7 の前身。参考値) | `@remix-run/react` `@remix-run/node` `@remix-run/server-runtime` `@remix-run/dev` | 6 | 1 | 3 | 1 | 1 |
| React Server Components runtime (Next が同梱、React Router は未使用) | `react-server-dom-webpack` `react-server-dom-turbopack` `react-server-dom-parcel` | 8 | 1 | 6 | 1 | 0 |

年別（CRITICAL + HIGH のみ）:

| グループ | 2017 | 2018 | 2020 | 2021 | 2022 | 2023 | 2024 | 2025 | 2026 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Next.js | 1 | 1 | 1 | 2 | 0 | 0 | 5 | 5 | 16 |
| React Router | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 10 |
| Remix v2 (React Router v7 の前身。参考値) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 4 |
| React Server Components runtime (Next が同梱、React Router は未使用) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 | 4 |

年別（全件）:

| グループ | 2017 | 2018 | 2020 | 2021 | 2022 | 2023 | 2024 | 2025 | 2026 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Next.js | 1 | 2 | 3 | 3 | 3 | 1 | 6 | 14 | 34 |
| React Router | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 19 |
| Remix v2 (React Router v7 の前身。参考値) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 6 |
| React Server Components runtime (Next が同梱、React Router は未使用) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 4 | 4 |

### Next.js: CRITICAL 一覧

| 公開日 | ID | CVE | 概要 | 修正版 |
| --- | --- | --- | --- | --- |
| 2026-09-30 | [GHSA-vcvr-r3jv-pc5j](https://osv.dev/vulnerability/GHSA-vcvr-r3jv-pc5j) | - | Next.js: Remote Code Execution in next/og ImageResponse | next: 16.3.6 |
| 2026-09-08 | [GHSA-2xp9-vwfh-vxw4](https://osv.dev/vulnerability/GHSA-2xp9-vwfh-vxw4) | - | Next.js: Unauthenticated Remote Code Execution in Image Optimization API when AVIF files are used | next: 15.5.24, 16.3.3 |
| 2026-09-08 | [GHSA-p293-qw3h-jr36](https://osv.dev/vulnerability/GHSA-p293-qw3h-jr36) | CVE-2026-75604 | Next.js: Unauthenticated Remote Code Execution on windows-hosted servers | next: 15.5.24, 16.3.3 |
| 2025-12-03 | [GHSA-9qr9-h5gf-34mp](https://osv.dev/vulnerability/GHSA-9qr9-h5gf-34mp) | - | Next.js is vulnerable to RCE in React flight protocol | next: 15.0.5, 15.1.9, 15.2.6, 15.3.6, 15.4.8, 15.5.7, 16.0.7 |
| 2025-03-21 | [GHSA-f82v-jwr5-mffw](https://osv.dev/vulnerability/GHSA-f82v-jwr5-mffw) | CVE-2025-29927 | Authorization Bypass in Next.js Middleware | next: 13.5.9, 14.2.25, 15.2.3, 12.3.5 |

### React Router: CRITICAL 一覧

| 公開日 | ID | CVE | 概要 | 修正版 |
| --- | --- | --- | --- | --- |
| 2026-01-08 | [GHSA-9583-h5hc-x8cw](https://osv.dev/vulnerability/GHSA-9583-h5hc-x8cw) | CVE-2025-61686 | React Router has Path Traversal in File Session Storage | @react-router/node: 7.9.4 |

### Remix v2 (React Router v7 の前身。参考値): CRITICAL 一覧

| 公開日 | ID | CVE | 概要 | 修正版 |
| --- | --- | --- | --- | --- |
| 2026-01-08 | [GHSA-9583-h5hc-x8cw](https://osv.dev/vulnerability/GHSA-9583-h5hc-x8cw) | CVE-2025-61686 | React Router has Path Traversal in File Session Storage | @remix-run/node: 2.17.2 |

### React Server Components runtime (Next が同梱、React Router は未使用): CRITICAL 一覧

| 公開日 | ID | CVE | 概要 | 修正版 |
| --- | --- | --- | --- | --- |
| 2025-12-03 | [GHSA-fv66-9v8q-g76r](https://osv.dev/vulnerability/GHSA-fv66-9v8q-g76r) | CVE-2025-55182 | React Server Components are Vulnerable to RCE | react-server-dom-webpack: 19.0.1, 19.1.2, 19.2.1<br>react-server-dom-turbopack: 19.0.1, 19.1.2, 19.2.1<br>react-server-dom-parcel: 19.0.1, 19.1.2, 19.2.1 |

直近 12 か月の CRITICAL / HIGH（全グループ）:

| 公開日 | グループ | severity | ID | 概要 |
| --- | --- | --- | --- | --- |
| 2026-09-30 | Next.js | CRITICAL | [GHSA-vcvr-r3jv-pc5j](https://osv.dev/vulnerability/GHSA-vcvr-r3jv-pc5j) | Next.js: Remote Code Execution in next/og ImageResponse |
| 2026-09-08 | Next.js | CRITICAL | [GHSA-2xp9-vwfh-vxw4](https://osv.dev/vulnerability/GHSA-2xp9-vwfh-vxw4) | Next.js: Unauthenticated Remote Code Execution in Image Optimization API when AVIF files are used |
| 2026-09-08 | Next.js | CRITICAL | [GHSA-p293-qw3h-jr36](https://osv.dev/vulnerability/GHSA-p293-qw3h-jr36) | Next.js: Unauthenticated Remote Code Execution on windows-hosted servers |
| 2026-07-24 | React Server Components runtime | HIGH | [GHSA-wx67-qw84-cm4g](https://osv.dev/vulnerability/GHSA-wx67-qw84-cm4g) | react-server-dom: Denial of Service in Server Functions |
| 2026-07-24 | React Router | HIGH | [GHSA-qwww-vcr4-c8h2](https://osv.dev/vulnerability/GHSA-qwww-vcr4-c8h2) | React Router: RSC Mode CSRF Bypass Allows Action Execution Before 400 Response |
| 2026-07-24 | React Router | HIGH | [GHSA-chx6-hx7r-mcp5](https://osv.dev/vulnerability/GHSA-chx6-hx7r-mcp5) | React Router: Unauthenticated Denial of Service via Inefficient Route Matching |
| 2026-07-22 | Next.js | HIGH | [GHSA-89xv-2m56-2m9x](https://osv.dev/vulnerability/GHSA-89xv-2m56-2m9x) | Next.js: Server-Side Request Forgery in Server Actions on custom servers |
| 2026-07-22 | Next.js | HIGH | [GHSA-p9j2-gv94-2wf4](https://osv.dev/vulnerability/GHSA-p9j2-gv94-2wf4) | Next.js: Server-Side Request Forgery in rewrites via attacker-controlled destination hostname |
| 2026-07-22 | Next.js | HIGH | [GHSA-6gpp-xcg3-4w24](https://osv.dev/vulnerability/GHSA-6gpp-xcg3-4w24) | Next.js: Middleware / Proxy bypass in App Router applications using Turbopack and single locale |
| 2026-07-22 | Next.js | HIGH | [GHSA-m99w-x7hq-7vfj](https://osv.dev/vulnerability/GHSA-m99w-x7hq-7vfj) | Next.js: Denial of Service in App Router using Server Actions |
| 2026-06-04 | React Router | HIGH | [GHSA-rxv8-25v2-qmq8](https://osv.dev/vulnerability/GHSA-rxv8-25v2-qmq8) | React Router vulnerable to Denial of Service via reflected user input in single-fetch |
| 2026-06-03 | Remix v2 | HIGH | [GHSA-8x6r-g9mw-2r78](https://osv.dev/vulnerability/GHSA-8x6r-g9mw-2r78) | React Router vulnerable to DoS via unbounded path expansion in __manifest endpoint |
| 2026-06-03 | React Router | HIGH | [GHSA-49rj-9fvp-4h2h](https://osv.dev/vulnerability/GHSA-49rj-9fvp-4h2h) | React Router's vendored turbo-stream v2 allows arbitrary constructor invocation via TYPE_ERROR deserialization leading to Unauth RCE |
| 2026-06-03 | React Router | HIGH | [GHSA-8646-j5j9-6r62](https://osv.dev/vulnerability/GHSA-8646-j5j9-6r62) | React Router vulnerable to XSS in unstable RSC redirect handling via javascript: redirect targets |
| 2026-05-11 | Next.js | HIGH | [GHSA-26hh-7cqf-hhc6](https://osv.dev/vulnerability/GHSA-26hh-7cqf-hhc6) | Next.js has a Middleware / Proxy bypass in App Router applications via segment-prefetch routes - Incomplete Fix Follow-Up |
| 2026-05-11 | Next.js | HIGH | [GHSA-mg66-mrh9-m8jx](https://osv.dev/vulnerability/GHSA-mg66-mrh9-m8jx) | Next.js vulnerable to Denial of Service via connection exhaustion in applications using Cache Components |
| 2026-05-11 | Next.js | HIGH | [GHSA-c4j6-fc7j-m34r](https://osv.dev/vulnerability/GHSA-c4j6-fc7j-m34r) | Next.js vulnerable to server-side request forgery in applications using WebSocket upgrades |
| 2026-05-11 | Next.js | HIGH | [GHSA-267c-6grr-h53f](https://osv.dev/vulnerability/GHSA-267c-6grr-h53f) | Next.js has a Middleware / Proxy bypass in App Router applications via segment-prefetch routes |
| 2026-05-11 | Next.js | HIGH | [GHSA-492v-c6pp-mqqv](https://osv.dev/vulnerability/GHSA-492v-c6pp-mqqv) | Next.js has a Middleware / Proxy bypass through dynamic route parameter injection |
| 2026-05-11 | Next.js | HIGH | [GHSA-36qx-fr4f-26g5](https://osv.dev/vulnerability/GHSA-36qx-fr4f-26g5) | Next.js has a Middleware / Proxy bypass in Pages Router applications using i18n |
| 2026-05-11 | Next.js | HIGH | [GHSA-8h8q-6873-q5fj](https://osv.dev/vulnerability/GHSA-8h8q-6873-q5fj) | Next.js Vulnerable to Denial of Service with Server Components |
| 2026-05-11 | React Server Components runtime | HIGH | [GHSA-rv78-f8rc-xrxh](https://osv.dev/vulnerability/GHSA-rv78-f8rc-xrxh) | Facebook React has a Denial of Service Vulnerability in React Server Components |
| 2026-04-10 | Next.js | HIGH | [GHSA-q4gf-8mx6-v5v3](https://osv.dev/vulnerability/GHSA-q4gf-8mx6-v5v3) | Next.js has a Denial of Service with Server Components |
| 2026-04-10 | React Server Components runtime | HIGH | [GHSA-479c-33wc-g2pg](https://osv.dev/vulnerability/GHSA-479c-33wc-g2pg) | React Server Components have a Denial of Service Vulnerability |
| 2026-01-29 | React Server Components runtime | HIGH | [GHSA-83fc-fqcc-2hmg](https://osv.dev/vulnerability/GHSA-83fc-fqcc-2hmg) | React Server Components have multiple Denial of Service Vulnerabilities |
| 2026-01-28 | Next.js | HIGH | [GHSA-h25m-26qc-wcjf](https://osv.dev/vulnerability/GHSA-h25m-26qc-wcjf) | Next.js HTTP request deserialization can lead to DoS when using insecure React Server Components |
| 2026-01-08 | React Router | HIGH | [GHSA-2w69-qvjg-hvjx](https://osv.dev/vulnerability/GHSA-2w69-qvjg-hvjx) | React Router vulnerable to XSS via Open Redirects |
| 2026-01-08 | Remix v2 | HIGH | [GHSA-8v8x-cx79-35w7](https://osv.dev/vulnerability/GHSA-8v8x-cx79-35w7) | React Router SSR XSS in ScrollRestoration |
| 2026-01-08 | Remix v2 | CRITICAL | [GHSA-9583-h5hc-x8cw](https://osv.dev/vulnerability/GHSA-9583-h5hc-x8cw) | React Router has Path Traversal in File Session Storage |
| 2026-01-08 | Remix v2 | HIGH | [GHSA-3cgp-3xvw-98x8](https://osv.dev/vulnerability/GHSA-3cgp-3xvw-98x8) | React Router has XSS Vulnerability |
| 2025-12-12 | Next.js | HIGH | [GHSA-5j59-xgg2-r9c4](https://osv.dev/vulnerability/GHSA-5j59-xgg2-r9c4) | Next has a Denial of Service with Server Components - Incomplete Fix Follow-Up |
| 2025-12-12 | React Server Components runtime | HIGH | [GHSA-7gmr-mq3h-m5h9](https://osv.dev/vulnerability/GHSA-7gmr-mq3h-m5h9) | Denial of Service Vulnerability in React Server Components |
| 2025-12-11 | Next.js | HIGH | [GHSA-mwv6-3258-q52c](https://osv.dev/vulnerability/GHSA-mwv6-3258-q52c) | Next Vulnerable to Denial of Service with Server Components |
| 2025-12-11 | React Server Components runtime | HIGH | [GHSA-2m3v-v2m8-q956](https://osv.dev/vulnerability/GHSA-2m3v-v2m8-q956) | Denial of Service Vulnerability in React Server Components |
| 2025-12-03 | React Server Components runtime | CRITICAL | [GHSA-fv66-9v8q-g76r](https://osv.dev/vulnerability/GHSA-fv66-9v8q-g76r) | React Server Components are Vulnerable to RCE |
| 2025-12-03 | Next.js | CRITICAL | [GHSA-9qr9-h5gf-34mp](https://osv.dev/vulnerability/GHSA-9qr9-h5gf-34mp) | Next.js is vulnerable to RCE in React flight protocol |

