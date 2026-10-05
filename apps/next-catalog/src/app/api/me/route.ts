import { getSession } from "@/lib/session";

export async function GET() {
  const user = await getSession();
  return user ? Response.json({ user }) : Response.json({ error: "unauthorized" }, { status: 401 });
}
