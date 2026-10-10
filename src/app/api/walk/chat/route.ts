import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { anthropic, describeApiError, fallbackParams, hasAnthropicKey, MODEL } from "@/lib/anthropic";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildCharacterSystemPrompt, concernNote } from "@/walk/ai/prompts";
import { getCharacter, getLesson, LESSONS } from "@/walk/content";
import { detectConcerns } from "@/walk/safety/concern";
import { getConversation } from "@/walk/server/data";

// How many earlier messages are sent back to the model each turn.
const HISTORY_LIMIT = 30;
// A generous ceiling that keeps one account from running up the AI bill.
const MESSAGES_PER_HOUR = 60;

/** Lesson conversations live in a thread named after the lesson; everything else is "talk". */
function resolveThread(characterId: string, lessonSlug: string | undefined) {
  const character = getCharacter(characterId);
  if (!character) return { error: "Unknown character." } as const;
  if (lessonSlug) {
    const lesson = getLesson(lessonSlug);
    if (!lesson || lesson.mentorId !== character.id) return { error: "Unknown lesson." } as const;
    return { character, lesson, thread: lesson.slug } as const;
  }
  if (!character.conversational) {
    return { error: `Conversations with ${character.shortName} open in a later chapter.` } as const;
  }
  return { character, lesson: undefined, thread: "talk" } as const;
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Please sign in." }, { status: 401 });
  const url = new URL(request.url);
  const resolved = resolveThread(url.searchParams.get("characterId") ?? "", url.searchParams.get("lessonSlug") || undefined);
  if ("error" in resolved) return Response.json({ error: resolved.error }, { status: 404 });
  const messages = await getConversation(user.id, resolved.character.id, resolved.thread);
  return Response.json({ messages, aiConfigured: hasAnthropicKey() });
}

const BodySchema = z.object({
  characterId: z.string(),
  lessonSlug: z.string().optional(),
  message: z.string().trim().min(1).max(2000),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Please sign in." }, { status: 401 });
  if (!hasAnthropicKey()) {
    return Response.json(
      { error: "Conversations need an Anthropic API key on the server (ANTHROPIC_API_KEY). The rest of the lesson still works." },
      { status: 503 },
    );
  }

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Messages can be up to 2,000 characters." }, { status: 400 });
  const { characterId, lessonSlug, message } = parsed.data;
  const resolved = resolveThread(characterId, lessonSlug);
  if ("error" in resolved) return Response.json({ error: resolved.error }, { status: 404 });
  const { character, lesson, thread } = resolved;

  const recent = await getConversation(user.id, character.id, thread, HISTORY_LIMIT);
  const history: Anthropic.Beta.BetaMessageParam[] = recent.map((m) => ({ role: m.role, content: m.content }));
  // The conversation sent to the API must open with a user turn.
  while (history[0]?.role === "assistant") history.shift();

  // Record the message before counting, so parallel requests can't all slip under the hourly limit.
  const saved = await db.walkMessage.create({
    data: { userId: user.id, characterId: character.id, thread, role: "user", content: message },
  });
  const lastHour = await db.walkMessage.count({
    where: { userId: user.id, role: "user", createdAt: { gt: new Date(Date.now() - 60 * 60 * 1000) } },
  });
  if (lastHour > MESSAGES_PER_HOUR) {
    await db.walkMessage.delete({ where: { id: saved.id } });
    return Response.json(
      { error: "You've had a lot of conversations this hour. Take a break, open your Bible, and come back soon." },
      { status: 429 },
    );
  }

  const completed = await db.walkLessonProgress.findMany({
    where: { userId: user.id, status: "COMPLETED" },
    select: { lessonSlug: true },
  });
  const system: Anthropic.Beta.BetaTextBlockParam[] = [
    {
      type: "text",
      text: buildCharacterSystemPrompt({
        character,
        lesson,
        playerName: user.username,
        completedLessons: LESSONS.filter((l) => completed.some((c) => c.lessonSlug === l.slug)).map((l) => l.title),
      }),
    },
  ];
  // Only on turns that need it, so the main prompt stays cached.
  const concerns = detectConcerns(message);
  if (concerns.length) system.push({ type: "text", text: concernNote(concerns) });

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
          const note = `\n\n_${character.shortName} can't continue with that. Try asking another way._`;
          text += note;
          controller.enqueue(encoder.encode(note));
        }
        if (text.trim()) {
          await db.walkMessage.create({
            data: { userId: user.id, characterId: character.id, thread, role: "assistant", content: text },
          });
        }
      } catch (error) {
        if (!request.signal.aborted) {
          console.error("walk chat stream failed", error);
          controller.enqueue(encoder.encode(`\n\n⚠️ ${describeApiError(error, "The mentors")}`));
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
