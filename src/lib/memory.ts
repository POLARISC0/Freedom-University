import "server-only";
import type { Specialist } from "@/content/types";
import { writeMemoryNotes } from "./ai";
import { db } from "./db";
import { shouldRefreshMemory } from "./memory-rules";

export async function getMemoryNotes(userId: string, specialistSlug: string): Promise<string | null> {
  const memory = await db.specialistMemory.findUnique({ where: { userId_specialistSlug: { userId, specialistSlug } } });
  return memory?.notes ?? null;
}

/** Rewrite the specialist's notes about the student once enough new messages have arrived. */
export async function refreshMemoryIfDue(userId: string, specialist: Specialist): Promise<void> {
  const key = { userId_specialistSlug: { userId, specialistSlug: specialist.slug } };
  const [studentMessages, memory] = await Promise.all([
    db.chatMessage.count({ where: { userId, specialistSlug: specialist.slug, role: "user" } }),
    db.specialistMemory.findUnique({ where: key }),
  ]);
  if (!shouldRefreshMemory(studentMessages, memory?.messagesAtUpdate ?? 0)) return;

  // Recent messages across all of this specialist's threads (lessons and office hours).
  const recent = await db.chatMessage.findMany({
    where: { userId, specialistSlug: specialist.slug },
    orderBy: { createdAt: "desc" },
    take: 16,
    select: { role: true, content: true },
  });
  const transcript = recent
    .reverse()
    .map((m) => `${m.role === "user" ? "Student" : specialist.name}: ${m.content.slice(0, 1500)}`)
    .join("\n\n");
  const notes = await writeMemoryNotes({ specialist, notes: memory?.notes ?? null, transcript });
  if (!notes) return;
  await db.specialistMemory.upsert({
    where: key,
    create: { userId, specialistSlug: specialist.slug, notes, messagesAtUpdate: studentMessages },
    update: { notes, messagesAtUpdate: studentMessages },
  });
}

export async function forgetStudent(userId: string, specialistSlug: string): Promise<void> {
  await db.specialistMemory.deleteMany({ where: { userId, specialistSlug } });
}
