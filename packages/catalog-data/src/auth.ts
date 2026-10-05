/**
 * Demo authentication / authorization shared by both apps. No database:
 * two hard-coded users and an HMAC-signed cookie. Uses Web Crypto so the
 * exact same code runs in Node (Hono API, Next route handlers) and in
 * Next's proxy (middleware) runtime.
 */
export type Role = "member" | "admin";

export type User = { id: string; name: string; role: Role };

const USERS: (User & { password: string })[] = [
  { id: "taro", name: "山田 太郎", role: "member", password: "taro" },
  { id: "admin", name: "管理者", role: "admin", password: "admin" },
];

export const SESSION_COOKIE = "catalog_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 8;

const SECRET = "demo-secret-do-not-use-in-production";

export function authenticate(id: string, password: string): User | null {
  const u = USERS.find((u) => u.id === id && u.password === password);
  return u ? { id: u.id, name: u.name, role: u.role } : null;
}

export function getUser(id: string): User | null {
  const u = USERS.find((u) => u.id === id);
  return u ? { id: u.id, name: u.name, role: u.role } : null;
}

export function listUsers(): User[] {
  return USERS.map(({ id, name, role }) => ({ id, name, role }));
}

type Payload = { sub: string; exp: number };

const enc = new TextEncoder();

function b64url(bytes: Uint8Array | ArrayBuffer): string {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (const x of b) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function unb64url(s: string): Uint8Array {
  const b = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
}

async function hmac(data: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
}

export async function signSession(user: User): Promise<string> {
  const payload: Payload = { sub: user.id, exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS };
  const body = b64url(enc.encode(JSON.stringify(payload)));
  return `${body}.${await hmac(body)}`;
}

export async function verifySession(token: string | undefined | null): Promise<User | null> {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = await hmac(body);
  if (expected.length !== sig.length) return null;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  if (diff !== 0) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(unb64url(body))) as Payload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return getUser(payload.sub);
  } catch {
    return null;
  }
}

/** Parse a Cookie header without pulling in a dependency. */
export function readCookie(cookieHeader: string | null | undefined, name: string): string | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return undefined;
}

export function sessionCookieAttributes(): string {
  return `Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}`;
}

export function can(user: User | null, action: "view-mypage" | "view-admin" | "reserve"): boolean {
  if (!user) return false;
  switch (action) {
    case "view-mypage":
    case "reserve":
      return true;
    case "view-admin":
      return user.role === "admin";
  }
}
