import type { Metadata } from "next";
import { PageTitle } from "@/components/page-title";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  const target = typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/";
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-6">
      <PageTitle className="mb-6">Playground</PageTitle>
      <LoginForm next={target} />
    </main>
  );
}
