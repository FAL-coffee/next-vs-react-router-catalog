# 記事骨子: とりあえず Next.js の選択肢に鉄槌を下す 〜SPA で足りないのはどこか、全部作って確かめた〜

- 媒体: クロスマート テックブログ (hatenablog)
- 著者: 福留
- 前作: [Remix v3 にコントリビュート（2025/12）](https://xmart-techblog.hatenablog.com/entry/2025/12/01/122639)、[Next.js 13 app ディレクトリ敵情調査（2023, Qiita）](https://qiita.com/FAL-coffee/items/e4bcc16b065a737c9537)
- 根拠リポジトリ: このリポジトリ（計測 `docs/results/COMPARISON.md`、機能対応表 `docs/feature-matrix.md`）

## 主張（1行）

「とりあえず Next.js」は、SSR が要るかどうかの判断を飛ばして、Next.js が同梱する機能を全部抱え込む選び方。Next の機能を一つずつ SPA で再現してみると、本当に SPA で足りないのは 4 つしか残らない。

## 読者

- B2B 業務画面を React で作っていて、フレームワーク選定に関わるエンジニア
- 「Next でいいでしょ」と言われて反論の材料が欲しい人
- Next を選んでいて、何をメンテ対象として抱えているか自覚したい人

## トーン

- 煽りはタイトルまで。本文は時系列・実装・計測で淡々と
- Next が合うケース（残った 4 つ）は明示する
- SPA 側の傷も隠さない: TanStack の 2026/5 サプライチェーン事件、Hono の 2026 年 47 件（ほぼ opt-in ミドルウェア）

---

## 1. 導入: 毎月届く「またか」

- 2026/9 の 1 か月で Next.js の Critical が 3 件（AVIF RCE、Windows RCE、`next/og` RCE）
- 全部「うちでは使っていない機能」に刺さった、という感覚
- 「使っていない機能のためにアップデートする」作業はいつから当たり前になったのか
- 立ち位置: 2023 年に app ディレクトリを酔って調査した人間。会社では Remix v2 → React Router。今回はさらに「SPA で足りるのでは」と疑ってみた

## 2. 事実: この 1 年の Next.js Critical（時系列表）

- 5 件、うち未認証 RCE 4 件。刺さった機能列を必ず付ける（middleware / RSC / Image Optimization / Pages+App 併用 / next/og）
- 2026 年の HIGH 16 件の内訳（Middleware バイパス 5、Server Actions SSRF/DoS、RSC DoS）
- Vercel ホストなら守られた期間がある、は書く。セルフホストに刺さるのはどれかを分ける

## 3. 問い直し: その機能、うちは使ってる？

- 「とりあえず Next」が飛ばしている判断 = **ステップ 0: そもそも SSR が要るか**
- Next を選んだ時点で SSR + RSC + Server Actions が既定になる。プロダクト要件を見る前にレンダリング方式が決まる
- だから Next の機能を一つずつ「SPA + API で再現したらどうなるか」試した、という実験の動機

## 4. 実験: 同じカタログを Next.js と TanStack Router SPA で作る

### 4.1 題材と仕様

- 商品カタログ。一覧・検索・クイックビュー（モーダル）・詳細・予約・JSON API・404・エラー境界
- DB なし。インメモリ在庫
- Next は create-next-app 既定、SPA は @tanstack/cli 既定 + Hono の API。設定はほぼ触らない
- 画面・DOM・data-testid は同一

### 4.2 Next 側に「テクい機能」をわざと盛った

- Parallel Route + Intercepting Route でクイックビュー（2023 年に「はあ？」と言ったやつ）
- Server Action で予約
- `next/og` で OG 画像
- `next/image` は既定のまま

### 4.3 機能ごとに SPA で再現した結果（記事の本体。`docs/feature-matrix.md` の表）

- 再現コスト 0〜低: SSR 不要なら消える / RSC → コード分割 / Server Actions → fetch / Route Handler → Hono / Parallel+Intercepting → search param + route masking / middleware → beforeLoad（本体の認可は API）/ prefetch / 型付きルート
- 再現コスト中〜高: Image Optimization（CDN の仕事）/ OG 画像（別サービス）
- 不可: JS 無効フォーム / 正しい 404 ステータス
- コード比較は 2 箇所だけ載せる: (a) クイックビュー（intercepting route vs route masking）、(b) 予約フォーム（Server Action vs fetch）

### 4.4 抱え込むもの（計測）

- 本番依存のサイズ、sharp/libvips と RSC ランタイムの同梱、デプロイ一式、ビルド時間（`COMPARISON.md` §3-4）
- 「パッケージ数」は Hono の express 非依存で SPA 側が少ないはず。数ではなく中身で語る

### 4.5 露出している口（計測 §7）

- `/_next/image`（next/image を使わなくても開く、`images.unoptimized: true` で閉じる。検証済み）
- `/products/:id/opengraph-image`（next/og。9 月に RCE が刺さった口）
- `POST /` + `Next-Action`
- `RSC: 1`
- SPA 側で開いている口: `/api/*` だけ。それ以外は 404

### 4.6 ランタイム・ページ重量（誤差の範囲として短く）

### 4.7 地味に刺さった差

- Next のサーバコード分割でモジュールスコープのシングルトンが複製される → `globalThis`
- React 19 は Server Action 完了後にフォームをリセットする（予約エラー後に数量が初期値に戻る）
- TanStack は search を JSON として読む（`?fail=1` が数値になる）
- TanStack の `errorComponent` はルートに伝播しない（`defaultErrorComponent` を使う）
- 404 の HTTP ステータスは SPA では返せない

## 5. SPA 側の傷も並べる

- TanStack: 2026/5 に `@tanstack/*` へ悪性コードが混入（供給網）。「薄いから安全」ではない
- Hono: 2026 年 47 件、HIGH 9。ただし JWT / CORS / serveStatic / JSX / SSG など **opt-in ミドルウェア**がほぼ全部。今回の API は一つも使っていない。つまり「表面積 = 使っている機能」は API 側でも成り立つ。Next との違いは「既定で有効か」

## 6. 残ったもの: Next.js が本当に必要なとき

1. 未ログインで見られる公開ページの初期 HTML（SEO、初期表示）
2. SNS シェア用の OG 画像
3. JS 無効でも動くフォーム
4. クローラに返す正しい 404

これが無いプロダクトは、Next の機能を全部「過剰」として抱えている。クロスオーダーの発注画面は 4 つとも無い

## 7. 判断手順（2 段）

- ステップ 0: SSR が要るか（上の 4 つのどれかがあるか）
- ステップ 1: 要らないなら SPA + API（TanStack Router / React Router SPA mode）。要るなら Next か React Router framework mode。Next を選ぶなら「画像最適化・og・middleware を使うか、使わないなら無効化するか、セキュリティリリースを誰が追従するか」を書き出す

## 8. まとめ

- 鉄槌は選択肢を消すことではなく「とりあえず」を消すこと
- 「うちは SSR フレームワークすら本来は要らなかった。RR を選んだのは loader/action の書き味のため」と正直に書く
- 採用ページへ

---

## 実測値の要点（記事に載せる数字の候補。正確な値は `docs/results/COMPARISON.md`）

| 観点 | Next.js 16.3 | TanStack Router SPA + Hono API | 読み方 |
| --- | --- | --- | --- |
| 書いたコード（非空行） | 473 行 / 22 ファイル | 659 行 / 22 ファイル | SPA の方が多い。API 本体と fetch 層の分。隠さない |
| 本番依存パッケージ数 / サイズ | 59 / 428 MB | 15 / 13.5 MB | 32 倍。sharp/libvips、SWC、vendored React+RSC が主因 |
| RSC ランタイム同梱 | あり | なし | React2Shell が刺さる口 |
| sharp / libvips 同梱 | あり | なし | AVIF RCE が刺さる口 |
| クリーンビルド | 12.6 秒 | 2.7 秒 | Next は tsc + eslint 内蔵。注記する |
| デプロイ一式 | 205 MB (standalone) | 1.8 MB (静的 + API + その依存) | 100 倍超。S3 に置けるサイズ |
| コールドスタート | 970 ms | 550 ms | 参考値 |
| RSS | 292 MB | 72 MB | 参考値 |
| `/` の HTML | 24.6 KB | 0.8 KB | SSR の有無そのもの |
| `/` の JS (gzip) | 143 KB | 92 KB | RSC で減るどころか増えている |
| `/` の画像 | 16 KB (webp) | 80 KB (PNG) | 画像最適化の恩恵は本物 |
| p50 `/` | 8.6 ms | 0.8 ms | SSR と静的配信の差。公平に書く |
| p50 `/api/products` | 2.4 ms | 0.9 ms | Hono 速い。主戦場にしない |

露出している口（アプリが定義していないのに 404 以外を返すパス）:

| 口 | Next.js | SPA + API |
| --- | --- | --- |
| `/_next/image`（WebP 変換まで動く） | 200 | 404 |
| `/products/:id/opengraph-image`（next/og） | 200 | 404 |
| `POST /` + `Next-Action` | 受け付けて 404 | 404 |
| `RSC: 1` ヘッダ | 200 text/x-component | 404 |
| `POST /api/products/:id/reserve` | 404（Server Action 経由のみ） | 200 |

脆弱性履歴（osv.dev、2026-10-05）:

| | Next.js | TanStack Router | Hono | RSC runtime |
| --- | --- | --- | --- | --- |
| 総数 | 67 | 5 | 57 | 8 |
| CRITICAL / HIGH | 5 / 26 | 1 / 0 | 0 / 9 | 1 / 6 |
| 2026 年 | 34 | 5（全部 5 月の供給網事件） | 47（ほぼ opt-in ミドルウェア） | 4 |
| 未認証 RCE（直近 12 か月） | 4 | 0（供給網はコード脆弱性と別枠） | 0 | 1 |

## 執筆メモ

- 数字は `pnpm advisories && pnpm measure && pnpm report` で再生成できる
- 検証済みの事実（2026-10-05、next@16.3.8）: `next/image` を一行も使わなくても `/_next/image` は 200 を返し webp 変換も動く。`images.unoptimized: true` で 404 になる
- 一次情報リンク
  - https://nextjs.org/blog/august-2026-security-release
  - https://osv.dev/vulnerability/GHSA-vcvr-r3jv-pc5j (next/og RCE)
  - https://osv.dev/vulnerability/GHSA-2xp9-vwfh-vxw4 (AVIF RCE)
  - https://osv.dev/vulnerability/GHSA-p293-qw3h-jr36 (Windows RCE)
  - https://osv.dev/vulnerability/GHSA-9qr9-h5gf-34mp (React2Shell / Next)
  - https://osv.dev/vulnerability/GHSA-fv66-9v8q-g76r (CVE-2025-55182 / react-server-dom)
  - https://osv.dev/vulnerability/GHSA-g7cv-rxg3-hmpx (@tanstack/* malware)
  - https://osv.dev/vulnerability/GHSA-88fw-hqm2-52qc (Hono CORS)
  - https://osv.dev/vulnerability/GHSA-q5qw-h33p-qvwr (Hono serveStatic)
- 会社ブログとして避けること: Vercel への人格攻撃、「Next は終わり」系の断定。数字と機能の対応関係だけで語る
- 想定文字数: 7,000〜9,000 字。表は 5 つまで
