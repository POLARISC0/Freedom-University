import "server-only";
import { db } from "./db";
import type { ProgressRow } from "./progress";

export async function getProgressRows(userId: string): Promise<ProgressRow[]> {
  return db.lessonProgress.findMany({
    where: { userId },
    select: { specialistSlug: true, lessonSlug: true, status: true, bestScore: true, attempts: true, completedAt: true },
  });
}

/** Record that the student opened a lesson (no-op if already tracked). */
export async function markLessonStarted(userId: string, specialistSlug: string, lessonSlug: string) {
  await db.lessonProgress.upsert({
    where: { userId_specialistSlug_lessonSlug: { userId, specialistSlug, lessonSlug } },
    update: {},
    create: { userId, specialistSlug, lessonSlug },
  });
}

export async function getChatHistory(userId: string, specialistSlug: string, thread: string) {
  return db.chatMessage.findMany({
    where: { userId, specialistSlug, thread },
    orderBy: { createdAt: "asc" },
    select: { id: true, role: true, content: true },
  });
}

/** Today's date in UTC as YYYY-MM-DD. */
export function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}
