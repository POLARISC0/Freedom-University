import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { getCurrentUser } from "@/lib/auth";
import { WalkMark } from "@/walk/components/WalkHeader";

export const metadata: Metadata = { title: "Begin your walk" };

function safeNext(next: unknown): string {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/walk/play";
}

export default async function BeginPage({ searchParams }: PageProps<"/walk/begin">) {
  const nextPath = safeNext((await searchParams).next);
  if (await getCurrentUser()) redirect(nextPath);
  return (
    <div className="mx-auto max-w-sm space-y-6 pt-6">
      <div className="space-y-2 text-center">
        <WalkMark className="mx-auto h-12 w-12" />
        <h1 className="font-serif text-3xl font-semibold">Begin your walk</h1>
        <p className="text-sm text-muted">
          Sign in, or choose a username and password to start. Your journal and progress are saved to your account.
        </p>
      </div>
      <LoginForm next={nextPath} submitLabel="Walk into Galilee" usernamePlaceholder="your_name" />
      <p className="text-center text-xs text-muted">
        Your Walk Journal is private to your account. There is no password reset yet, so keep your password somewhere
        safe.
      </p>
    </div>
  );
}
