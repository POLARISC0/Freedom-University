import { z } from "zod";
import { getModule } from "@/content";
import { AiRefusalError, generateQuiz } from "@/lib/ai";
import { describeApiError, hasAnthropicKey } from "@/lib/anthropic";
import { getCurrentUser } from "@/lib/auth";
import { getProgressRows, markModuleStarted } from "@/lib/data";
import { db } from "@/lib/db";
import { isUnlocked } from "@/lib/progress";
import { toPublicQuiz, type GeneratedQuiz } from "@/lib/quiz";

const BodySchema = z.object({ professorSlug: z.string(), moduleSlug: z.string() });

// An unfinished quiz is handed back instead of generating a new one, so
// reloading the page can't be used to re-roll questions (or run up API costs).
const REUSE_WINDOW_MS = 60 * 60 * 1000;

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Please sign in." }, { status: 401 });

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request." }, { status: 400 });
  const { professorSlug, moduleSlug } = parsed.data;

  const found = getModule(professorSlug, moduleSlug);
  if (!found) return Response.json({ error: "Unknown module." }, { status: 404 });
  const { professor, module, index } = found;

  if (!isUnlocked(professor, index, await getProgressRows(user.id))) {
    return Response.json({ error: "This module is still locked." }, { status: 403 });
  }

  const where = { userId: user.id, professorSlug, moduleSlug };
  const open = await db.quizAttempt.findFirst({
    where: { ...where, submittedAt: null, createdAt: { gt: new Date(Date.now() - REUSE_WINDOW_MS) } },
    orderBy: { createdAt: "desc" },
  });
  if (open) return Response.json(toPublicQuiz(open.id, open.quiz as unknown as GeneratedQuiz));

  if (!hasAnthropicKey()) {
    return Response.json({ error: "ANTHROPIC_API_KEY is not configured on the server." }, { status: 503 });
  }

  const previous = await db.quizAttempt.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 3,
    select: { quiz: true },
  });
  const previousQuestions = previous.flatMap((a) =>
    (a.quiz as unknown as GeneratedQuiz).questions.map((q) => q.question),
  );

  try {
    const quiz = await generateQuiz({ professor, module, previousQuestions });
    await markModuleStarted(user.id, professorSlug, moduleSlug);
    const attempt = await db.quizAttempt.create({ data: { ...where, quiz } });
    return Response.json(toPublicQuiz(attempt.id, quiz));
  } catch (error) {
    console.error("quiz generation failed", error);
    const message = error instanceof AiRefusalError ? error.message : describeApiError(error);
    return Response.json({ error: message }, { status: 502 });
  }
}
