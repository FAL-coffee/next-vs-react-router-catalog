"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authenticate, SESSION_COOKIE, SESSION_TTL_SECONDS, signSession } from "@catalog/data";

export type LoginState = { error?: string };

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const user = authenticate(String(formData.get("id") ?? ""), String(formData.get("password") ?? ""));
  if (!user) return { error: "ID かパスワードが違います" };
  const jar = await cookies();
  jar.set(SESSION_COOKIE, await signSession(user), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  const to = String(formData.get("redirect") || "/mypage");
  redirect(to.startsWith("/") ? to : "/mypage");
}

export async function logoutAction() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  redirect("/");
}
