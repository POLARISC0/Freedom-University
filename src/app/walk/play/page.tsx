import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { GameShell } from "@/walk/components/game/GameShell";
import { getJournal, getProgressMap, getRecentCheckIns } from "@/walk/server/data";

export const metadata: Metadata = { title: "Galilee" };

export default async function PlayPage() {
  const user = await requireUser("/walk/play", "/walk/begin");
  const [progress, journal, checkIns] = await Promise.all([
    getProgressMap(user.id),
    getJournal(user.id),
    getRecentCheckIns(user.id),
  ]);
  return <GameShell userId={user.id} initialProgress={progress} initialJournal={journal} initialCheckIns={checkIns} />;
}
