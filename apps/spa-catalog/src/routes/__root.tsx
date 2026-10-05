import { Link, Outlet, createRootRoute } from "@tanstack/react-router";
import "../styles.css";

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFound,
});

function RootLayout() {
  return (
    <>
      <header className="border-b bg-white">
        <nav className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
          <Link to="/" className="font-semibold">
            Catalog
          </Link>
          <Link to="/about" className="text-sm text-zinc-600 hover:underline">
            About
          </Link>
          <span data-testid="framework" className="ml-auto rounded bg-zinc-900 px-2 py-0.5 text-xs text-white">
            TanStack Router
          </span>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        <Outlet />
      </main>
      <footer className="border-t bg-white py-4 text-center text-xs text-zinc-500">next-vs-react-router-catalog</footer>
    </>
  );
}

function NotFound() {
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
