import { createFileRoute, redirect } from "@tanstack/react-router";
import { adminStats } from "#/lib/api";

export const Route = createFileRoute("/admin")({
  beforeLoad: ({ context, location }) => {
    if (!context.user) throw redirect({ to: "/login", search: { redirect: location.href } });
  },
  // Authorization is enforced by the API (403); the loader just surfaces it.
  loader: async ({ context }) => (context.user?.role === "admin" ? { stats: await adminStats(), forbidden: false } : { stats: [], forbidden: true }),
  head: () => ({ meta: [{ title: "管理 | Catalog (TanStack Router SPA)" }] }),
  component: AdminPage,
});

function AdminPage() {
  const { stats, forbidden } = Route.useLoaderData();
  if (forbidden) {
    return (
      <div className="space-y-3" data-testid="forbidden">
        <h1 className="text-2xl font-bold">403</h1>
        <p>このページを見る権限がありません。</p>
      </div>
    );
  }
  return (
    <div className="space-y-4" data-testid="admin">
      <h1 className="text-2xl font-bold">予約状況（管理者）</h1>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="py-1">商品</th>
            <th className="py-1">予約数</th>
            <th className="py-1">残り</th>
          </tr>
        </thead>
        <tbody>
          {stats.map((s) => (
            <tr key={s.productId} className="border-b">
              <td className="py-1">{s.name}</td>
              <td className="py-1" data-testid={`reserved-${s.productId}`}>
                {s.reserved}
              </td>
              <td className="py-1">{s.remaining}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
