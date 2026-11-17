import { describe, expect, it } from "vitest";
import { SPECIALISTS } from "@/content";
import { completedCount, isUnlocked, lessonStatuses, nextLessonIndex, type ProgressRow } from "@/lib/progress";

const spec = SPECIALISTS[0];
const row = (lessonSlug: string, status: string, specialistSlug = spec.slug): ProgressRow => ({
  specialistSlug,
  lessonSlug,
  status,
  bestScore: 0,
  attempts: 0,
  completedAt: null,
});

describe("lesson unlocking", () => {
  it("opens only the first lesson for a new student", () => {
    const statuses = lessonStatuses(spec, []);
    expect(statuses[0]).toBe("available");
    expect(statuses.slice(1).every((s) => s === "locked")).toBe(true);
  });

  it("unlocks the next lesson once the previous quiz is passed", () => {
    const rows = [row(spec.lessons[0].slug, "COMPLETED")];
    expect(lessonStatuses(spec, rows).slice(0, 3)).toEqual(["completed", "available", "locked"]);
    expect(isUnlocked(spec, 1, rows)).toBe(true);
    expect(isUnlocked(spec, 2, rows)).toBe(false);
  });

  it("keeps the next lesson locked while the current one is only in progress", () => {
    expect(lessonStatuses(spec, [row(spec.lessons[0].slug, "IN_PROGRESS")]).slice(0, 2)).toEqual(["in_progress", "locked"]);
  });

  it("ignores progress with other specialists", () => {
    expect(completedCount(spec, [row(spec.lessons[0].slug, "COMPLETED", "someone-else")])).toBe(0);
  });

  it("finds the next lesson to study", () => {
    expect(nextLessonIndex(spec, [])).toBe(0);
    const all = spec.lessons.map((l) => row(l.slug, "COMPLETED"));
    expect(nextLessonIndex(spec, all)).toBeNull();
    expect(completedCount(spec, all)).toBe(spec.lessons.length);
  });
});
