import type { Metadata } from "next";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <div className="prose max-w-none">
      <h1 className="text-2xl font-bold">About</h1>
      <p className="mt-4">
        このアプリは Next.js (App Router) で実装された比較用カタログです。
        同じ仕様のアプリが Vite + TanStack Router の SPA でも実装されています。
      </p>
      <ul className="mt-4 list-disc pl-6 text-sm">
        <li>一覧・検索: Server Component + searchParams</li>
        <li>詳細: 動的ルート + generateMetadata</li>
        <li>予約: Server Action + useActionState</li>
        <li>クイックビュー: Parallel Route + Intercepting Route</li>
        <li>OG 画像: next/og の ImageResponse</li>
        <li>API: Route Handler</li>
        <li>画像: next/image（既定の画像最適化を有効のまま）</li>
      </ul>
    </div>
  );
}
