import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { JournalPageClient } from "@/walk/components/pages";
import { getJournal, getRecentCheckIns } from "@/walk/server/data";

export const metadata: Metadata = { title: "Walk Journal" };

export default async function JournalPage() {
  const user = await requireUser("/walk/journal", "/walk/begin");
  const [entries, checkIns] = await Promise.all([getJournal(user.id), getRecentCheckIns(user.id)]);
  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm font-semibold tracking-wider text-gold uppercase">Private to you</p>
        <h1 className="font-serif text-3xl font-semibold">Walk Journal</h1>
        <p className="text-muted">Your reflections, prayers and gratitude, all in one place.</p>
      </header>
      <JournalPageClient initialEntries={entries} initialCheckIns={checkIns} />
    </div>
  );
}
