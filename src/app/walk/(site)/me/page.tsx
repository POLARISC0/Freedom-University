import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { NEED_INFO, NEEDS } from "@/walk/life";
import { AvatarOnPage } from "@/walk/components/pages";
import { BadgesSection, FriendshipsSection, NeedsSection } from "@/walk/components/YourWalk";
import { getLife } from "@/walk/server/data";

export const metadata: Metadata = { title: "Your walk" };

export default async function YourWalkPage() {
  const user = await requireUser("/walk/me", "/walk/begin");
  const life = await getLife(user.id);

  if (!life) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <header>
          <p className="text-sm font-semibold tracking-wider text-gold uppercase">Your walk</p>
          <h1 className="font-serif text-3xl font-semibold">Your story starts in Capernaum</h1>
        </header>
        <p className="leading-relaxed text-muted">
          You haven&apos;t made your character yet. Enter Galilee, choose your name and how you look, and start
          walking. This page will then show how your walk is going: five gentle needs, your friendships with Jesus and
          the disciples, and the growth badges you find along the way.
        </p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {NEEDS.map((n) => (
            <li key={n} className="flex items-start gap-2 rounded-xl border border-dashed border-line p-3 text-sm">
              <span aria-hidden>{NEED_INFO[n].icon}</span>
              <span>
                <strong>{NEED_INFO[n].label}</strong>
                <span className="block text-xs text-muted">{NEED_INFO[n].hint}</span>
              </span>
            </li>
          ))}
        </ul>
        <Link href="/walk/play" className="btn-primary">
          Enter Galilee
        </Link>
      </div>
    );
  }

  const since = new Date(life.createdAt).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-center gap-4">
        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-line bg-surface-2">
          <AvatarOnPage appearance={life.appearance} size={96} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold tracking-wider text-gold uppercase">Your walk</p>
          <h1 className="font-serif text-3xl font-semibold">{life.name}</h1>
          <p className="text-sm text-muted">Walking in Galilee since {since}. There&apos;s no race here: just keep walking.</p>
        </div>
        <Link href="/walk/play" className="btn-primary">
          Enter Galilee
        </Link>
      </header>
      <div className="grid gap-8 lg:grid-cols-2">
        <NeedsSection needs={life.needs} />
        <FriendshipsSection relationships={life.relationships} />
      </div>
      <BadgesSection badges={life.badges} wide />
    </div>
  );
}
