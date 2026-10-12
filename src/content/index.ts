import { atlas } from "./specialists/atlas";
import { nova } from "./specialists/nova";
import { sage } from "./specialists/sage";
import { sterling } from "./specialists/sterling";
import type { Lesson, Specialist } from "./types";

export const SPECIALISTS: Specialist[] = [nova, sterling, atlas, sage];

/** Atlas (Banking & the System) writes the daily news briefing. */
export const NEWS_SPECIALIST = atlas;

/** The open-ended chat thread with a specialist, outside any lesson. */
export const OFFICE_HOURS = "office-hours";

export function getSpecialist(slug: string): Specialist | undefined {
  return SPECIALISTS.find((s) => s.slug === slug);
}

export function getLesson(
  specialistSlug: string,
  lessonSlug: string,
): { specialist: Specialist; lesson: Lesson; index: number } | undefined {
  const specialist = getSpecialist(specialistSlug);
  if (!specialist) return undefined;
  const index = specialist.lessons.findIndex((l) => l.slug === lessonSlug);
  if (index === -1) return undefined;
  return { specialist, lesson: specialist.lessons[index], index };
}

export type { Lesson, Specialist, Source, ZoneId } from "./types";
