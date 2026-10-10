import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { PathsPageClient } from "@/walk/components/pages";
import { getProgressMap } from "@/walk/server/data";

export const metadata: Metadata = { title: "Growth paths" };

export default async function PathsPage() {
  const user = await requireUser("/walk/paths", "/walk/begin");
  const progress = await getProgressMap(user.id);
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold tracking-wider text-gold uppercase">Your walk</p>
          <h1 className="font-serif text-3xl font-semibold">Growth paths</h1>
          <p className="text-muted">Take lessons in the world, or read them here. Mark each week&apos;s challenge when you&apos;ve practised it.</p>
        </div>
        <Link href="/walk/play" className="btn-primary">
          Enter Galilee
        </Link>
      </header>
      <PathsPageClient initialProgress={progress} />
    </div>
  );
}
