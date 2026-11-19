export const AUTH_COOKIE = "playground_auth";

/** Cookie value for a password. Uses Web Crypto so it runs in Proxy and Route Handlers alike. */
export async function tokenFor(password: string): Promise<string> {
  const data = new TextEncoder().encode(`playground:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** The gate is on in production only. Locally everything is open. */
export function gateEnabled(): boolean {
  return process.env.NODE_ENV === "production";
}
