import {
  isRouteErrorResponse,
  Link,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";
import "./app.css";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className="h-full antialiased">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="min-h-full flex flex-col bg-zinc-50 text-zinc-900">
        <header className="border-b bg-white">
          <nav className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
            <Link to="/" className="font-semibold">
              Catalog
            </Link>
            <Link to="/about" className="text-sm text-zinc-600 hover:underline">
              About
            </Link>
            <a href="/api/products" className="text-sm text-zinc-600 hover:underline">
              API
            </a>
            <span
              data-testid="framework"
              className="ml-auto rounded bg-zinc-900 px-2 py-0.5 text-xs text-white"
            >
              React Router
            </span>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
        <footer className="border-t bg-white py-4 text-center text-xs text-zinc-500">
          next-vs-react-router-catalog
        </footer>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  if (isRouteErrorResponse(error) && error.status === 404) {
    return (
      <div className="space-y-3" data-testid="not-found">
        <h1 className="text-2xl font-bold">404</h1>
        <p>お探しのページは見つかりませんでした。</p>
        <Link to="/" className="text-sm underline">
          トップへ戻る
        </Link>
      </div>
    );
  }

  const message =
    import.meta.env.DEV && error instanceof Error
      ? error.message
      : "しばらくしてから再度お試しください。";

  return (
    <div className="space-y-3" data-testid="error-boundary">
      <h1 className="text-2xl font-bold">エラーが発生しました</h1>
      <p className="text-sm text-zinc-600">{message}</p>
      <Link to="/" className="rounded border px-3 py-1 text-sm">
        トップへ戻る
      </Link>
    </div>
  );
}
