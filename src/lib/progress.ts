import type { Specialist } from "@/content/types";

export const PASS_THRESHOLD = 70;

export type LessonStatus = "locked" | "available" | "in_progress" | "completed";

export interface ProgressRow {
  specialistSlug: string;
  lessonSlug: string;
  status: string;
  bestScore: number;
  attempts: number;
  completedAt: Date | null;
}

/**
 * Lessons unlock in order: the first is always open, every later one opens
 * once the lesson before it has been completed (its quiz passed).
 */
export function lessonStatuses(specialist: Specialist, rows: ProgressRow[]): LessonStatus[] {
  const bySlug = new Map(
    rows.filter((r) => r.specialistSlug === specialist.slug).map((r) => [r.lessonSlug, r]),
  );
  return specialist.lessons.map((l, i) => {
    const row = bySlug.get(l.slug);
    if (row?.status === "COMPLETED") return "completed";
    const previousDone = i === 0 || bySlug.get(specialist.lessons[i - 1].slug)?.status === "COMPLETED";
    if (!previousDone) return "locked";
    return row ? "in_progress" : "available";
  });
}

export function isUnlocked(specialist: Specialist, lessonIndex: number, rows: ProgressRow[]): boolean {
  return lessonStatuses(specialist, rows)[lessonIndex] !== "locked";
}

export function completedCount(specialist: Specialist, rows: ProgressRow[]): number {
  return lessonStatuses(specialist, rows).filter((s) => s === "completed").length;
}

/** The first lesson that is open but not yet completed, if any. */
export function nextLessonIndex(specialist: Specialist, rows: ProgressRow[]): number | null {
  const idx = lessonStatuses(specialist, rows).findIndex((s) => s === "available" || s === "in_progress");
  return idx === -1 ? null : idx;
}
