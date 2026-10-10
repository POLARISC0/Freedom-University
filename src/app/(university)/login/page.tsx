import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "@/components/LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  const nextPath = typeof next === "string" ? next : "/dashboard";
  if (await getCurrentUser()) redirect(nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/dashboard");

  return (
    <div className="mx-auto max-w-sm space-y-6 pt-10">
      <div className="space-y-2 text-center">
        <h1 className="font-serif text-3xl font-semibold">Student sign-in</h1>
        <p className="text-sm text-muted">
          Sign in, or pick a new username and password to create a student account.
        </p>
      </div>
      <LoginForm next={nextPath} />
      <p className="text-center text-xs text-muted">
        One account works for Freedom University and Walk With Him. There is no password reset yet, so keep your
        password somewhere safe.
      </p>
    </div>
  );
}
