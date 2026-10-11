import { z } from "zod";
import { DISTRICTS } from "@/content/world";
import { CORE_RULES } from "../prompts";
import { HEADMASTERS, MENTORS, getMentor, type Headmaster } from "./registry";

// What a Headmaster returns each turn. `handoff` sends the member to a mentor
// with a note the mentor reads; `suggestDistrict` points them somewhere on the map.
export const HeadmasterReplySchema = z.object({
  reply: z.string(),
  handoff: z.object({ mentor: z.string(), note: z.string() }).nullable(),
  suggestDistrict: z.string().nullable(),
});

export type HeadmasterReply = z.infer<typeof HeadmasterReplySchema>;

export function cleanHeadmasterReply(raw: HeadmasterReply): HeadmasterReply {
  const handoff = raw.handoff && getMentor(raw.handoff.mentor) ? { mentor: raw.handoff.mentor, note: raw.handoff.note.trim() } : null;
  const suggestDistrict = raw.suggestDistrict && DISTRICTS.some((d) => d.id === raw.suggestDistrict) ? raw.suggestDistrict : null;
  return { reply: raw.reply.trim() || "I'm here. What can I help you with?", handoff, suggestDistrict };
}

/** Facts the help centre answers. Keep in sync with how the product actually works. */
const HELP_CENTRE = `- Signing in: pick a username; there is no password yet, so anyone who knows a username can use that account.
- Mentors and lessons: each mentor teaches a 5-lesson beginner course in their district. Lessons unlock in order; each ends with a 4-question quiz, and 70% or more completes it.
- Office hours: every mentor's district also has an open chat for questions outside lessons.
- Memory: mentors keep short notes about what a member has covered; members can read and clear them on the mentor's page.
- The Trading Floor: the live district where mentors post short, cited takes on today's news. The daily briefing is written by Atlas from the day's headlines.
- Dashboard: shows completed lessons and recent quiz scores.
- Community Square and the Shop are opening soon; nothing is for sale yet, and the Shop will never sell financial products.`;

export interface MentorReport {
  mentorId: string;
  completedLessons: number;
  totalLessons: number;
  notes: string | null;
}

export function buildHeadmasterPrompt(opts: {
  headmaster: Headmaster;
  username: string;
  today: string;
  reports: MentorReport[];
  recentMentorThread: { mentorId: string; messages: { role: string; content: string }[] } | null;
}): string {
  const { headmaster } = opts;
  const other = HEADMASTERS.filter((h) => h.id !== headmaster.id);
  const mentors = MENTORS.map((m) => `- ${m.id}: ${m.name}, ${m.role}. Gatekeeper and teacher of the ${m.name} district (${m.href}).`).join("\n");
  const districts = DISTRICTS.map((d) => `- ${d.id}: ${d.name} (${d.kicker})${d.status === "soon" ? ", opening soon" : ""}`).join("\n");
  const reports = opts.reports.length
    ? opts.reports
        .map((r) => `- ${getMentor(r.mentorId)?.name ?? r.mentorId}: ${r.completedLessons}/${r.totalLessons} lessons completed.${r.notes ? `\n  Notes: ${r.notes.replace(/\n/g, "\n  ")}` : ""}`)
        .join("\n")
    : "- No mentor has worked with this member yet.";
  const thread = opts.recentMentorThread?.messages.length
    ? `Their most recent conversation was with ${getMentor(opts.recentMentorThread.mentorId)?.name}. You can pick it back up if they want to continue with you instead:\n${opts.recentMentorThread.messages
        .map((m) => `${m.role === "user" ? "Member" : "Mentor"}: ${m.content.slice(0, 600)}`)
        .join("\n")}`
    : "They haven't talked to a mentor yet.";

  return `You are ${headmaster.name}, ${headmaster.title} of Freedom University, a product by Polaris: a bright online world of districts where AI mentors teach, never trade. You are an AI and say so if asked.

${headmaster.personality}

You are one of two Headmasters, the top-level agents who oversee everything: every member request, the help centre, the automations, routing members to the right district, and all four mentors. ${other.map((h) => `The other Headmaster is ${h.name}, ${h.title}: ${h.duties.join("; ")}.`).join(" ")} Your own duties: ${headmaster.duties.join("; ")}.

Today is ${opts.today}. You're talking with the member "${opts.username}".

## Rules
${CORE_RULES}
- You don't teach full lessons. Give a short, clear answer, then route the member to the mentor whose district covers it.

## Mentors (one per district)
${mentors}

## Districts on the map
${districts}

## Mentor reports for this member
${reports}

## Picking conversations back up
${thread}

## Help centre
${HELP_CENTRE}

## How to answer
- reply: 1-4 short sentences in your own voice, plain language, no markdown headings.
- handoff: when a mentor should take over, set mentor to their id (exactly as listed) and write a one-sentence note for that mentor about what the member wants. Otherwise null.
- suggestDistrict: a district id (exactly as listed) when pointing them somewhere on the map, otherwise null.`;
}
