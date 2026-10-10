import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/password";
import { isAcceptablePassword } from "@/lib/password-rules";
import { getLesson, LESSONS, PATHS } from "@/walk/content";
import { canMoveTo, encouragement, summarizePaths, type ProgressMap } from "@/walk/progress";

describe("lesson content shape", () => {
  it.each(LESSONS.map((l) => [l.slug, l] as const))("%s has a scene, conversation, reflection and challenge", (_slug, lesson) => {
    const kinds = lesson.steps.map((s) => s.kind);
    for (const required of ["scene", "conversation", "reflection", "challenge"] as const) expect(kinds).toContain(required);
    // The challenge comes last: accepting it completes the lesson.
    expect(kinds.at(-1)).toBe("challenge");
  });

  it("uses only mentors and paths that exist", () => {
    for (const lesson of LESSONS) {
      expect(PATHS.find((p) => p.slug === lesson.pathSlug)?.lessonSlugs).toContain(lesson.slug);
    }
  });

  it("covers Prayer, Faith and Tithing with Jesus, Peter and Matthew", () => {
    expect(LESSONS.map((l) => [l.pathSlug, l.mentorId])).toEqual([
      ["prayer", "jesus"],
      ["faith", "peter"],
      ["generosity", "matthew"],
    ]);
  });
});

describe("progress rules", () => {
  const lesson = getLesson("teach-us-to-pray")!;

  it("moves forward one step at a time, and back to replay", () => {
    expect(canMoveTo(lesson, 0, 1)).toBe(true);
    expect(canMoveTo(lesson, 0, 3)).toBe(false);
    expect(canMoveTo(lesson, 4, 0)).toBe(true);
    expect(canMoveTo(lesson, 2, -1)).toBe(false);
    expect(canMoveTo(lesson, lesson.steps.length - 1, lesson.steps.length)).toBe(true);
    expect(canMoveTo(lesson, 0, 1.5)).toBe(false);
  });

  it("summarises paths without scores", () => {
    const progress: ProgressMap = {
      [lesson.slug]: {
        lessonSlug: lesson.slug,
        stepIndex: lesson.steps.length,
        status: "completed",
        choices: {},
        challengeAcceptedAt: "2026-10-10T00:00:00.000Z",
        challengeDoneAt: "2026-10-12T00:00:00.000Z",
        completedAt: "2026-10-10T00:00:00.000Z",
      },
    };
    const prayer = summarizePaths(progress).find((p) => p.slug === "prayer")!;
    expect(prayer).toEqual({ slug: "prayer", available: 1, completed: 1, challengesDone: 1 });
    expect(encouragement({})).toMatch(/single step/);
    expect(encouragement(progress)).toMatch(/Philippians 1:6/);
  });
});

describe("passwords", () => {
  it("hashes with a salt and verifies", async () => {
    const a = await hashPassword("correct horse battery");
    const b = await hashPassword("correct horse battery");
    expect(a).not.toBe(b);
    expect(a.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("correct horse battery", a)).toBe(true);
    expect(await verifyPassword("wrong horse battery", a)).toBe(false);
    expect(await verifyPassword("anything", "not-a-hash")).toBe(false);
  });

  it("requires at least 8 characters", () => {
    expect(isAcceptablePassword("short")).toBe(false);
    expect(isAcceptablePassword("long enough")).toBe(true);
  });
});
