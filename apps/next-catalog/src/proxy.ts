import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@catalog/data";

/**
 * Authentication gate only. Authorization (roles) is checked again in the
 * page / route handler, because a proxy can be bypassed (see the 2025-2026
 * advisories) and should never be the only check.
 */
export async function proxy(request: NextRequest) {
  const user = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!user) {
    const url = new URL("/login", request.url);
    url.searchParams.set("redirect", request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/mypage", "/admin"] };
