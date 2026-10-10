import "server-only";
import { db } from "@/lib/db";
import { parseLife, type LifeState } from "@/walk/life";
import { JOURNAL_KINDS, MOODS, type CheckInView, type JournalEntryView, type LessonProgressView, type ProgressMap } from "@/walk/progress";

type ProgressRow = Awaited<ReturnType<typeof db.walkLessonProgress.findFirstOrThrow>>;
type JournalRow = Awaited<ReturnType<typeof db.walkJournalEntry.findFirstOrThrow>>;

export function toProgressView(row: ProgressRow): LessonProgressView {
  const choices = row.choices && typeof row.choices === "object" && !Array.isArray(row.choices) ? row.choices : {};
  return {
    lessonSlug: row.lessonSlug,
    stepIndex: row.stepIndex,
    status: row.status === "COMPLETED" ? "completed" : "in_progress",
    choices: Object.fromEntries(Object.entries(choices).map(([k, v]) => [k, String(v)])),
    challengeAcceptedAt: row.challengeAcceptedAt?.toISOString() ?? null,
    challengeDoneAt: row.challengeDoneAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
  };
}

export function toJournalView(row: JournalRow): JournalEntryView {
  return {
    id: row.id,
    kind: (JOURNAL_KINDS as readonly string[]).includes(row.kind) ? (row.kind as JournalEntryView["kind"]) : "note",
    title: row.title,
    body: row.body,
    lessonSlug: row.lessonSlug,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function getProgressMap(userId: string): Promise<ProgressMap> {
  const rows = await db.walkLessonProgress.findMany({ where: { userId } });
  return Object.fromEntries(rows.map((r) => [r.lessonSlug, toProgressView(r)]));
}

export async function getJournal(userId: string, take = 200): Promise<JournalEntryView[]> {
  const rows = await db.walkJournalEntry.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take });
  return rows.map(toJournalView);
}

/** Recent check-ins, newest first. The client decides which one is "today" in the player's own time zone. */
export async function getRecentCheckIns(userId: string, take = 31): Promise<CheckInView[]> {
  const rows = await db.walkCheckIn.findMany({ where: { userId }, orderBy: { day: "desc" }, take });
  return rows.map((r) => ({
    day: r.day,
    mood: (MOODS as readonly string[]).includes(r.mood) ? (r.mood as CheckInView["mood"]) : "peaceful",
    note: r.note,
  }));
}

/** The player's life in the world, or null before they have made their character (or if the save is unusable). */
export async function getLife(userId: string): Promise<LifeState | null> {
  const row = await db.walkLife.findUnique({ where: { userId } });
  return row ? parseLife(row.data) : null;
}

export async function getConversation(userId: string, characterId: string, thread: string, take = 40) {
  const rows = await db.walkMessage.findMany({
    where: { userId, characterId, thread },
    orderBy: { createdAt: "desc" },
    take,
    select: { id: true, role: true, content: true },
  });
  return rows.reverse().map((m) => ({ id: m.id, role: m.role === "assistant" ? ("assistant" as const) : ("user" as const), content: m.content }));
}
