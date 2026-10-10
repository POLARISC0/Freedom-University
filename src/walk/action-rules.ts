import { z } from "zod";
import { JOURNAL_KINDS, MOODS } from "@/walk/progress";

// Input rules for the Walk's save actions, shared by the server actions and the static preview's in-browser copy
// of them, so both accept exactly the same things.

export const AdvanceSchema = z.object({
  lessonSlug: z.string(),
  toStep: z.number().int().min(0),
  choice: z.object({ stepIndex: z.number().int().min(0), optionId: z.string().max(64) }).optional(),
});

export const ReflectionSchema = z.object({
  lessonSlug: z.string(),
  stepIndex: z.number().int().min(0),
  text: z.string().max(10_000),
});

export const JournalSchema = z.object({
  id: z.string().optional(),
  kind: z.enum(JOURNAL_KINDS),
  title: z.string().trim().max(200).optional(),
  body: z.string().trim().min(1, "Write something first.").max(10_000, "That entry is too long."),
});

const DAY = /^\d{4}-\d{2}-\d{2}$/;
export const CheckInSchema = z.object({
  day: z.string().regex(DAY),
  mood: z.enum(MOODS),
  note: z.string().trim().max(2_000).optional(),
  addToJournal: z.boolean().optional(),
});

/** A check-in's `day` is the player's local date, so it may differ from ours by a day or so, but no more. */
export function isPlausibleDay(day: string, now = Date.now()): boolean {
  const offsetDays = Math.abs(Date.parse(`${day}T12:00:00Z`) - now) / 86_400_000;
  return offsetDays <= 1.6;
}

/** The choices saved on a lesson, whatever shape they were stored in. */
export function readChoices(stored: unknown): Record<string, string> {
  return stored && typeof stored === "object" && !Array.isArray(stored)
    ? Object.fromEntries(Object.entries(stored).map(([k, v]) => [k, String(v)]))
    : {};
}

export const ACTION_MESSAGES = {
  continueLesson: "Please continue the lesson from where you are.",
  acceptToFinish: "Accept the challenge to finish the lesson.",
  stepUnavailable: "That step isn't available yet.",
  wrongDate: "Your device's date looks wrong. Check it and try again.",
} as const;
