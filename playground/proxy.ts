import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, gateEnabled, tokenFor } from "@/lib/auth";

// Paths reachable without the password. /p/* pages 404 by themselves unless the prototype is public.
const OPEN = [/^\/login$/, /^\/api\/auth$/, /^\/p\//, /^\/og\//];

export async function proxy(request: NextRequest) {
  if (!gateEnabled()) return NextResponse.next();
  const { pathname, search } = request.nextUrl;
  if (OPEN.some((re) => re.test(pathname))) return NextResponse.next();

  const password = process.env.PLAYGROUND_PASSWORD;
  const cookie = request.cookies.get(AUTH_COOKIE)?.value;
  if (password && cookie && cookie === (await tokenFor(password))) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const login = new URL("/login", request.url);
  login.searchParams.set("next", pathname + search);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
