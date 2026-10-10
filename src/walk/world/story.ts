import { LESSONS, type Lesson } from "@/walk/content";
import type { ProgressMap } from "@/walk/progress";

/**
 * Where a mentor should be for a lesson at a given step, as a spot id, or null for their usual place.
 * While a quest is active a mentor who "walks with you" heads to the quest's target; after a quest the lesson
 * carries on there, so the mentor stays at that spot until the lesson is finished.
 */
export function mentorSpotForStep(lesson: Lesson, stepIndex: number): string | null {
  if (stepIndex >= lesson.steps.length) return null;
  let lastTarget: string | null = null;
  for (let i = 0; i <= stepIndex; i++) {
    const step = lesson.steps[i];
    if (step.kind !== "quest") continue;
    if (i === stepIndex) return step.mentorWalks ? step.target : lastTarget;
    lastTarget = step.target;
  }
  return lastTarget;
}

/** The active quest's target spot for a lesson in progress, if its current step is a quest. */
export function questTargetForStep(lesson: Lesson, stepIndex: number): string | null {
  const step = lesson.steps[stepIndex];
  return step?.kind === "quest" ? step.target : null;
}

export interface StoryState {
  /** Mentor id -> spot id they should stand at instead of their usual place. */
  mentorSpots: Record<string, string>;
  /** The quest the player is on, if any. */
  quest: { lessonSlug: string; target: string; objective: string } | null;
  /** Mentors with a lesson the player hasn't finished, for the "lesson waiting" marker. */
  mentorsWithLessons: string[];
}

/** Derive what the world should show from the player's lesson progress. */
export function storyState(progress: ProgressMap, activeLessonSlug: string | null): StoryState {
  const mentorSpots: Record<string, string> = {};
  let quest: StoryState["quest"] = null;
  const mentorsWithLessons = new Set<string>();

  for (const lesson of LESSONS) {
    const row = progress[lesson.slug];
    if (!row || row.status !== "completed") mentorsWithLessons.add(lesson.mentorId);
    // A replayed lesson is "completed" but has a step index inside the lesson again.
    if (!row || row.stepIndex >= lesson.steps.length) continue;
    const spot = mentorSpotForStep(lesson, row.stepIndex);
    if (spot) mentorSpots[lesson.mentorId] = spot;
    const target = questTargetForStep(lesson, row.stepIndex);
    if (target && (!quest || lesson.slug === activeLessonSlug)) {
      const step = lesson.steps[row.stepIndex];
      quest = { lessonSlug: lesson.slug, target, objective: step.kind === "quest" ? step.objective : "" };
    }
  }
  return { mentorSpots, quest, mentorsWithLessons: [...mentorsWithLessons] };
}

/** The lesson whose current quest ends at `spotId`, preferring the lesson the player is actively playing. */
export function lessonAwaitingArrival(progress: ProgressMap, spotId: string, preferred: string | null): Lesson | undefined {
  const waiting = LESSONS.filter((lesson) => {
    const row = progress[lesson.slug];
    return row ? questTargetForStep(lesson, row.stepIndex) === spotId : false;
  });
  return waiting.find((l) => l.slug === preferred) ?? waiting[0];
}
