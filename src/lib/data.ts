import "server-only";
import { db } from "./db";
import type { ProgressRow } from "./progress";

export async function getProgressRows(userId: string): Promise<ProgressRow[]> {
  return db.moduleProgress.findMany({
    where: { userId },
    select: {
      professorSlug: true,
      moduleSlug: true,
      status: true,
      bestScore: true,
      attempts: true,
      completedAt: true,
    },
  });
}

/** Record that the student opened a module (no-op if already tracked). */
export async function markModuleStarted(userId: string, professorSlug: string, moduleSlug: string) {
  await db.moduleProgress.upsert({
    where: { userId_professorSlug_moduleSlug: { userId, professorSlug, moduleSlug } },
    update: {},
    create: { userId, professorSlug, moduleSlug },
  });
}

export async function getChatHistory(userId: string, professorSlug: string, moduleSlug: string) {
  return db.chatMessage.findMany({
    where: { userId, professorSlug, moduleSlug },
    orderBy: { createdAt: "asc" },
    select: { id: true, role: true, content: true },
  });
}

/** Today's date in UTC as YYYY-MM-DD. */
export function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}
