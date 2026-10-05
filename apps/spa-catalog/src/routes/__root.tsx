import { Link, Outlet, createRootRouteWithContext, useRouter } from "@tanstack/react-router";
import type { User } from "@catalog/data";
import { invalidateMe, logout, me } from "#/lib/api";
import "../styles.css";

type RouterContext = { user: User | null };

export const Route = createRootRouteWithContext<RouterContext>()({
  // Runs before every route's beforeLoad, so child guards can read `context.user`.
  beforeLoad: async () => ({ user: await me() }),
  component: RootLayout,
  notFoundComponent: NotFound,
});

function RootLayout() {
  const { user } = Route.useRouteContext();
  const router = useRouter();
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
          <a href="/api/products" className="text-sm text-zinc-600 hover:underline">
            API
          </a>
          <Link to="/mypage" className="text-sm text-zinc-600 hover:underline">
            マイページ
          </Link>
          <Link to="/admin" className="text-sm text-zinc-600 hover:underline">
            管理
          </Link>
          <span className="ml-auto flex items-center gap-3 text-sm">
            {user ? (
              <>
                <span data-testid="current-user">{user.name}</span>
                <button
                  className="rounded border px-2 py-0.5 text-xs"
                  onClick={async () => {
                    await logout();
                    invalidateMe();
                    await router.invalidate();
                    await router.navigate({ to: "/" });
                  }}
                >
                  ログアウト
                </button>
              </>
            ) : (
              <Link to="/login" className="text-zinc-600 hover:underline">
                ログイン
              </Link>
            )}
            <span data-testid="framework" className="rounded bg-zinc-900 px-2 py-0.5 text-xs text-white">
              TanStack Router
            </span>
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
