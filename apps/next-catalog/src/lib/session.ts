import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession, type User } from "@catalog/data";

export async function getSession(): Promise<User | null> {
  const jar = await cookies();
  return verifySession(jar.get(SESSION_COOKIE)?.value);
}
