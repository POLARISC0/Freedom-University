import { z } from "zod";
import { getModule } from "@/content";
import { gradeShortAnswer } from "@/lib/ai";
import { describeApiError } from "@/lib/anthropic";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { gradeQuiz, MCQ_COUNT, type GeneratedQuiz } from "@/lib/quiz";

const BodySchema = z.object({
  attemptId: z.string(),
  answers: z.array(z.number().int().min(0).max(3).nullable()).length(MCQ_COUNT),
  shortAnswer: z.string().max(3000),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Please sign in." }, { status: 401 });

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid submission." }, { status: 400 });
  const { attemptId, answers, shortAnswer } = parsed.data;

  const attempt = await db.quizAttempt.findFirst({ where: { id: attemptId, userId: user.id } });
  if (!attempt) return Response.json({ error: "Quiz not found." }, { status: 404 });
  if (attempt.submittedAt) return Response.json({ error: "This quiz was already submitted." }, { status: 409 });

  const found = getModule(attempt.professorSlug, attempt.moduleSlug);
  if (!found) return Response.json({ error: "Unknown module." }, { status: 404 });
  const { professor, module, index } = found;
  const quiz = attempt.quiz as unknown as GeneratedQuiz;

  let shortGrade;
  try {
    shortGrade = await gradeShortAnswer({
      professor,
      module,
      question: quiz.shortAnswer.question,
      rubric: quiz.shortAnswer.rubric,
      sampleAnswer: quiz.shortAnswer.sampleAnswer,
      studentAnswer: shortAnswer,
    });
  } catch (error) {
    console.error("short answer grading failed", error);
    return Response.json({ error: describeApiError(error) }, { status: 502 });
  }

  const result = gradeQuiz(quiz, answers, shortGrade);
  const now = new Date();
  const progressKey = {
    userId_professorSlug_moduleSlug: {
      userId: user.id,
      professorSlug: attempt.professorSlug,
      moduleSlug: attempt.moduleSlug,
    },
  };

  // Claim the attempt atomically so a double submit can't count twice.
  const claimed = await db.quizAttempt.updateMany({
    where: { id: attempt.id, submittedAt: null },
    data: {
      answers: { answers, shortAnswer },
      grading: JSON.parse(JSON.stringify(result)),
      score: result.score,
      passed: result.passed,
      submittedAt: now,
    },
  });
  if (claimed.count === 0) return Response.json({ error: "This quiz was already submitted." }, { status: 409 });

  const existing = await db.moduleProgress.findUnique({ where: progressKey });
  const alreadyCompleted = existing?.status === "COMPLETED";
  await db.moduleProgress.upsert({
    where: progressKey,
    create: {
      userId: user.id,
      professorSlug: attempt.professorSlug,
      moduleSlug: attempt.moduleSlug,
      attempts: 1,
      bestScore: result.score,
      status: result.passed ? "COMPLETED" : "IN_PROGRESS",
      completedAt: result.passed ? now : null,
    },
    update: {
      attempts: { increment: 1 },
      bestScore: Math.max(existing?.bestScore ?? 0, result.score),
      ...(result.passed && !alreadyCompleted ? { status: "COMPLETED", completedAt: now } : {}),
    },
  });

  const next = professor.modules[index + 1];
  return Response.json({
    ...result,
    nextModule: result.passed && next ? { slug: next.slug, title: next.title } : null,
  });
}
