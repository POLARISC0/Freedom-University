import type { Professor } from "@/content/types";

export const PASS_THRESHOLD = 70;

export type ModuleStatus = "locked" | "available" | "in_progress" | "completed";

export interface ProgressRow {
  professorSlug: string;
  moduleSlug: string;
  status: string;
  bestScore: number;
  attempts: number;
  completedAt: Date | null;
}

/**
 * Modules unlock in order: the first is always open, every later one opens
 * once the module before it has been completed (its quiz passed).
 */
export function moduleStatuses(
  professor: Professor,
  rows: ProgressRow[],
): ModuleStatus[] {
  const bySlug = new Map(
    rows
      .filter((r) => r.professorSlug === professor.slug)
      .map((r) => [r.moduleSlug, r]),
  );
  return professor.modules.map((m, i) => {
    const row = bySlug.get(m.slug);
    if (row?.status === "COMPLETED") return "completed";
    const previousDone =
      i === 0 || bySlug.get(professor.modules[i - 1].slug)?.status === "COMPLETED";
    if (!previousDone) return "locked";
    return row ? "in_progress" : "available";
  });
}

export function isUnlocked(
  professor: Professor,
  moduleIndex: number,
  rows: ProgressRow[],
): boolean {
  return moduleStatuses(professor, rows)[moduleIndex] !== "locked";
}

export function completedCount(professor: Professor, rows: ProgressRow[]): number {
  return moduleStatuses(professor, rows).filter((s) => s === "completed").length;
}

/** The first module that is open but not yet completed, if any. */
export function nextModuleIndex(professor: Professor, rows: ProgressRow[]): number | null {
  const idx = moduleStatuses(professor, rows).findIndex(
    (s) => s === "available" || s === "in_progress",
  );
  return idx === -1 ? null : idx;
}
