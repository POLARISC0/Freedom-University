import "server-only";
import { NEWS_SPECIALIST } from "@/content";
import { writeNewsBriefing } from "./ai";
import { todayUtc } from "./data";
import { db } from "./db";
import { fetchHeadlines, type Headline } from "./news";

/** Fetch today's headlines and have the news specialist write the briefing. Throws on failure. */
export async function generateBriefing(): Promise<void> {
  const day = todayUtc();
  const headlines = (await fetchHeadlines()).slice(0, 16);
  if (headlines.length === 0) throw new Error("The news service returned no headlines. Try again later.");
  const summary = await writeNewsBriefing({ specialist: NEWS_SPECIALIST, today: day, headlines });
  const data = { headlines: JSON.parse(JSON.stringify(headlines)), summary };
  await db.newsBriefing.upsert({ where: { day }, create: { day, ...data }, update: data });
}

export async function getLatestBriefing() {
  const briefing = await db.newsBriefing.findFirst({ orderBy: { day: "desc" } });
  return briefing && { ...briefing, headlines: briefing.headlines as unknown as Headline[] };
}
