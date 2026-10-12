import { z } from "zod";
import { getLesson } from "@/content";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { gradeQuiz, MCQ_COUNT, OPTION_COUNT, type GeneratedQuiz } from "@/lib/quiz";

const BodySchema = z.object({
  attemptId: z.string(),
  answers: z.array(z.number().int().min(0).max(OPTION_COUNT - 1).nullable()).length(MCQ_COUNT),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Please sign in." }, { status: 401 });

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid submission." }, { status: 400 });
  const { attemptId, answers } = parsed.data;

  const attempt = await db.quizAttempt.findFirst({ where: { id: attemptId, userId: user.id } });
  if (!attempt) return Response.json({ error: "Quiz not found." }, { status: 404 });
  const found = getLesson(attempt.specialistSlug, attempt.lessonSlug);
  if (!found) return Response.json({ error: "Unknown lesson." }, { status: 404 });

  const result = gradeQuiz(attempt.quiz as unknown as GeneratedQuiz, answers);
  const now = new Date();

  // Claim the attempt atomically so a double submit can't count twice.
  const claimed = await db.quizAttempt.updateMany({
    where: { id: attempt.id, submittedAt: null },
    data: { answers, score: result.score, passed: result.passed, submittedAt: now },
  });
  if (claimed.count === 0) return Response.json({ error: "This quiz was already submitted." }, { status: 409 });

  const key = { userId: user.id, specialistSlug: attempt.specialistSlug, lessonSlug: attempt.lessonSlug };
  const existing = await db.lessonProgress.findUnique({ where: { userId_specialistSlug_lessonSlug: key } });
  const completeNow = result.passed && existing?.status !== "COMPLETED";
  await db.lessonProgress.upsert({
    where: { userId_specialistSlug_lessonSlug: key },
    create: {
      ...key,
      attempts: 1,
      bestScore: result.score,
      status: result.passed ? "COMPLETED" : "IN_PROGRESS",
      completedAt: result.passed ? now : null,
    },
    update: {
      attempts: { increment: 1 },
      bestScore: Math.max(existing?.bestScore ?? 0, result.score),
      ...(completeNow ? { status: "COMPLETED", completedAt: now } : {}),
    },
  });

  const next = found.specialist.lessons[found.index + 1];
  return Response.json({ ...result, nextLesson: result.passed && next ? { slug: next.slug, title: next.title } : null });
}
