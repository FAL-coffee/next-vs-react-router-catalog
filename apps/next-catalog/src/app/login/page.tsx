import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "ログイン" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const to = typeof sp.redirect === "string" ? sp.redirect : undefined;
  if (await getSession()) redirect(to ?? "/mypage");
  return (
    <div className="mx-auto max-w-sm space-y-4">
      <h1 className="text-2xl font-bold">ログイン</h1>
      <p className="text-xs text-zinc-500">デモ: taro / taro（member）、admin / admin（admin）</p>
      <LoginForm redirectTo={to} />
    </div>
  );
}
