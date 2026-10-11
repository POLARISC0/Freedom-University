import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { getDistrict } from "@/content/world";
import { describeApiError, hasAnthropicKey } from "@/lib/anthropic";
import { askHeadmaster, HeadmasterRefusal } from "@/lib/agents/headmaster";
import { createHandoff, latestMentorThread, mentorReports } from "@/lib/agents/mentor";
import { getHeadmaster, getMentor } from "@/lib/agents/registry";
import { getCurrentUser } from "@/lib/auth";
import { todayUtc } from "@/lib/data";
import { db } from "@/lib/db";

// Headmaster conversations live in ChatMessage like any other agent thread.
const THREAD = "headmaster";
const HISTORY_LIMIT = 20;

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Please sign in." }, { status: 401 });
  const headmaster = getHeadmaster(new URL(request.url).searchParams.get("headmaster") ?? "");
  if (!headmaster) return Response.json({ error: "Unknown Headmaster." }, { status: 404 });
  const messages = await db.chatMessage.findMany({
    where: { userId: user.id, specialistSlug: headmaster.id, thread: THREAD },
    orderBy: { createdAt: "asc" },
    select: { id: true, role: true, content: true },
  });
  return Response.json({ messages });
}

const BodySchema = z.object({ headmaster: z.string(), message: z.string().trim().min(1).max(2000) });

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Please sign in to talk to a Headmaster." }, { status: 401 });
  if (!hasAnthropicKey()) return Response.json({ error: "ANTHROPIC_API_KEY is not configured on the server." }, { status: 503 });

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request." }, { status: 400 });
  const headmaster = getHeadmaster(parsed.data.headmaster);
  if (!headmaster) return Response.json({ error: "Unknown Headmaster." }, { status: 404 });
  const { message } = parsed.data;

  const where = { userId: user.id, specialistSlug: headmaster.id, thread: THREAD };
  const recent = await db.chatMessage.findMany({ where, orderBy: { createdAt: "desc" }, take: HISTORY_LIMIT, select: { role: true, content: true } });
  const history: Anthropic.Beta.BetaMessageParam[] = recent
    .reverse()
    .map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }));
  while (history[0]?.role === "assistant") history.shift();

  const [reports, recentMentorThread] = await Promise.all([mentorReports(user.id), latestMentorThread(user.id)]);
  await db.chatMessage.create({ data: { ...where, role: "user", content: message } });

  try {
    const reply = await askHeadmaster({
      headmaster,
      context: { username: user.username, today: todayUtc(), reports, recentMentorThread },
      history,
      message,
    });

    // Turn the routing decision into links the member can follow, and leave the mentor a note.
    const links: string[] = [];
    if (reply.handoff) {
      const mentor = getMentor(reply.handoff.mentor)!;
      await createHandoff(user.id, headmaster.id, mentor.id, reply.handoff.note);
      links.push(`→ [Go to ${mentor.name}, ${mentor.topic}](${mentor.href}) · ${headmaster.name} has briefed them`);
    }
    const district = reply.suggestDistrict ? getDistrict(reply.suggestDistrict) : undefined;
    if (district && district.href !== links[0]?.match(/\((.*?)\)/)?.[1]) links.push(`→ [Visit ${district.name}](${district.href})`);

    const content = [reply.reply, ...links].join("\n\n");
    const saved = await db.chatMessage.create({ data: { ...where, role: "assistant", content }, select: { id: true, role: true, content: true } });
    return Response.json({ message: saved, handoff: reply.handoff?.mentor ?? null });
  } catch (error) {
    console.error("headmaster failed", error);
    const text = error instanceof HeadmasterRefusal ? error.message : describeApiError(error);
    return Response.json({ error: text }, { status: 502 });
  }
}
