# 記事骨子: とりあえず Next.js の選択肢に鉄槌を下す

- 媒体: クロスマート テックブログ (hatenablog)
- 著者: 福留
- 前作: [Remix v3 にコントリビュート（2025/12）](https://xmart-techblog.hatenablog.com/entry/2025/12/01/122639)
- 根拠リポジトリ: このリポジトリ（計測は `docs/results/COMPARISON.md`）

## 主張（1行）

鉄槌を下すのは Next.js ではなく「とりあえず」の方。フルスタックフレームワークは「使っていない機能」まで攻撃面と運用負荷として抱え込む。それを数字で見せる。

## 読者

- B2B 業務画面を React で作っている、フレームワーク選定に関わるエンジニア
- 「Next でいいでしょ」と言われて反論の材料が欲しい人
- 逆に Next を選んでいて、何をメンテ対象として抱えているか自覚したい人

## トーン

- 煽りはタイトルまで。本文は時系列と計測結果で淡々と殴る
- Next が合うケースは明示する（公平さが説得力になる）
- React Router 側の脆弱性も隠さない（2026 年だけで 19 件、HIGH 10 件。XSS・DoS・path traversal）

---

## 1. 導入: 毎月届く「またか」

- 2026/9 の 1 か月で Next.js の Critical が 3 件（AVIF RCE、Windows RCE、`next/og` RCE）。times の「またRemoteCode injection系か」から入る
- 全部「うちは使っていない」機能だった、という感覚
  - 画像最適化は使っていない / og 画像は作っていない / Windows でホストしていない
- それでも `npm audit` は赤くなり、パッチ追従の PR を切る。この「使っていない機能のためのアップデート」が本記事のテーマ
- （趣味サイトを Next で作っている場合）自分も当事者、という一文

## 2. 事実: この 1 年の Next.js Critical を時系列で

| 公開 | ID | 内容 | 影響する機能 |
| --- | --- | --- | --- |
| 2025/03 | CVE-2025-29927 | Middleware 認可バイパス | middleware |
| 2025/12 | CVE-2025-55182 (React2Shell) | RSC flight protocol 経由の未認証 RCE | RSC ランタイム (react-server-dom-*) |
| 2026/09/08 | GHSA-2xp9-vwfh-vxw4 | AVIF 画像最適化で未認証 RCE (libheif) | Image Optimization |
| 2026/09/08 | CVE-2026-75604 | Windows ホストで未認証 RCE | Pages/App Router 併用 |
| 2026/09/30 | GHSA-vcvr-r3jv-pc5j | `next/og` ImageResponse で RCE | OG 画像生成 |

- 加えて 2026 年は HIGH が 16 件（Middleware/Proxy バイパス 5 件、Server Actions 経由の SSRF/DoS、RSC DoS 連発）
- Vercel にホストしていれば WAF/プラットフォーム側で守られる範囲があることは書く。**セルフホスト（うち）で刺さるのはどれか**を分けて示す
- 出典: osv.dev 集計 → `docs/results/COMPARISON.md` §8

## 3. 公平に: React Router 側の履歴も並べる

- 2026 年の advisory は 19 件。HIGH 10 件、CRITICAL 1 件（file session storage の path traversal）
- 性質の違い: XSS、open redirect、`__manifest` の DoS、そして turbo-stream デシリアライズ経由の未認証 RCE が 1 件（HIGH 判定）。Next は CRITICAL の RCE が 1 年で 4 件
- ここで「どちらにも脆弱性はある。差は"攻撃面の種類と量"」と視点を切り替える

## 4. 実験: 同じアプリを両方で作って、何を抱え込むか数える

### 4.1 題材

- 商品カタログ（一覧・検索・詳細・予約フォーム・JSON API・404・エラー境界）。DB なし、インメモリ
- 両方とも公式 CLI の既定テンプレートから。設定はほぼ触らない（「とりあえず」の再現）
- 同じ Playwright スペック 41 件が両方で通り、`/` と詳細ページの本文テキストと API の JSON が完全一致することを機械的に確認している（parity テスト）
- リポジトリ: （URL）

### 4.2 書いたコードはほぼ同じ

- ファイル数・行数の表（§2）
- Server Action + `useActionState` と `action` + `<Form>` のコード比較を 1 画面分だけ載せる
  - どちらも JS 無効で動く。「RSC がないと progressive enhancement ができない」は誤解

### 4.3 抱え込むものは違う

- 本番依存パッケージ数とサイズ（§3）
- RSC ランタイム、sharp/libvips をデフォルトで同梱するのは Next だけ
  - React2Shell と AVIF RCE はまさにこの 2 つに刺さった
- デプロイ一式のサイズ（standalone vs build + node_modules）（§4）

### 4.4 露出している口

- アプリが定義していないパスに何が返るか（§7）
  - `/_next/image?url=...`: 画像最適化エンドポイントは `next/image` を 1 回でも使えば生える。使っていなくてもデフォルト有効
  - `POST /` + `Next-Action` ヘッダ: Server Action の受け口
  - `?_rsc=` / `RSC: 1`: flight payload
  - React Router 側: `/__manifest`、`.data` リクエスト。これも 2026 年に DoS を食らった口
- 「表面積 = 自分が書いたルート + フレームワークが生やす口」。後者は自分でコントロールできない

### 4.5 ビルドと起動

- クリーンビルド時間、コールドスタート、RSS、p50/p95（§4, §5）
- ここは差があっても「業務画面では誤差」と正直に書く。主張の中心ではない

### 4.6 ページ重量

- `/` と詳細の JS 転送量（§6）
- RSC の恩恵（クライアント JS 減）が出るほどの画面ではない、という結果ならそう書く

### 4.7 細かいが地味に効く差

- Next はサーバコードをルート単位で分割するので、モジュールスコープのシングルトンがルート間で複製される（`.next/server` 内に `@catalog/data` が 4 チャンク）。`globalThis` に逃がすしかない。Vite SSR は単一バンドル
- `next build` が TypeScript と ESLint を内蔵で走らせる vs 自分で `tsc` を呼ぶ
- `X-Powered-By: Next.js` が既定で付く（§7 ヘッダ表）

## 5. 「とりあえず Next」が隠しているコスト（本論）

1. **使っていない機能の攻撃面**: Image Optimization / og / RSC / middleware は opt-out ではなく opt-in されている
2. **パッチ追従の運用負荷**: 2026 年は月 1 回以上のセキュリティリリース。16.x / 15.x 両系統にバックポート、`backport` dist-tag の存在
3. **抽象の重さ**: RSC + Server Actions + キャッシュ階層は、B2B 業務画面の要件（認証付き CRUD、BFF は別にある）に対して過剰
4. **選ぶ側の責任は薄いフレームワークにもある**: React Router 側も XSS/DoS を踏んでいる。自分たちで `sessionStorage` や `__manifest` を理解して使う必要がある。「薄いから安全」ではなく「抱えているものを把握できる」が利点

## 6. 判断基準（表）

| 観点 | Next が合う | React Router が合う |
| --- | --- | --- |
| ホスティング | Vercel 前提 | セルフホスト / コンテナ / 任意の Node ランタイム |
| 画像 | 外部画像の最適化が本当に必要 | CDN や画像サービスに任せる |
| レンダリング | ISR / PPR / 静的生成の混在が必要 | SSR + クライアント遷移で十分 |
| API | Route Handler で完結させたい | BFF / API が別にある |
| チーム | 既に App Router に習熟 | Remix / RR の loader-action モデルに慣れている |
| 更新頻度 | 月次のセキュリティ更新を回せる体制がある | 依存を少なく保ちたい |

## 7. 締め

- 鉄槌は選択肢を消すことではなく「とりあえず」を消すこと
- 「Next を選ぶなら、画像最適化・og・RSC・middleware それぞれを本当に使うか、使わないなら無効化できるかを選定時に書き出す」という具体的な宿題で終える
- 12 月の Remix v3 記事への導線

---

## 実測値の要点（記事に載せる数字の候補。正確な値は `docs/results/COMPARISON.md`）

同じ 41 件の E2E が通る同一仕様アプリ同士の比較。環境はクラウドコンテナ 1 台、絶対値より比を見る。

| 観点 | Next.js 16.3 | React Router 8.4 | 読み方 |
| --- | --- | --- | --- |
| 書いたコード（非空行） | 約 390 行 / 17 ファイル | 約 380 行 / 14 ファイル | ほぼ同じ。開発体験の差は主張しない |
| 本番依存パッケージ数 | 59 | 92 | 数は RR の方が多い（express 系が入るため）。数で殴らない |
| 本番依存のディスクサイズ | 約 430 MB | 約 36 MB | 約 12 倍。sharp/libvips 2 種 + swc バイナリ + vendored React が主因 |
| RSC ランタイム同梱 | あり（`next/dist/compiled`） | なし | React2Shell が刺さる口があるかどうか |
| sharp / libvips 同梱 | あり | なし | AVIF RCE が刺さる口があるかどうか |
| クリーンビルド | 約 11 秒 | 約 2 秒 | Next は tsc + eslint を内蔵で回す分も含む。公平に注記 |
| デプロイ一式 | 約 205 MB (standalone) | 約 38 MB (build + prod node_modules) | 約 5 倍 |
| コールドスタート | 約 950 ms | 約 700 ms | 誤差の範囲と書く |
| RSS | 約 240 MB | 約 160 MB | 参考値 |
| `/` の JS 転送量 (gzip) | 約 140 KB | 約 100 KB | この規模では RSC によるクライアント JS 削減効果は出ない |
| `/` の画像転送量 | 約 16 KB (webp に最適化) | 約 80 KB (PNG そのまま) | 画像最適化の恩恵は本物。だから「使うなら使う、使わないなら切る」 |
| p50 レイテンシ `/` | 約 7.5 ms | 約 5 ms | 誤差。API は Next の方が速い（約 2.2 ms vs 2.7 ms）。正直に書く |

露出している口（アプリが定義していないのに 404 以外を返すパス）:

| 口 | Next.js | React Router |
| --- | --- | --- |
| `/_next/image?url=...` 画像最適化（AVIF/WebP 変換まで動く） | 200 | 404 |
| `POST /` + `Next-Action` ヘッダ（Server Action 受け口） | 受け付けて id 不一致で 404 | 405 |
| `RSC: 1` ヘッダ（flight payload） | `_rsc=<hash>` へ 307 → payload | 通常 HTML |
| `/__manifest?p=...`（lazy route discovery。2026 年に DoS） | 404 | 204 |
| `/products/:id.data`（single-fetch。2026 年に DoS） | 404 | 200 |
| `X-Powered-By: Next.js` ヘッダ | 付く | 付かない |

脆弱性履歴（osv.dev、2026-10-05 取得）:

| | Next.js (`next`) | React Router (5 パッケージ) | RSC runtime (`react-server-dom-*`) |
| --- | --- | --- | --- |
| 総数 | 67 | 21 | 8 |
| CRITICAL / HIGH | 5 / 26 | 1 / 11 | 1 / 6 |
| 2026 年の CRITICAL+HIGH | 16 | 10 | 4 |
| 直近 12 か月の未認証 RCE | 4（RSC flight, AVIF, Windows, next/og。全部 CRITICAL） | 1（turbo-stream デシリアライズ。HIGH 判定、7.14.2 で修正） | 1（React2Shell。Next 側で踏む） |
| CRITICAL の中身 | RCE ×4、middleware 認可バイパス ×1 | file session storage の path traversal ×1 | RCE ×1 |

数字の使い方の注意:

- 「依存パッケージ数」は RR の方が多い。数で殴ると自分に返ってくるので、サイズと中身（ネイティブバイナリ、vendored runtime）で語る
- 「React Router は 2026 年に 19 件」は必ず書く。隠すと信頼を失う
- レイテンシ・コールドスタートは「差はあるが業務画面では誤差」で片付ける。主戦場にしない

## 執筆メモ

- 数字は `pnpm advisories && pnpm measure && pnpm report` で再生成できる。記事の表はすべて `docs/results/COMPARISON.md` から転記する
- 脆弱性の一次情報リンク
  - https://nextjs.org/blog/august-2026-security-release
  - https://osv.dev/vulnerability/GHSA-vcvr-r3jv-pc5j (next/og RCE)
  - https://osv.dev/vulnerability/GHSA-2xp9-vwfh-vxw4 (AVIF RCE)
  - https://osv.dev/vulnerability/GHSA-p293-qw3h-jr36 (Windows RCE)
  - https://osv.dev/vulnerability/GHSA-9qr9-h5gf-34mp (React2Shell / Next)
  - https://osv.dev/vulnerability/GHSA-fv66-9v8q-g76r (CVE-2025-55182 / react-server-dom)
  - https://osv.dev/vulnerability/GHSA-9583-h5hc-x8cw (React Router path traversal, CRITICAL)
  - https://osv.dev/vulnerability/GHSA-8x6r-g9mw-2r78 (React Router `__manifest` DoS)
- 検証済みの事実（2026-10-05、next@16.3.8）: `next/image` を一行も使わなくても `/_next/image` は 200 を返し webp 変換も動く。`images.unoptimized: true` で 404 になる。記事の「使っていなくても抱える」の一次証拠
- 会社ブログとして避けること: Vercel への人格攻撃、「Next は終わり」系の断定。数字と機能の対応関係だけで語る
- 想定文字数: 6,000〜8,000 字。表は 5 つまで
