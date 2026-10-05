import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "マイページ" };

export default async function MyPage() {
  // The proxy already redirected anonymous users; check again anyway.
  const user = await getSession();
  if (!user) redirect("/login?redirect=/mypage");
  return (
    <div className="space-y-3" data-testid="mypage">
      <h1 className="text-2xl font-bold">マイページ</h1>
      <p>
        こんにちは、<span data-testid="user-name">{user.name}</span> さん（role: <code>{user.role}</code>）
      </p>
    </div>
  );
}
