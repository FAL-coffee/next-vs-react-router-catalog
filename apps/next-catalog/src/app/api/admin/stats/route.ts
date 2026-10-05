import { can, reservationStats } from "@catalog/data";
import { getSession } from "@/lib/session";

export async function GET() {
  const user = await getSession();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!can(user, "view-admin")) return Response.json({ error: "forbidden" }, { status: 403 });
  return Response.json({ stats: reservationStats() });
}
