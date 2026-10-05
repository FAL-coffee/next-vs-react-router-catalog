import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { logoutAction } from "@/app/login/actions";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Catalog (Next.js)", template: "%s | Catalog (Next.js)" },
  description: "Next.js vs TanStack Router SPA comparison catalog",
};

export default async function RootLayout({ children, modal }: LayoutProps<"/">) {
  const user = await getSession();
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-zinc-50 text-zinc-900">
        <header className="border-b bg-white">
          <nav className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
            <Link href="/" className="font-semibold">
              Catalog
            </Link>
            <Link href="/about" className="text-sm text-zinc-600 hover:underline">
              About
            </Link>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- JSON endpoint, not a page */}
            <a href="/api/products" className="text-sm text-zinc-600 hover:underline">
              API
            </a>
            <Link href="/mypage" className="text-sm text-zinc-600 hover:underline">
              マイページ
            </Link>
            <Link href="/admin" className="text-sm text-zinc-600 hover:underline">
              管理
            </Link>
            <span className="ml-auto flex items-center gap-3 text-sm">
              {user ? (
                <>
                  <span data-testid="current-user">{user.name}</span>
                  <form action={logoutAction}>
                    <button className="rounded border px-2 py-0.5 text-xs">ログアウト</button>
                  </form>
                </>
              ) : (
                <Link href="/login" className="text-zinc-600 hover:underline">
                  ログイン
                </Link>
              )}
              <span data-testid="framework" className="rounded bg-zinc-900 px-2 py-0.5 text-xs text-white">
                Next.js
              </span>
            </span>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
        {modal}
        <footer className="border-t bg-white py-4 text-center text-xs text-zinc-500">next-vs-react-router-catalog</footer>
      </body>
    </html>
  );
}
