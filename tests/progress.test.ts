import { describe, expect, it } from "vitest";
import { PROFESSORS } from "@/content";
import { completedCount, isUnlocked, moduleStatuses, nextModuleIndex, type ProgressRow } from "@/lib/progress";

const prof = PROFESSORS[0];
const row = (moduleSlug: string, status: string, professorSlug = prof.slug): ProgressRow => ({
  professorSlug,
  moduleSlug,
  status,
  bestScore: 0,
  attempts: 0,
  completedAt: null,
});

describe("module unlocking", () => {
  it("opens only the first module for a new student", () => {
    const statuses = moduleStatuses(prof, []);
    expect(statuses[0]).toBe("available");
    expect(statuses.slice(1).every((s) => s === "locked")).toBe(true);
  });

  it("unlocks the next module once the previous quiz is passed", () => {
    const rows = [row(prof.modules[0].slug, "COMPLETED")];
    expect(moduleStatuses(prof, rows).slice(0, 3)).toEqual(["completed", "available", "locked"]);
    expect(isUnlocked(prof, 1, rows)).toBe(true);
    expect(isUnlocked(prof, 2, rows)).toBe(false);
  });

  it("keeps the next module locked while the current one is only in progress", () => {
    const rows = [row(prof.modules[0].slug, "IN_PROGRESS")];
    expect(moduleStatuses(prof, rows).slice(0, 2)).toEqual(["in_progress", "locked"]);
  });

  it("ignores progress from other professors", () => {
    const rows = [row(prof.modules[0].slug, "COMPLETED", "someone-else")];
    expect(completedCount(prof, rows)).toBe(0);
  });

  it("finds the next module to study", () => {
    expect(nextModuleIndex(prof, [])).toBe(0);
    const all = prof.modules.map((m) => row(m.slug, "COMPLETED"));
    expect(nextModuleIndex(prof, all)).toBeNull();
    expect(completedCount(prof, all)).toBe(prof.modules.length);
  });
});
