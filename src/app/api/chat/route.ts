import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { getModule } from "@/content";
import { anthropic, describeApiError, fallbackParams, hasAnthropicKey, MODEL } from "@/lib/anthropic";
import { getCurrentUser } from "@/lib/auth";
import { getProgressRows, markModuleStarted, todayUtc } from "@/lib/data";
import { db } from "@/lib/db";
import { isUnlocked } from "@/lib/progress";
import { buildProfessorSystemPrompt } from "@/lib/prompts";

const BodySchema = z.object({
  professorSlug: z.string(),
  moduleSlug: z.string(),
  message: z.string().trim().min(1).max(4000),
});

// How many earlier messages are sent back to the model each turn.
const HISTORY_LIMIT = 40;

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Please sign in." }, { status: 401 });
  if (!hasAnthropicKey()) {
    return Response.json({ error: "ANTHROPIC_API_KEY is not configured on the server." }, { status: 503 });
  }

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request." }, { status: 400 });
  const { professorSlug, moduleSlug, message } = parsed.data;

  const found = getModule(professorSlug, moduleSlug);
  if (!found) return Response.json({ error: "Unknown classroom." }, { status: 404 });
  const { professor, module, index } = found;

  const progress = await getProgressRows(user.id);
  if (!isUnlocked(professor, index, progress)) {
    return Response.json({ error: "Finish the previous module's quiz to unlock this one." }, { status: 403 });
  }
  await markModuleStarted(user.id, professorSlug, moduleSlug);

  const recent = await db.chatMessage.findMany({
    where: { userId: user.id, professorSlug, moduleSlug },
    orderBy: { createdAt: "desc" },
    take: HISTORY_LIMIT,
    select: { role: true, content: true },
  });
  const history: Anthropic.Beta.BetaMessageParam[] = recent
    .reverse()
    .map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }));
  // The conversation sent to the API must open with a user turn.
  while (history[0]?.role === "assistant") history.shift();

  await db.chatMessage.create({
    data: { userId: user.id, professorSlug, moduleSlug, role: "user", content: message },
  });

  const system = buildProfessorSystemPrompt({
    professor,
    module,
    completedModuleSlugs: progress
      .filter((p) => p.professorSlug === professorSlug && p.status === "COMPLETED")
      .map((p) => p.moduleSlug),
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
        const final = await stream.finalMessage();
        if (final.stop_reason === "refusal") {
          const note = "\n\n_The professor can't continue with that request. Try rephrasing your question._";
          text += note;
          controller.enqueue(encoder.encode(note));
        }
        if (text.trim()) {
          await db.chatMessage.create({
            data: { userId: user.id, professorSlug, moduleSlug, role: "assistant", content: text },
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

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
