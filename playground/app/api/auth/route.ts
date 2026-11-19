import { NextResponse } from "next/server";
import { AUTH_COOKIE, tokenFor } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const expected = process.env.PLAYGROUND_PASSWORD;
    if (!expected) {
      return NextResponse.json({ error: "PLAYGROUND_PASSWORD is not set on the server." }, { status: 500 });
    }
    const body = (await request.json().catch(() => ({}))) as { password?: unknown };
    if (typeof body.password !== "string" || body.password !== expected) {
      return NextResponse.json({ error: "Wrong password." }, { status: 401 });
    }
    const response = NextResponse.json({ ok: true });
    response.cookies.set(AUTH_COOKIE, await tokenFor(expected), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 90,
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(AUTH_COOKIE);
  return response;
}
