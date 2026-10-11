import type Anthropic from "@anthropic-ai/sdk";
import { after } from "next/server";
import { z } from "zod";
import { getLesson, getSpecialist, OFFICE_HOURS } from "@/content";
import { anthropic, describeApiError, fallbackParams, hasAnthropicKey, MODEL } from "@/lib/anthropic";
import { getCurrentUser } from "@/lib/auth";
import { getProgressRows, markLessonStarted, todayUtc } from "@/lib/data";
import { db } from "@/lib/db";
import { getMemoryNotes, refreshMemoryIfDue } from "@/lib/memory";
import { isUnlocked } from "@/lib/progress";
import { buildSpecialistSystemPrompt } from "@/lib/prompts";

const BodySchema = z.object({
  specialistSlug: z.string(),
  // A lesson slug, or "office-hours".
  thread: z.string(),
  message: z.string().trim().min(1).max(4000),
});

// How many earlier messages in this thread are sent back to the model each turn.
const HISTORY_LIMIT = 30;

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Please sign in." }, { status: 401 });
  if (!hasAnthropicKey()) {
    return Response.json({ error: "ANTHROPIC_API_KEY is not configured on the server." }, { status: 503 });
  }

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request." }, { status: 400 });
  const { specialistSlug, thread, message } = parsed.data;

  const specialist = getSpecialist(specialistSlug);
  const found = thread === OFFICE_HOURS ? null : getLesson(specialistSlug, thread);
  if (!specialist || (thread !== OFFICE_HOURS && !found)) {
    return Response.json({ error: "Unknown specialist or lesson." }, { status: 404 });
  }

  const progress = await getProgressRows(user.id);
  if (found) {
    if (!isUnlocked(specialist, found.index, progress)) {
      return Response.json({ error: "Pass the previous lesson's quiz to unlock this one." }, { status: 403 });
    }
    await markLessonStarted(user.id, specialistSlug, thread);
  }

  const recent = await db.chatMessage.findMany({
    where: { userId: user.id, specialistSlug, thread },
    orderBy: { createdAt: "desc" },
    take: HISTORY_LIMIT,
    select: { role: true, content: true },
  });
  const history: Anthropic.Beta.BetaMessageParam[] = recent
    .reverse()
    .map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }));
  // The conversation sent to the API must open with a user turn.
  while (history[0]?.role === "assistant") history.shift();

  await db.chatMessage.create({ data: { userId: user.id, specialistSlug, thread, role: "user", content: message } });

  const system = buildSpecialistSystemPrompt({
    specialist,
    lesson: found?.lesson ?? null,
    completedLessonSlugs: progress
      .filter((p) => p.specialistSlug === specialistSlug && p.status === "COMPLETED")
      .map((p) => p.lessonSlug),
    memoryNotes: await getMemoryNotes(user.id, specialistSlug),
    username: user.username,
    today: todayUtc(),
  });

  const stream = anthropic.beta.messages.stream(
    {
      model: MODEL,
      max_tokens: 16000,
      output_config: { effort: "medium" },
      // Caches the system prompt and conversation prefix between turns.
      cache_control: { type: "ephemeral" },
      system,
      messages: [...history, { role: "user", content: message }],
      ...fallbackParams(),
    },
    { signal: request.signal },
  );

  // Update the specialist's notes about the student once the reply is done.
  after(() => refreshMemoryIfDue(user.id, specialist).catch((error) => console.error("memory refresh failed", error)));

  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      let text = "";
      try {
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            text += event.delta.text;
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        if ((await stream.finalMessage()).stop_reason === "refusal") {
          const note = "\n\n_I can't continue with that request. Try rephrasing your question._";
          text += note;
          controller.enqueue(encoder.encode(note));
        }
        if (text.trim()) {
          await db.chatMessage.create({
            data: { userId: user.id, specialistSlug, thread, role: "assistant", content: text },
          });
        }
      } catch (error) {
        if (!request.signal.aborted) {
          console.error("chat stream failed", error);
          controller.enqueue(encoder.encode(`\n\n⚠️ ${describeApiError(error)}`));
        }
      } finally {
        controller.close();
      }
    },
    cancel() {
      stream.abort();
    },
  });

  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
}
