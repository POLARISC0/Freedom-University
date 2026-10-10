import type { z } from "zod";
import {
  ACTION_MESSAGES,
  AdvanceSchema,
  CheckInSchema,
  isPlausibleDay,
  JournalSchema,
  readChoices,
  readLifeInput,
  ReflectionSchema,
} from "@/walk/action-rules";
import { getLesson } from "@/walk/content";
import type { LifeState } from "@/walk/life";
import { canMoveTo, type CheckInView, type JournalEntryView, type LessonProgressView } from "@/walk/progress";
import { change, current, newId, persist } from "./session";

// The static preview's stand-in for `@/app/walk/actions`: the same functions with the same rules, run in the
// browser against the preview session instead of the database. The build swaps this module in for the real one.

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

const fail = (error: string) => ({ ok: false as const, error });

/** Keep only the newest check-ins: a few months is plenty for the journal and keeps the saved document small. */
const CHECK_INS_KEPT = 120;

function saveLesson(view: LessonProgressView): LessonProgressView {
  const progress = { ...current().progress, [view.lessonSlug]: view };
  change({ progress });
  persist((s) => s.saveProgress(progress));
  return view;
}

function addEntry(fields: Pick<JournalEntryView, "kind" | "title" | "body" | "lessonSlug">): JournalEntryView {
  const now = new Date().toISOString();
  const entry: JournalEntryView = { id: newId(), ...fields, createdAt: now, updatedAt: now };
  change({ journal: [entry, ...current().journal] });
  persist((s) => s.saveJournalEntry(entry));
  return entry;
}

export async function advanceLesson(input: z.infer<typeof AdvanceSchema>): Promise<ActionResult<LessonProgressView>> {
  const parsed = AdvanceSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid request.");
  const { lessonSlug, toStep, choice } = parsed.data;
  const lesson = getLesson(lessonSlug);
  if (!lesson) return fail("Unknown lesson.");
  if (toStep >= lesson.steps.length) return fail(ACTION_MESSAGES.acceptToFinish);

  const row = current().progress[lessonSlug];
  if (!canMoveTo(lesson, row?.stepIndex ?? 0, toStep)) return fail(ACTION_MESSAGES.stepUnavailable);

  const choices = readChoices(row?.choices);
  if (choice) {
    const step = lesson.steps[choice.stepIndex];
    if (step?.kind !== "choice" || !step.options.some((o) => o.id === choice.optionId)) {
      return fail("Unknown choice.");
    }
    choices[String(choice.stepIndex)] = choice.optionId;
  }

  return {
    ok: true,
    data: saveLesson(
      row
        ? { ...row, stepIndex: toStep, choices }
        : {
            lessonSlug,
            stepIndex: toStep,
            status: "in_progress",
            choices,
            challengeAcceptedAt: null,
            challengeDoneAt: null,
            completedAt: null,
          },
    ),
  };
}

export async function submitReflection(
  input: z.infer<typeof ReflectionSchema>,
): Promise<ActionResult<{ progress: LessonProgressView; entry: JournalEntryView | null }>> {
  const parsed = ReflectionSchema.safeParse(input);
  if (!parsed.success) return fail("Your reflection is too long to save in one entry.");
  const { lessonSlug, stepIndex, text } = parsed.data;
  const lesson = getLesson(lessonSlug);
  const step = lesson?.steps[stepIndex];
  if (!lesson || step?.kind !== "reflection") return fail("Unknown reflection.");
  const row = current().progress[lessonSlug];
  if (!row || row.stepIndex !== stepIndex) return fail(ACTION_MESSAGES.continueLesson);

  const progress = saveLesson({ ...row, stepIndex: stepIndex + 1 });
  const body = text.trim();
  const entry = body ? addEntry({ kind: "reflection", title: step.question, body, lessonSlug }) : null;
  return { ok: true, data: { progress, entry } };
}

export async function acceptChallenge(lessonSlug: string): Promise<ActionResult<LessonProgressView>> {
  const lesson = getLesson(lessonSlug);
  if (!lesson) return fail("Unknown lesson.");
  const row = current().progress[lessonSlug];
  const last = lesson.steps.length - 1;
  if (!row || row.stepIndex !== last || lesson.steps[last].kind !== "challenge") {
    return fail(ACTION_MESSAGES.continueLesson);
  }
  const now = new Date().toISOString();
  return {
    ok: true,
    data: saveLesson({
      ...row,
      stepIndex: lesson.steps.length,
      status: "completed",
      completedAt: row.completedAt ?? now,
      challengeAcceptedAt: now,
      challengeDoneAt: null,
    }),
  };
}

export async function setChallengeDone(lessonSlug: string, done: boolean): Promise<ActionResult<LessonProgressView>> {
  const row = current().progress[String(lessonSlug)];
  if (!row?.challengeAcceptedAt) return fail("Accept the challenge in the lesson first.");
  return { ok: true, data: saveLesson({ ...row, challengeDoneAt: done ? new Date().toISOString() : null }) };
}

export async function saveJournalEntry(input: z.infer<typeof JournalSchema>): Promise<ActionResult<JournalEntryView>> {
  const parsed = JournalSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid entry.");
  const { id, kind, title, body } = parsed.data;
  if (!id) return { ok: true, data: addEntry({ kind, title: title || null, body, lessonSlug: null }) };

  const existing = current().journal.find((e) => e.id === id);
  if (!existing) return fail("Entry not found.");
  const entry: JournalEntryView = { ...existing, kind, title: title || null, body, updatedAt: new Date().toISOString() };
  change({ journal: current().journal.map((e) => (e.id === id ? entry : e)) });
  persist((s) => s.saveJournalEntry(entry));
  return { ok: true, data: entry };
}

export async function deleteJournalEntry(id: string): Promise<ActionResult<{ id: string }>> {
  if (!current().journal.some((e) => e.id === id)) return fail("Entry not found.");
  change({ journal: current().journal.filter((e) => e.id !== id) });
  persist((s) => s.deleteJournalEntry(id));
  return { ok: true, data: { id } };
}

export async function saveCheckIn(
  input: z.infer<typeof CheckInSchema>,
): Promise<ActionResult<{ checkIn: CheckInView; entry: JournalEntryView | null }>> {
  const parsed = CheckInSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid check-in.");
  const { day, mood, note, addToJournal } = parsed.data;
  if (!isPlausibleDay(day)) return fail(ACTION_MESSAGES.wrongDate);

  const checkIn: CheckInView = { day, mood, note: note || null };
  const checkIns = [checkIn, ...current().checkIns.filter((c) => c.day !== day)]
    .sort((a, b) => b.day.localeCompare(a.day))
    .slice(0, CHECK_INS_KEPT);
  change({ checkIns });
  persist((s) => s.saveCheckIns(checkIns));
  const entry =
    addToJournal && note ? addEntry({ kind: "prayer", title: `Check-in, ${day}`, body: note, lessonSlug: null }) : null;
  return { ok: true, data: { checkIn, entry } };
}

export async function saveLife(input: unknown): Promise<ActionResult<LifeState>> {
  const life = readLifeInput(input);
  if (!life) return fail(ACTION_MESSAGES.badLife);
  change({ life });
  persist((s) => s.saveLife(life));
  return { ok: true, data: life };
}

/** There is no account to leave in the preview. */
export async function signOutOfWalk(): Promise<void> {}
