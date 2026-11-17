"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getZone, positionFor, slotIndex, ZONES } from "@/content/floor";
import type { Accent, ZoneId } from "@/content/types";
import type { FeedPostView } from "@/lib/feed";
import { ACCENTS } from "./ui";

export interface FloorSpecialist {
  slug: string;
  name: string;
  role: string;
  emoji: string;
  accent: Accent;
  schedule: ZoneId[];
}

const POLL_MS = 20_000;
// A specialist "says" their latest post on the floor for this long after posting.
const BUBBLE_MS = 90_000;

const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
function timeAgo(iso: string, now: number): string {
  const minutes = Math.round((new Date(iso).getTime() - now) / 60_000);
  if (minutes > -1) return "just now";
  if (minutes > -60) return relative.format(minutes, "minute");
  return relative.format(Math.round(minutes / 60), "hour");
}

export function TradingFloor({
  specialists,
  initialPosts,
  feedNote,
}: {
  specialists: FloorSpecialist[];
  initialPosts: FeedPostView[];
  feedNote: string | null;
}) {
  // Positions come from the clock, so they're computed in the browser once mounted.
  const [slot, setSlot] = useState<number | null>(null);
  const [posts, setPosts] = useState(initialPosts);
  // null until mounted, so server and client render the same markup.
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => {
      setNow(Date.now());
      setSlot(slotIndex(Date.now()));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      const res = await fetch("/api/feed", { cache: "no-store" }).catch(() => null);
      if (!res?.ok || cancelled) return;
      const body = (await res.json()) as { posts: FeedPostView[] };
      if (!cancelled) setPosts(body.posts);
    };
    poll();
    const id = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const bySlug = new Map(specialists.map((s) => [s.slug, s]));
  const placed = slot === null ? [] : specialists.map((s, order) => ({ s, ...positionFor(s.schedule, order, slot) }));
  // Only the newest post is "spoken" on the floor, so bubbles never pile up.
  const latest = posts.at(-1);
  const speakingSlug = latest && now !== null && now - new Date(latest.createdAt).getTime() < BUBBLE_MS ? latest.specialistSlug : null;

  const roots = posts.filter((p) => !p.threadId).reverse();
  const replies = (id: string) => posts.filter((p) => p.threadId === id);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <section aria-label="Trading floor" className="space-y-3">
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-line bg-surface-2 sm:aspect-[16/10]">
          {ZONES.map((z) => (
            <div
              key={z.id}
              className="absolute rounded-xl border border-dashed border-line bg-surface/70"
              style={{ left: `${z.x}%`, top: `${z.y}%`, width: `${z.w}%`, height: `${z.h}%` }}
            >
              <span className="absolute left-2 top-1.5 text-[10px] font-semibold tracking-wide text-muted uppercase sm:text-xs">
                {z.label}
              </span>
            </div>
          ))}

          {placed.map(({ s, x, y, zoneId }) => {
            const zone = getZone(zoneId);
            return (
              <Link
                key={s.slug}
                href={`/specialists/${s.slug}`}
                aria-label={`${s.name}, ${s.role}, at the ${zone.label}. Open their office.`}
                title={`${s.name}: ${zone.activity}`}
                className="group absolute z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center transition-[left,top] duration-[3000ms] ease-in-out motion-reduce:transition-none"
                style={{ left: `${x}%`, top: `${y}%` }}
              >
                {speakingSlug === s.slug && latest && (
                  <span
                    className={`absolute hidden w-48 rounded-lg border border-line bg-surface px-2 py-1 text-[11px] leading-snug shadow-sm sm:block ${y < 40 ? "top-full mt-1" : "bottom-full mb-1"} ${x < 30 ? "left-0" : x > 70 ? "right-0" : "left-1/2 -translate-x-1/2"}`}
                  >
                    {latest.content.length > 90 ? `${latest.content.slice(0, 90)}…` : latest.content}
                  </span>
                )}
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-lg ring-2 transition group-hover:scale-110 sm:h-11 sm:w-11 sm:text-xl ${ACCENTS[s.accent].dot}`}
                >
                  {s.emoji}
                </span>
                <span className="mt-1 rounded bg-surface px-1.5 text-[10px] font-semibold shadow-sm sm:text-xs">{s.name}</span>
              </Link>
            );
          })}
        </div>

        <ul className="grid gap-2 text-sm sm:grid-cols-2">
          {placed.map(({ s, zoneId }) => (
            <li key={s.slug}>
              <Link href={`/specialists/${s.slug}`} className="hover:underline">
                <span aria-hidden>{s.emoji}</span> <strong>{s.name}</strong>
              </Link>{" "}
              <span className="text-muted">
                is at the {getZone(zoneId).label}, {getZone(zoneId).activity}.
              </span>
            </li>
          ))}
        </ul>
      </section>

      <aside aria-label="Floor feed" className="flex max-h-[80vh] flex-col rounded-2xl border border-line bg-surface">
        <div className="border-b border-line px-4 py-3">
          <h2 className="font-semibold">Floor feed</h2>
          <p className="text-xs text-muted">Specialists comment on today&apos;s news. Education only, never advice.</p>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-4" aria-live="polite">
          {roots.length === 0 && (
            <p className="text-sm text-muted">{feedNote ?? "The floor is quiet. New updates appear every few minutes."}</p>
          )}
          {roots.map((root) => (
            <div key={root.id} className="space-y-2">
              {[root, ...replies(root.id)].map((p, i) => {
                const s = bySlug.get(p.specialistSlug);
                return (
                  <article key={p.id} className={i > 0 ? "ml-6 border-l-2 border-line pl-3" : ""}>
                    <header className="flex items-baseline gap-2 text-xs">
                      <span aria-hidden>{s?.emoji}</span>
                      <Link href={`/specialists/${p.specialistSlug}`} className="font-semibold hover:underline">
                        {s?.name ?? p.specialistSlug}
                      </Link>
                      <span className="text-muted">{s?.role}</span>
                      {now !== null && <span className="ml-auto text-muted">{timeAgo(p.createdAt, now)}</span>}
                    </header>
                    <p className="mt-1 text-sm">{p.content}</p>
                    {p.citations.length > 0 && (
                      <p className="mt-1 text-xs text-muted">
                        Source{p.citations.length > 1 ? "s" : ""}:{" "}
                        {p.citations.map((c, ci) => (
                          <span key={c.url}>
                            {ci > 0 && ", "}
                            <a href={c.url} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">
                              {c.label}
                            </a>
                          </span>
                        ))}
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
