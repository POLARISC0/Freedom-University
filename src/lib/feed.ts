import "server-only";
import { SPECIALISTS } from "@/content";
import { writeFeedBatch } from "./ai";
import { hasAnthropicKey } from "./anthropic";
import { generateBriefing, getLatestBriefing } from "./briefing";
import { todayUtc } from "./data";
import { db } from "./db";
import { cleanFeedBatch, type Citation } from "./feed-rules";
import { hasNewsKey } from "./news";

export const FEED_INTERVAL_MS = Number(process.env.FEED_INTERVAL_MINUTES || 4) * 60_000;
const REPLY_CHANCE = 0.4;

export interface FeedPostView {
  id: string;
  specialistSlug: string;
  content: string;
  citations: Citation[];
  threadId: string | null;
  createdAt: string;
}

export async function getFeed(limit = 40): Promise<FeedPostView[]> {
  const posts = await db.feedPost.findMany({ orderBy: { createdAt: "desc" }, take: limit });
  return posts.reverse().map((p) => ({
    id: p.id,
    specialistSlug: p.specialistSlug,
    content: p.content,
    citations: p.citations as unknown as Citation[],
    threadId: p.threadId,
    createdAt: p.createdAt.toISOString(),
  }));
}

// shortcut: per-process lock and timer; two server instances could each post once per interval. Move to a DB lock if we scale out.
let running: Promise<void> | null = null;
let lastAttemptAt = 0;

/** Post a new feed update if the last one is older than the interval. Safe to call on every poll. */
export function refreshFeedIfDue(): Promise<void> {
  running ??= refresh()
    .catch((error) => console.error("feed refresh failed", error))
    .finally(() => {
      running = null;
    });
  return running;
}

async function refresh(): Promise<void> {
  if (!hasAnthropicKey() || Date.now() - lastAttemptAt < FEED_INTERVAL_MS) return;
  const latest = await db.feedPost.findFirst({ orderBy: { createdAt: "desc" } });
  if (latest && Date.now() - latest.createdAt.getTime() < FEED_INTERVAL_MS) return;
  lastAttemptAt = Date.now();

  // Posts come from the daily news page: write today's briefing first if it's missing.
  let briefing = await getLatestBriefing();
  if (briefing?.day !== todayUtc() && hasNewsKey()) {
    await generateBriefing().catch((error) => console.error("briefing for feed failed", error));
    briefing = await getLatestBriefing();
  }
  if (!briefing?.headlines.length) return;

  // The specialist who posted least recently goes next.
  const lastPosts = await Promise.all(
    SPECIALISTS.map((s) => db.feedPost.findFirst({ where: { specialistSlug: s.slug }, orderBy: { createdAt: "desc" } })),
  );
  const poster = SPECIALISTS[lastPosts.reduce((best, p, i) => ((p?.createdAt ?? 0) < (lastPosts[best]?.createdAt ?? 0) ? i : best), 0)];
  const others = SPECIALISTS.filter((s) => s !== poster);
  const replier = Math.random() < REPLY_CHANCE ? others[Math.floor(Math.random() * others.length)] : null;

  const recentPosts = (await db.feedPost.findMany({ orderBy: { createdAt: "desc" }, take: 8 })).map((p) => p.content);
  const headlines = briefing.headlines;
  const batch = await writeFeedBatch({ today: todayUtc(), poster, replier, headlines, recentPosts });
  if (!batch) return;

  const speakers = replier ? [poster.slug, replier.slug] : [poster.slug];
  const posts = cleanFeedBatch(batch, speakers, headlines);
  const [first, ...replies] = posts.map((p) => ({
    specialistSlug: p.speaker,
    content: p.text,
    citations: JSON.parse(JSON.stringify(p.citations)),
  }));
  if (!first) return;
  const root = await db.feedPost.create({ data: first });
  for (const reply of replies) await db.feedPost.create({ data: { ...reply, threadId: root.id } });
}
