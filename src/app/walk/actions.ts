"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { endSession, getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getLesson } from "@/walk/content";
import {
  canMoveTo,
  JOURNAL_KINDS,
  MOODS,
  type CheckInView,
  type JournalEntryView,
  type LessonProgressView,
} from "@/walk/progress";
import { toJournalView, toProgressView } from "@/walk/server/data";

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

const fail = (error: string) => ({ ok: false as const, error });
const SIGN_IN = "Please sign in to save your walk.";

async function loadProgressRow(userId: string, lessonSlug: string) {
  return db.walkLessonProgress.findUnique({ where: { userId_lessonSlug: { userId, lessonSlug } } });
}

const AdvanceSchema = z.object({
  lessonSlug: z.string(),
  toStep: z.number().int().min(0),
  choice: z.object({ stepIndex: z.number().int().min(0), optionId: z.string().max(64) }).optional(),
});

/** Start a lesson (toStep 0), move to the next step, or go back to replay it. */
export async function advanceLesson(input: z.infer<typeof AdvanceSchema>): Promise<ActionResult<LessonProgressView>> {
  const user = await getCurrentUser();
  if (!user) return fail(SIGN_IN);
  const parsed = AdvanceSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid request.");
  const { lessonSlug, toStep, choice } = parsed.data;
  const lesson = getLesson(lessonSlug);
  if (!lesson) return fail("Unknown lesson.");
  // Finishing happens only by accepting the challenge.
  if (toStep >= lesson.steps.length) return fail("Accept the challenge to finish the lesson.");

  const row = await loadProgressRow(user.id, lessonSlug);
  if (!canMoveTo(lesson, row?.stepIndex ?? 0, toStep)) return fail("That step isn't available yet.");

  const choices: Record<string, string> =
    row?.choices && typeof row.choices === "object" && !Array.isArray(row.choices)
      ? Object.fromEntries(Object.entries(row.choices).map(([k, v]) => [k, String(v)]))
      : {};
  if (choice) {
    const step = lesson.steps[choice.stepIndex];
    if (step?.kind !== "choice" || !step.options.some((o) => o.id === choice.optionId)) {
      return fail("Unknown choice.");
    }
    choices[String(choice.stepIndex)] = choice.optionId;
  }

  const saved = await db.walkLessonProgress.upsert({
    where: { userId_lessonSlug: { userId: user.id, lessonSlug } },
    create: { userId: user.id, lessonSlug, pathSlug: lesson.pathSlug, stepIndex: toStep, choices },
    update: { stepIndex: toStep, choices },
  });
  return { ok: true, data: toProgressView(saved) };
}

const ReflectionSchema = z.object({
  lessonSlug: z.string(),
  stepIndex: z.number().int().min(0),
  text: z.string().max(10_000),
});

/** Save the player's reflection to their journal (if they wrote one) and move on. */
export async function submitReflection(
  input: z.infer<typeof ReflectionSchema>,
): Promise<ActionResult<{ progress: LessonProgressView; entry: JournalEntryView | null }>> {
  const user = await getCurrentUser();
  if (!user) return fail(SIGN_IN);
  const parsed = ReflectionSchema.safeParse(input);
  if (!parsed.success) return fail("Your reflection is too long to save in one entry.");
  const { lessonSlug, stepIndex, text } = parsed.data;
  const lesson = getLesson(lessonSlug);
  const step = lesson?.steps[stepIndex];
  if (!lesson || step?.kind !== "reflection") return fail("Unknown reflection.");
  const row = await loadProgressRow(user.id, lessonSlug);
  if (!row || row.stepIndex !== stepIndex) return fail("Please continue the lesson from where you are.");

  // Only the request that actually moves the lesson on writes the entry, so two tabs can't save it twice.
  const moved = await db.walkLessonProgress.updateMany({
    where: { id: row.id, stepIndex },
    data: { stepIndex: stepIndex + 1 },
  });
  if (moved.count === 0) return fail("Please continue the lesson from where you are.");
  const body = text.trim();
  const entry = body
    ? await db.walkJournalEntry.create({
        data: { userId: user.id, kind: "reflection", title: step.question, body, lessonSlug },
      })
    : null;
  const progress = await db.walkLessonProgress.findUniqueOrThrow({ where: { id: row.id } });
  return { ok: true, data: { progress: toProgressView(progress), entry: entry ? toJournalView(entry) : null } };
}

/** Accepting the week's challenge completes the lesson. */
export async function acceptChallenge(lessonSlug: string): Promise<ActionResult<LessonProgressView>> {
  const user = await getCurrentUser();
  if (!user) return fail(SIGN_IN);
  const lesson = getLesson(lessonSlug);
  if (!lesson) return fail("Unknown lesson.");
  const row = await loadProgressRow(user.id, lessonSlug);
  const last = lesson.steps.length - 1;
  if (!row || row.stepIndex !== last || lesson.steps[last].kind !== "challenge") {
    return fail("Please continue the lesson from where you are.");
  }
  const now = new Date();
  const saved = await db.walkLessonProgress.update({
    where: { id: row.id },
    data: {
      stepIndex: lesson.steps.length,
      status: "COMPLETED",
      completedAt: row.completedAt ?? now,
      challengeAcceptedAt: now,
      challengeDoneAt: null,
    },
  });
  return { ok: true, data: toProgressView(saved) };
}

/** The player marks this week's challenge as done (or not done after all). */
export async function setChallengeDone(lessonSlug: string, done: boolean): Promise<ActionResult<LessonProgressView>> {
  const user = await getCurrentUser();
  if (!user) return fail(SIGN_IN);
  const row = await loadProgressRow(user.id, String(lessonSlug));
  if (!row?.challengeAcceptedAt) return fail("Accept the challenge in the lesson first.");
  const saved = await db.walkLessonProgress.update({
    where: { id: row.id },
    data: { challengeDoneAt: done ? new Date() : null },
  });
  return { ok: true, data: toProgressView(saved) };
}

const JournalSchema = z.object({
  id: z.string().optional(),
  kind: z.enum(JOURNAL_KINDS),
  title: z.string().trim().max(200).optional(),
  body: z.string().trim().min(1, "Write something first.").max(10_000, "That entry is too long."),
});

export async function saveJournalEntry(input: z.infer<typeof JournalSchema>): Promise<ActionResult<JournalEntryView>> {
  const user = await getCurrentUser();
  if (!user) return fail(SIGN_IN);
  const parsed = JournalSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid entry.");
  const { id, kind, title, body } = parsed.data;
  if (id) {
    // updateMany scopes the write to the owner, so nobody can edit someone else's entry by guessing an id.
    const { count } = await db.walkJournalEntry.updateMany({
      where: { id, userId: user.id },
      data: { kind, title: title || null, body },
    });
    if (count === 0) return fail("Entry not found.");
    return { ok: true, data: toJournalView(await db.walkJournalEntry.findUniqueOrThrow({ where: { id } })) };
  }
  const created = await db.walkJournalEntry.create({ data: { userId: user.id, kind, title: title || null, body } });
  return { ok: true, data: toJournalView(created) };
}

export async function deleteJournalEntry(id: string): Promise<ActionResult<{ id: string }>> {
  const user = await getCurrentUser();
  if (!user) return fail(SIGN_IN);
  const { count } = await db.walkJournalEntry.deleteMany({ where: { id: String(id), userId: user.id } });
  if (count === 0) return fail("Entry not found.");
  return { ok: true, data: { id } };
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const CheckInSchema = z.object({
  day: z.string().regex(DAY),
  mood: z.enum(MOODS),
  note: z.string().trim().max(2_000).optional(),
  addToJournal: z.boolean().optional(),
});

/** The daily check-in. `day` is the player's local date; it must be within a day or so of the server's. */
export async function saveCheckIn(
  input: z.infer<typeof CheckInSchema>,
): Promise<ActionResult<{ checkIn: CheckInView; entry: JournalEntryView | null }>> {
  const user = await getCurrentUser();
  if (!user) return fail(SIGN_IN);
  const parsed = CheckInSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid check-in.");
  const { day, mood, note, addToJournal } = parsed.data;
  const offsetDays = Math.abs(Date.parse(`${day}T12:00:00Z`) - Date.now()) / 86_400_000;
  if (!(offsetDays <= 1.6)) return fail("Your device's date looks wrong. Check it and try again.");

  const checkIn = await db.walkCheckIn.upsert({
    where: { userId_day: { userId: user.id, day } },
    create: { userId: user.id, day, mood, note: note || null },
    update: { mood, note: note || null },
  });
  const entry =
    addToJournal && note
      ? await db.walkJournalEntry.create({ data: { userId: user.id, kind: "prayer", title: `Check-in, ${day}`, body: note } })
      : null;
  return {
    ok: true,
    data: { checkIn: { day: checkIn.day, mood, note: checkIn.note }, entry: entry ? toJournalView(entry) : null },
  };
}

export async function signOutOfWalk(): Promise<void> {
  await endSession();
  redirect("/walk");
}
