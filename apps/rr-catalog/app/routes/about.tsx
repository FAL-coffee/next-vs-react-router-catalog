import type { Route } from "./+types/about";

export function meta(): Route.MetaDescriptors {
  return [{ title: "About | Catalog (React Router)" }];
}

export default function AboutPage() {
  return (
    <div className="prose max-w-none">
      <h1 className="text-2xl font-bold">About</h1>
      <p className="mt-4">
        このアプリは React Router (framework mode) で実装された比較用カタログです。
        同じ仕様のアプリが Next.js (App Router) でも実装されています。
      </p>
      <ul className="mt-4 list-disc pl-6 text-sm">
        <li>一覧・検索: loader + request.url</li>
        <li>詳細: 動的ルート + meta</li>
        <li>予約: action + &lt;Form method="post"&gt;</li>
        <li>API: resource route</li>
        <li>画像: 素の &lt;img&gt;（画像最適化は同梱されていない）</li>
      </ul>
    </div>
  );
}
