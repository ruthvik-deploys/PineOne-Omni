"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm({ next }: { next: string }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Couldn't sign in.");
        return;
      }
      window.location.assign(next);
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <Input
        type="password"
        autoFocus
        autoComplete="current-password"
        placeholder="Password"
        aria-label="Password"
        className="h-11"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="h-11" disabled={pending || !password}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
