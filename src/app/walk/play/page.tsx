import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { GameShell } from "@/walk/components/game/GameShell";
import { getJournal, getLife, getProgressMap, getRecentCheckIns } from "@/walk/server/data";

export const metadata: Metadata = { title: "Galilee" };

export default async function PlayPage() {
  const user = await requireUser("/walk/play", "/walk/begin");
  const [progress, journal, checkIns, life] = await Promise.all([
    getProgressMap(user.id),
    getJournal(user.id),
    getRecentCheckIns(user.id),
    getLife(user.id),
  ]);
  return (
    <GameShell
      userId={user.id}
      username={user.username}
      initialLife={life}
      initialProgress={progress}
      initialJournal={journal}
      initialCheckIns={checkIns}
    />
  );
}
