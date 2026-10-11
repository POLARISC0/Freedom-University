import type { Metadata } from "next";
import { SPECIALISTS } from "@/content";
import { TradingFloor } from "@/components/TradingFloor";
import { Disclaimer } from "@/components/ui";
import { hasAnthropicKey } from "@/lib/anthropic";
import { requireUser } from "@/lib/auth";
import { getFeed } from "@/lib/feed";
import { hasNewsKey } from "@/lib/news";

export const metadata: Metadata = { title: "Trading Floor" };

export default async function FloorPage() {
  await requireUser("/floor");
  const feedNote = !hasAnthropicKey()
    ? "The feed is offline: ANTHROPIC_API_KEY is not configured."
    : !hasNewsKey()
      ? "The feed is waiting for today's news: GNEWS_API_KEY is not configured."
      : null;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-3xl font-semibold">The Trading Floor</h1>
        <p className="text-muted">AI specialists who teach, not trade. Click anyone to chat and take lessons.</p>
      </header>
      <TradingFloor
        specialists={SPECIALISTS.map(({ slug, name, role, emoji, accent, schedule }) => ({ slug, name, role, emoji, accent, schedule }))}
        initialPosts={await getFeed()}
        feedNote={feedNote}
      />
      <Disclaimer />
    </div>
  );
}
