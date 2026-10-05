import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { can, reservationStats } from "@catalog/data";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "管理" };

export default async function AdminPage() {
  const user = await getSession();
  if (!user) redirect("/login?redirect=/admin");
  if (!can(user, "view-admin")) {
    return (
      <div className="space-y-3" data-testid="forbidden">
        <h1 className="text-2xl font-bold">403</h1>
        <p>このページを見る権限がありません。</p>
      </div>
    );
  }
  const stats = reservationStats();
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
