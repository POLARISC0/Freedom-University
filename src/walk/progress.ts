import { LESSONS, PATHS, type Lesson } from "@/walk/content";

// Shapes the client sees, and pure rules for lesson progress. No database access here, so it's easy to test.

export type LessonStatus = "not_started" | "in_progress" | "completed";

export interface LessonProgressView {
  lessonSlug: string;
  stepIndex: number;
  status: Exclude<LessonStatus, "not_started">;
  /** Options picked in choice steps, keyed by step index. */
  choices: Record<string, string>;
  challengeAcceptedAt: string | null;
  challengeDoneAt: string | null;
  completedAt: string | null;
}

export type ProgressMap = Record<string, LessonProgressView>;

export interface JournalEntryView {
  id: string;
  kind: JournalKind;
  title: string | null;
  body: string;
  lessonSlug: string | null;
  createdAt: string;
  updatedAt: string;
}

export const JOURNAL_KINDS = ["reflection", "prayer", "gratitude", "note"] as const;
export type JournalKind = (typeof JOURNAL_KINDS)[number];

export const JOURNAL_KIND_LABELS: Record<JournalKind, string> = {
  reflection: "Reflection",
  prayer: "Prayer",
  gratitude: "Gratitude",
  note: "Note",
};

export interface CheckInView {
  day: string;
  mood: Mood;
  note: string | null;
}

export const MOODS = ["joyful", "peaceful", "grateful", "weary", "anxious", "struggling"] as const;
export type Mood = (typeof MOODS)[number];

export function lessonStatus(progress: LessonProgressView | undefined): LessonStatus {
  return progress?.status ?? "not_started";
}

/**
 * Whether a player may move a lesson to `toStep`. Players move forward one step at a time (or jump back to replay),
 * and only reach the end (steps.length) from the final challenge step.
 */
export function canMoveTo(lesson: Lesson, currentStep: number, toStep: number): boolean {
  if (!Number.isInteger(toStep) || toStep < 0 || toStep > lesson.steps.length) return false;
  return toStep <= currentStep + 1;
}

export interface PathSummary {
  slug: string;
  available: number;
  completed: number;
  challengesDone: number;
}

export function summarizePaths(progress: ProgressMap): PathSummary[] {
  return PATHS.map((path) => {
    const rows = path.lessonSlugs.map((slug) => progress[slug]).filter(Boolean);
    return {
      slug: path.slug,
      available: path.lessonSlugs.length,
      completed: rows.filter((r) => r.status === "completed").length,
      challengesDone: rows.filter((r) => r.challengeDoneAt).length,
    };
  });
}

export const ENCOURAGEMENT_VERSE = { ref: "Philippians 1:6", text: "He who began a good work in you will complete it" };

/** A gentle, non-competitive word about where the player is. */
export function encouragement(progress: ProgressMap): string {
  const completed = LESSONS.filter((l) => progress[l.slug]?.status === "completed").length;
  const started = Object.keys(progress).length;
  if (completed === 0 && started === 0) return "Every walk begins with a single step. Find a mentor by the shore and say hello.";
  if (completed === 0) return "You've begun. There's no hurry here: take each step at your own pace.";
  if (completed < LESSONS.length) return `"${ENCOURAGEMENT_VERSE.text}" (${ENCOURAGEMENT_VERSE.ref}). Keep walking.`;
  return "You've walked every lesson in this chapter. Keep practising the challenges, and come back as new chapters open.";
}
