# とりあえずNext.jsの選択肢に鉄槌を下す 〜同じアプリを2回作って、何を抱え込むか数えてみた〜

# はじめに

お疲れ様です。クロスマート株式会社でフロントエンドのタスクを主に担当しております。ナイスガイの福留です。

フロントエンジニアの皆様方、最近 `npm audit` は赤いですか？

赤いですよね。私も赤いです。

2026年9月、Next.js の Critical が1か月で3件出ました。AVIF 画像最適化の未認証 RCE、Windows ホストの未認証 RCE、`next/og` の RCE です。
Dependabot と GitHub の Security Alert が毎週のように「Next.js の脆弱性が見つかりました」と教えてくれるので、最近は通知を見た瞬間に「またか」と口から出るようになりました。

ここで少し冷静になって考えてみると、不思議なことに気づきます。

**全部、うちでは使っていない機能なんです。**

画像最適化は使っていない。og 画像は生成していない。Windows でホストもしていない。
それでも alert は飛んでくるし、パッチ追従の PR は切らないといけない。

「使っていない機能のためにアップデートする」という作業を、私たちはいつから当たり前だと思うようになったんでしょうか。

ちなみに私自身は、3年前に[酔った勢いで Next.js 13 の app ディレクトリを敵情調査した記事](https://qiita.com/FAL-coffee/items/e4bcc16b065a737c9537)を書いたくらいには Next.js に興味がある人間です。
会社の PJ では Remix v2 を選定し、現在は React Router に完全移行済みです。
つまり本記事は、「とりあえず Next.js」を選ばなかった側の人間が、その選択を数字で検算してみた記事になります。

タイトルは煽っていますが、鉄槌を下すのは Next.js ではなく「とりあえず」の方です。
最後まで読んでいただければ幸いに存じます。

## この記事の対象読者

- React でB2B の業務画面を作っていて、フレームワーク選定に関わる方
- 「Next でいいでしょ」と言われたときの反論材料が欲しい方
- 逆に、Next.js を選んでいて、自分が何をメンテ対象として抱えているのか自覚したい方

## この記事を読んでわかること

- この1年で Next.js と React Router にそれぞれ何件の脆弱性が出て、どの機能に刺さったのか
- 同じ仕様のアプリを両方で作ったとき、依存・ビルド・デプロイ一式・露出エンドポイントがどう違うか
- フルスタックフレームワークを「とりあえず」で選ぶと、何を抱え込むことになるのか

## 書かないこと

- Next.js と React Router の基本的な書き方
- Vercel への人格攻撃
- 「Next.js は終わり」のような断定

# 事実: この1年の Next.js Critical を時系列で並べる

まず感情を抜きにして、osv.dev に登録されている advisory を並べます。

| 公開 | ID | 内容 | 刺さった機能 |
| --- | --- | --- | --- |
| 2025/03 | [CVE-2025-29927](https://osv.dev/vulnerability/GHSA-f82v-jwr5-mffw) | Middleware の認可バイパス | middleware |
| 2025/12 | [GHSA-9qr9-h5gf-34mp](https://osv.dev/vulnerability/GHSA-9qr9-h5gf-34mp)（React2Shell） | RSC flight protocol 経由の未認証 RCE | RSC ランタイム |
| 2026/09/08 | [GHSA-2xp9-vwfh-vxw4](https://osv.dev/vulnerability/GHSA-2xp9-vwfh-vxw4) | AVIF 画像最適化で未認証 RCE（libheif） | Image Optimization |
| 2026/09/08 | [CVE-2026-75604](https://osv.dev/vulnerability/GHSA-p293-qw3h-jr36) | Windows ホストで未認証 RCE | Pages/App Router 併用 |
| 2026/09/30 | [GHSA-vcvr-r3jv-pc5j](https://osv.dev/vulnerability/GHSA-vcvr-r3jv-pc5j) | `next/og` ImageResponse で RCE | OG 画像生成 |

Critical だけで5件、うち4件が未認証の RCE です。
加えて 2026 年は HIGH が 16 件あり、内訳は Middleware/Proxy バイパスが5件、Server Actions 経由の SSRF と DoS、RSC の DoS が連発、といった具合です。

公平のために書いておくと、Vercel にホストしていればプラットフォーム側の WAF で守られた期間があるものも含まれています。
ただ、弊社のようにセルフホスト（ECS Fargate）している場合、守ってくれるのは自分たちの `pnpm update` だけです。

# 公平に: React Router 側の履歴も並べる

「じゃあ React Router は安全なのか」と言われると、そんなことはありません。
ここを隠すと記事の信頼性が死ぬので、ちゃんと書きます。

React Router 系5パッケージ（`react-router`, `react-router-dom`, `@react-router/dev`, `@react-router/node`, `@react-router/serve`）の advisory は 2026 年だけで 19 件、うち HIGH 10 件、CRITICAL 1 件です。

| 公開 | ID | 内容 |
| --- | --- | --- |
| 2026/01 | [CVE-2025-61686](https://osv.dev/vulnerability/GHSA-9583-h5hc-x8cw) | File Session Storage の path traversal（CRITICAL） |
| 2026/01 | [CVE-2026-21884](https://osv.dev/vulnerability/GHSA-8v8x-cx79-35w7) | ScrollRestoration の SSR XSS |
| 2026/06 | [CVE-2026-42342](https://osv.dev/vulnerability/GHSA-8x6r-g9mw-2r78) | `__manifest` エンドポイントの DoS |
| 2026/06 | [CVE-2026-42211](https://osv.dev/vulnerability/GHSA-49rj-9fvp-4h2h) | vendored turbo-stream のデシリアライズで未認証 RCE |
| 2026/06 | [CVE-2026-34077](https://osv.dev/vulnerability/GHSA-rxv8-25v2-qmq8) | single-fetch の DoS |

XSS、open redirect、DoS、path traversal、そして turbo-stream の未認証 RCE が1件。
「薄いフレームワークだから安全」というのは嘘です。

では何が違うのか。

**刺さった機能が、自分で選んで使っているものかどうか**です。

File Session Storage は使うと決めた人だけが使います。`__manifest` と `.data` リクエストは framework mode の仕組みそのものなので、これは React Router 側の「抱えている口」です（後述の計測で実際に叩きます）。
一方で Next.js の Image Optimization、`next/og`、RSC ランタイムは、`create-next-app` した瞬間に全員が抱えます。使っていなくても。

この「使っていなくても抱える」を、感覚ではなく数字にしたくなったので、同じアプリを2回作りました。

# 実験: 同じアプリを Next.js と React Router で作る

## 題材

商品カタログです。DB は使わず、JSON とインメモリの在庫で動きます。

| 機能 | Next.js 16（App Router） | React Router 8（framework mode） |
| --- | --- | --- |
| `/` 一覧 + 検索（`?q=&category=`） | Server Component + `searchParams` | `loader` + `request.url` |
| `/products/:id` 詳細 | 動的ルート + `generateMetadata` + `notFound()` | 動的ルート + `meta` + `throw data(404)` |
| 予約フォーム（POST で在庫を減らす） | Server Action + `useActionState` | `action` + `<Form method="post">` |
| `/api/products` JSON API | Route Handler | resource route |
| 404 / エラー境界 | `not-found.tsx` / `error.tsx` | root `ErrorBoundary` + catch-all |
| 画像 | `next/image`（既定の最適化を有効のまま） | 素の `<img>` |

ルールはひとつ。**どちらも公式 CLI の既定テンプレートから始めて、設定をほぼ触らない。**
「とりあえず」を再現するためです（Next は `transpilePackages` と `output: "standalone"` だけ足しました）。

そして「同じアプリ」であることを気合いではなく機械で保証するために、同じ Playwright スペック 41 件を両方に当てています。
さらに parity テストとして、両サーバに同じリクエストを投げて `/` と詳細ページの本文テキスト、API の JSON が**完全一致**することを確認しています。
JavaScript を切っても検索と予約が動くこともテストに入れました。

リポジトリはこちらです。`pnpm measure && pnpm report` で以下の数字は全部再現できます。

https://github.com/FAL-coffee/next-vs-react-router-catalog

## 書いたコードはほぼ同じ

| | Next.js | React Router |
| --- | --- | --- |
| ファイル数 | 17 | 14 |
| 非空行数 | 394 | 380 |

正直、ここに差はありません。
予約フォームのサーバ側を並べるとこうなります。

Next.js（Server Action）:

```ts
"use server";

export async function reserveAction(_prev: ReserveState, formData: FormData): Promise<ReserveState> {
  const id = String(formData.get("id") ?? "");
  const quantity = Number(formData.get("quantity") ?? 0);
  const result = reserveProduct(id, quantity);
  if (!result.ok) return { status: "error", message: result.error };
  revalidatePath(`/products/${id}`);
  revalidatePath("/");
  return { status: "ok", message: `${result.product.name} を ${result.quantity} 点予約しました` };
}
```

React Router（action）:

```ts
export async function action({ request, params }: Route.ActionArgs) {
  const formData = await request.formData();
  const quantity = Number(formData.get("quantity") ?? 0);
  const result = reserveProduct(params.id, quantity);
  if (!result.ok) {
    return data({ status: "error" as const, message: result.error }, { status: 400 });
  }
  return { status: "ok" as const, message: `${result.product.name} を ${result.quantity} 点予約しました` };
}
```

書き味はどちらも悪くないです。
「RSC がないと progressive enhancement できない」と思われがちですが、どちらも JS 無効で予約まで通ります。
開発体験で殴り合う記事ではないので、ここはこれで終わりです。

## 抱え込むものは全然違う

ここからが本題です。

| | Next.js | React Router | 比 |
| --- | --- | --- | --- |
| 本番依存パッケージ数 | 59 | 92 | 0.6x |
| 本番依存のディスクサイズ | 428 MB | 36 MB | 11.9x |
| RSC ランタイム（`react-server-dom-*`）を同梱 | はい（`next/dist/compiled`） | いいえ | |
| sharp / libvips（ネイティブ画像処理）を同梱 | はい | いいえ | |
| クリーンビルド時間 | 約 11 秒 | 約 1.5 秒 | 7x |
| デプロイ一式 | 205 MB（standalone） | 38 MB（build + prod node_modules） | 5.4x |

パッケージ「数」は React Router の方が多いです。`@react-router/serve` が express を連れてくるためですね。
なので数で殴るのはやめておきます。自分に返ってくるので。

見てほしいのはサイズと中身です。
Next.js の 428 MB の正体は、sharp + libvips（linux-x64 と linuxmusl の2種類）、SWC のネイティブバイナリ、そして vendored された React と RSC ランタイムです。

そしてこの中の **sharp/libvips と RSC ランタイムが、まさに AVIF RCE と React2Shell が刺さった場所**です。
`next/image` を使う・使わないに関わらず、`create-next-app` した時点で node_modules に入っています。

（ビルド時間については、Next.js は `next build` の中で `tsc` と ESLint も走らせているので、7倍という数字をそのまま受け取るのは不公平です。でも体感で「遅いな」とは思います。）

## 露出している口を数える

ここが一番書きたかった部分です。

アプリが定義していないパスに対して、両サーバが何を返すかを調べました。
`404` 以外が返るものは、自分のコードとは無関係にフレームワークが生やしている口です。

| リクエスト | 意味 | Next.js | React Router |
| --- | --- | --- | --- |
| `GET /_next/image?url=/images/x.png&w=640&q=75` | 画像最適化 | **200** (image/png) | 404 |
| 同上 + `Accept: image/avif,image/webp` | 画像最適化（フォーマット変換まで動く） | **200** (image/webp) | 404 |
| `GET /` + `RSC: 1` ヘッダ | RSC flight payload | **200** (text/x-component) | 200 (ただの HTML) |
| `POST /` + `Next-Action` ヘッダ | Server Action の受け口 | **受け付けて id 不一致で 404** | 405 |
| `GET /__manifest?p=/&version=0` | lazy route discovery | 404 | **204** |
| `GET /products/x.data` | single-fetch データリクエスト | 404 | **200** (text/x-script) |

Next.js 側を見てください。
`/_next/image` に外から任意の `url` と `w` と `q` を渡せて、しかも `Accept` ヘッダ次第で webp への変換まで走ります。
2026年9月の AVIF RCE はここに刺さりました。

「それは `next/image` を使っているからでしょ」と思った方。私もそう思ったので、`next/image` を一行も使わない状態でビルドし直して叩いてみました。

| 状態 | `GET /_next/image?url=/images/x.png&w=640&q=75` | 同上 + `Accept: image/webp` |
| --- | --- | --- |
| `next/image` を使っている（今回のアプリ） | 200 (image/png) | 200 (image/webp) |
| `next/image` を一行も使っていない | **200 (image/png)** | **200 (image/webp)** |
| `images: { unoptimized: true }` を書いた | 404 | 404 |

はあ？

`next/image` を使っていなくても、`next start` した時点でこの口は開いています。
閉じるには `images.unoptimized: true` を**自分で書く**必要があります。
私は「画像最適化なんて CDN でやればよくない？」派なんですが、派閥に関係なく、書かない限り開いています。

一方の React Router 側も、`__manifest` と `.data` という口を持っています。
これは framework mode の仕組みそのものなので消せません。そして 2026 年6月、ここに DoS が刺さりました。

つまり、**表面積 = 自分が書いたルート + フレームワークが生やす口**で、後者は自分でコントロールできません。
違いは、その「口」の数と、口の裏にいるものの重さ（ネイティブの画像デコーダなのか、JSON パーサなのか）です。

ついでに `/` のレスポンスヘッダも載せておきます。

| ヘッダ | Next.js | React Router |
| --- | --- | --- |
| `x-powered-by` | `Next.js` | なし |
| `vary` | `rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch, Accept-Encoding` | `Accept-Encoding` |

`X-Powered-By: Next.js` は既定で付きます。攻撃者に「このサーバは Next.js です、バージョンはお察しください」と自己紹介しているわけですね。
`poweredByHeader: false` で消せますが、これも「自分で書かないと消えない」側です。

## ランタイムとページ重量（誤差の範囲）

主張の中心ではないので、さらっと。

| | Next.js | React Router |
| --- | --- | --- |
| コールドスタート（`start` から `/` が 200 まで） | 950 ms | 660 ms |
| 常駐メモリ RSS | 約 250 MB | 約 160 MB |
| `/` の p50 レイテンシ | 8.0 ms | 5.0 ms |
| `/api/products` の p50 レイテンシ | 2.2 ms | 2.7 ms |
| `/` の JS 転送量（gzip） | 143 KB | 104 KB |
| `/` の画像転送量 | 16 KB（webp 化） | 80 KB（PNG そのまま） |

API は Next.js の方が速いです。正直に書きます。
JS 転送量は Next.js の方が 40 KB ほど多く、この規模の画面では RSC による「クライアント JS 削減」の恩恵は出ませんでした。

そして画像。Next.js の画像最適化は本物です。16 KB と 80 KB は大きな差です。
だからこそ「使うなら使う、使わないなら切る」と選定時に決めるべきで、「とりあえず入っているから有効」が一番良くないんです。

## 地味に刺さった差

計測中に気づいた小ネタをひとつ。

両アプリは在庫をモジュールスコープの `Map` で持つつもりだったのですが、Next.js 側で「詳細ページで予約したのに一覧の在庫が減らない」という現象が起きました。
`.next/server` を覗くと、共有データのモジュールが**4つのチャンクに複製**されていました。
Next.js はサーバコードをルート単位で分割するため、モジュールスコープのシングルトンはルート間で別インスタンスになります。

```ts
// Prisma クライアントでおなじみのやつ
const reserved: Map<string, number> = ((globalThis as any).__catalogReserved ??= new Map());
```

結局 `globalThis` に逃がしました。Vite の SSR ビルドは単一バンドルなので、React Router 側は素の `Map` で問題ありませんでした。
Prisma のドキュメントに `globalThis` の例が載っている理由を、身をもって理解した瞬間でした。

# 「とりあえず Next.js」が隠しているコスト

ここまでをまとめると、「とりあえず」で Next.js を選んだときに抱え込むものは次の4つです。

1. **使っていない機能の攻撃面**
   Image Optimization、`next/og`、RSC ランタイム、middleware。これらは opt-in ではなく、最初から有効です。使わないなら自分で無効化する必要があります。
2. **パッチ追従の運用負荷**
   2026 年は月1回以上のペースでセキュリティリリースが出ています。15.x と 16.x の両系統へのバックポートがあり、`backport` という dist-tag まで存在します。追従する体制がないなら、それは「抱えられないもの」です。
3. **抽象の重さ**
   RSC + Server Actions + 多層キャッシュは、認証付き CRUD で BFF が別にある B2B 業務画面に対しては過剰です。過剰な抽象は、脆弱性が出たときに「うちに影響あるのか」を判断するコストにもなります。
4. **選ぶ側の責任は、薄いフレームワークにもある**
   React Router 側も XSS、DoS、path traversal、turbo-stream の RCE を踏んでいます。「薄いから安全」ではなく、「何を抱えているか把握できる」のが利点です。把握する気がないなら、どちらを選んでも同じです。

# 判断基準

鉄槌を下すだけでは無責任なので、うちならこう判断する、という表を置いておきます。

| 観点 | Next.js が合う | React Router が合う |
| --- | --- | --- |
| ホスティング | Vercel 前提 | セルフホスト / コンテナ |
| 画像 | 外部画像の最適化が本当に必要 | CDN や画像サービスに任せる |
| レンダリング | ISR / PPR / 静的生成の混在が必要 | SSR + クライアント遷移で十分 |
| API | Route Handler で完結させたい | BFF / API が別にある |
| チーム | 既に App Router に習熟 | loader / action モデルに慣れている |
| 更新頻度 | 月次のセキュリティ更新を回せる | 依存を少なく保ちたい |

弊社は右の列にほぼ全部当てはまります。だから React Router です。
左の列に当てはまるなら、Next.js を選ぶのは正しいと思います。

ただしその場合も、選定時に以下を書き出してほしいです。

- 画像最適化を使うか。使わないなら `images.unoptimized: true`
- `next/og` を使うか。使わないなら依存に入れない
- middleware（proxy）で認可をやるか。やるなら、過去5件のバイパスを読んでからにする
- `poweredByHeader: false`
- セキュリティリリースを誰がいつ追従するか

これが全部埋まるなら、それはもう「とりあえず」ではありません。

# まとめ

鉄槌を下したかったのは Next.js ではなく、「とりあえず」という選び方でした。

同じアプリを2回作ってわかったのは、書くコードはほぼ同じでも、抱え込むものは5倍から12倍違うということ。
そしてその「抱え込むもの」の中に、この1年の Critical が刺さった部品がそのまま入っているということです。

React Router を選んだ側にも抱えている口はあります。それを把握した上で選ぶのと、把握せずに「とりあえず」で選ぶのとでは、`npm audit` が赤くなった朝の気持ちが全然違います。

計測は全部リポジトリに置いてあるので、「うちの条件だと違う」という方はぜひ `pnpm measure` して殴り返してください。

最後まで読んでいただきありがとうございました。
個人の活動も、こういう偏った検証も評価いただける素敵な弊社です。
我らが開発チームに興味を持ってくださったら、以下採用ページもご覧いただきたいです！

https://xorder.notion.site

---

## 参考リンク

- [Next.js August 2026 Security Release](https://nextjs.org/blog/august-2026-security-release)
- [GHSA-vcvr-r3jv-pc5j: next/og ImageResponse RCE](https://osv.dev/vulnerability/GHSA-vcvr-r3jv-pc5j)
- [GHSA-2xp9-vwfh-vxw4: AVIF Image Optimization RCE](https://osv.dev/vulnerability/GHSA-2xp9-vwfh-vxw4)
- [GHSA-p293-qw3h-jr36: Windows RCE](https://osv.dev/vulnerability/GHSA-p293-qw3h-jr36)
- [GHSA-9qr9-h5gf-34mp: React2Shell (Next.js)](https://osv.dev/vulnerability/GHSA-9qr9-h5gf-34mp)
- [GHSA-fv66-9v8q-g76r: CVE-2025-55182 (react-server-dom)](https://osv.dev/vulnerability/GHSA-fv66-9v8q-g76r)
- [GHSA-9583-h5hc-x8cw: React Router File Session Storage path traversal](https://osv.dev/vulnerability/GHSA-9583-h5hc-x8cw)
- [GHSA-49rj-9fvp-4h2h: React Router turbo-stream RCE](https://osv.dev/vulnerability/GHSA-49rj-9fvp-4h2h)
- [GHSA-8x6r-g9mw-2r78: React Router `__manifest` DoS](https://osv.dev/vulnerability/GHSA-8x6r-g9mw-2r78)
- [Remix v3 にコントリビュート（前回記事）](https://xmart-techblog.hatenablog.com/entry/2025/12/01/122639)
- [Next.js ver13のappディレクトリをなんとなく批判したいので、酔った勢いで敵情を調査してみた（2023）](https://qiita.com/FAL-coffee/items/e4bcc16b065a737c9537)
