import "server-only";
import { SPECIALISTS } from "@/content";
import { db } from "../db";
import type { MentorReport } from "./headmaster-rules";
import { HEADMASTERS } from "./registry";

/** Each mentor's report up to the Headmasters: progress plus the notes they keep on the member. */
export async function mentorReports(userId: string): Promise<MentorReport[]> {
  const [progress, memories] = await Promise.all([
    db.lessonProgress.findMany({ where: { userId, status: "COMPLETED" }, select: { specialistSlug: true } }),
    db.specialistMemory.findMany({ where: { userId }, select: { specialistSlug: true, notes: true } }),
  ]);
  return SPECIALISTS.flatMap((s) => {
    const completedLessons = progress.filter((p) => p.specialistSlug === s.slug).length;
    const notes = memories.find((m) => m.specialistSlug === s.slug)?.notes ?? null;
    return completedLessons || notes ? [{ mentorId: s.slug, completedLessons, totalLessons: s.lessons.length, notes }] : [];
  });
}

/** The member's latest mentor conversation, so a Headmaster can pull it back. */
export async function latestMentorThread(userId: string) {
  const mentorIds = SPECIALISTS.map((s) => s.slug);
  const last = await db.chatMessage.findFirst({
    where: { userId, specialistSlug: { in: mentorIds } },
    orderBy: { createdAt: "desc" },
    select: { specialistSlug: true, thread: true },
  });
  if (!last) return null;
  const messages = await db.chatMessage.findMany({
    where: { userId, specialistSlug: last.specialistSlug, thread: last.thread },
    orderBy: { createdAt: "desc" },
    take: 6,
    select: { role: true, content: true },
  });
  return { mentorId: last.specialistSlug, messages: messages.reverse() };
}

export async function createHandoff(userId: string, fromAgent: string, toAgent: string, note: string) {
  await db.agentHandoff.create({ data: { userId, fromAgent, toAgent, note } });
}

/** The newest untaken handoff to this mentor, marked taken so it's only used once. */
export async function takeHandoff(userId: string, mentorId: string): Promise<string | null> {
  const handoff = await db.agentHandoff.findFirst({
    where: { userId, toAgent: mentorId, takenAt: null },
    orderBy: { createdAt: "desc" },
  });
  if (!handoff) return null;
  await db.agentHandoff.updateMany({ where: { userId, toAgent: mentorId, takenAt: null }, data: { takenAt: new Date() } });
  const from = HEADMASTERS.find((h) => h.id === handoff.fromAgent)?.name ?? "A Headmaster";
  return `${from} handed this member to you with this note: "${handoff.note}" Acknowledge it briefly and pick up from there.`;
}
