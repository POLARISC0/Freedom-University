import type { Metadata } from "next";
import { NEWS_PROFESSOR } from "@/content";
import { Markdown } from "@/components/Markdown";
import { Disclaimer } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { linkHeadlineCitations } from "@/lib/citations";
import { todayUtc } from "@/lib/data";
import { db } from "@/lib/db";
import type { Headline } from "@/lib/news";
import { RefreshBriefingButton } from "./RefreshBriefingButton";

export const metadata: Metadata = { title: "Daily Briefing" };

const timeFmt = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });

export default async function NewsPage() {
  await requireUser("/news");
  const today = todayUtc();
  // Show today's briefing, or the most recent one while today's hasn't been written.
  const briefing = await db.newsBriefing.findFirst({ orderBy: { day: "desc" } });
  const headlines = (briefing?.headlines ?? []) as unknown as Headline[];
  const isToday = briefing?.day === today;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm text-muted">
            {NEWS_PROFESSOR.emoji} {NEWS_PROFESSOR.name} · {NEWS_PROFESSOR.course}
          </p>
          <h1 className="font-serif text-3xl font-semibold">Daily Briefing</h1>
          {briefing && (
            <p className="text-sm text-muted">
              {isToday ? "Today's" : `From ${briefing.day}:`} briefing, updated {timeFmt.format(briefing.updatedAt)} UTC
            </p>
          )}
        </div>
        <RefreshBriefingButton label={isToday ? "Refresh briefing" : "Write today's briefing"} />
      </header>

      <Disclaimer />

      {!briefing ? (
        <div className="rounded-xl border border-dashed border-line p-10 text-center text-muted">
          No briefing yet. Ask {NEWS_PROFESSOR.name} to write today&apos;s, using the latest crypto and macro headlines.
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
          <article className="rounded-xl border border-line bg-surface p-6">
            <Markdown>{linkHeadlineCitations(briefing.summary, headlines.map((h) => h.url))}</Markdown>
            <p className="mt-6 border-t border-line pt-3 text-xs text-muted">
              Written by an AI professor from the headlines listed here. Read the original articles before relying on any
              detail. Education only, not financial advice.
            </p>
          </article>
          <aside className="space-y-3">
            <h2 className="font-semibold">Headlines</h2>
            <ol className="space-y-3 text-sm">
              {headlines.map((h, i) => (
                <li key={h.url} className="flex gap-2">
                  <span className="shrink-0 font-mono text-xs leading-5 text-muted">[{i + 1}]</span>
                  <span>
                    <a href={h.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                      {h.title}
                    </a>
                    <span className="block text-xs text-muted">
                      {h.source} · {h.category === "crypto" ? "Crypto" : "Macro"}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
            <p className="text-xs text-muted">Headlines via GNews.io</p>
          </aside>
        </div>
      )}
    </div>
  );
}
