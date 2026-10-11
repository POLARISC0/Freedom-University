import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  const nextPath = typeof next === "string" ? next : "/floor";
  if (await getCurrentUser()) redirect(nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/floor");

  return (
    <div className="mx-auto max-w-sm space-y-6 pt-10">
      <div className="space-y-2 text-center">
        <h1 className="font-serif text-3xl font-semibold">Student sign-in</h1>
        <p className="text-sm text-muted">
          Pick a username. New usernames create a student account automatically.
        </p>
      </div>
      <LoginForm next={nextPath} />
      <p className="text-center text-xs text-muted">
        There are no passwords: anyone who knows your username can sign in as you. Don&apos;t store anything
        sensitive in your classrooms.
      </p>
    </div>
  );
}
