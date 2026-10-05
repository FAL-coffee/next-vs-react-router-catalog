import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/mypage")({
  // Authentication guard: the SPA counterpart of Next's proxy (middleware).
  beforeLoad: ({ context, location }) => {
    if (!context.user) throw redirect({ to: "/login", search: { redirect: location.href } });
  },
  head: () => ({ meta: [{ title: "マイページ | Catalog (TanStack Router SPA)" }] }),
  component: MyPage,
});

function MyPage() {
  const { user } = Route.useRouteContext();
  return (
    <div className="space-y-3" data-testid="mypage">
      <h1 className="text-2xl font-bold">マイページ</h1>
      <p>
        こんにちは、<span data-testid="user-name">{user!.name}</span> さん（role: <code>{user!.role}</code>）
      </p>
    </div>
  );
}
