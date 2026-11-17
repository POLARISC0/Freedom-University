import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { forgetMe } from "@/app/actions";
import { getSpecialist, OFFICE_HOURS, SPECIALISTS } from "@/content";
import { ChatRoom } from "@/components/ChatRoom";
import { SourceList } from "@/components/SourceList";
import { ACCENTS, Disclaimer, ProgressBar, StatusBadge } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getChatHistory, getProgressRows } from "@/lib/data";
import { getMemoryNotes } from "@/lib/memory";
import { completedCount, lessonStatuses } from "@/lib/progress";
import { OFFICE_HOURS_KICKOFF } from "@/lib/prompts";

export function generateStaticParams() {
  return SPECIALISTS.map((s) => ({ specialist: s.slug }));
}

export async function generateMetadata({ params }: PageProps<"/specialists/[specialist]">): Promise<Metadata> {
  const specialist = getSpecialist((await params).specialist);
  return { title: specialist ? `${specialist.name}, ${specialist.role}` : "Specialist" };
}

export default async function SpecialistPage({ params }: PageProps<"/specialists/[specialist]">) {
  const { specialist: slug } = await params;
  const specialist = getSpecialist(slug);
  if (!specialist) notFound();

  const user = await requireUser(`/specialists/${slug}`);
  const [progress, history, memory] = await Promise.all([
    getProgressRows(user.id),
    getChatHistory(user.id, slug, OFFICE_HOURS),
    getMemoryNotes(user.id, slug),
  ]);
  const statuses = lessonStatuses(specialist, progress);
  const rows = new Map(progress.filter((r) => r.specialistSlug === slug).map((r) => [r.lessonSlug, r]));

  return (
    <div className="space-y-6">
      <nav className="text-sm text-muted">
        <Link href="/floor" className="hover:text-ink">Trading Floor</Link> / {specialist.name}
      </nav>

      <header className={`rounded-2xl border border-l-4 border-line bg-surface p-6 ${ACCENTS[specialist.accent].ring}`}>
        <div className="flex flex-wrap items-start gap-5">
          <div className="text-5xl" aria-hidden>{specialist.emoji}</div>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-sm text-muted">{specialist.role}</p>
            <h1 className="font-serif text-3xl font-semibold">{specialist.name}</h1>
            <p className="text-muted">{specialist.tagline}</p>
            <div className="max-w-sm pt-3">
              <ProgressBar value={completedCount(specialist, progress)} max={specialist.lessons.length} accent={specialist.accent} />
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <section className="min-w-0 space-y-3">
          <h2 className="font-serif text-xl font-semibold">Office hours</h2>
          <ChatRoom
            specialist={{ slug: specialist.slug, name: specialist.name, emoji: specialist.emoji }}
            thread={OFFICE_HOURS}
            kickoff={{
              label: `Say hello to ${specialist.name}`,
              intro: `Ask ${specialist.name} anything about ${specialist.topic.toLowerCase()}, or start with lesson 1.`,
              message: OFFICE_HOURS_KICKOFF,
            }}
            sources={specialist.sources}
            initialMessages={history.map((m) => ({ id: m.id, role: m.role === "assistant" ? "assistant" : "user", content: m.content }))}
          />
          <Disclaimer />
        </section>

        <aside className="space-y-6">
          <div className="space-y-3">
            <h2 className="font-serif text-xl font-semibold">Beginner lessons</h2>
            <ol className="space-y-2">
              {specialist.lessons.map((l, i) => {
                const status = statuses[i];
                const row = rows.get(l.slug);
                const body = (
                  <>
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="font-medium">{i + 1}. {l.title}</span>
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-2">
                      <StatusBadge status={status} />
                      {row && row.attempts > 0 && <span className="text-xs text-muted">Best {row.bestScore}%</span>}
                    </span>
                  </>
                );
                return (
                  <li key={l.slug}>
                    {status === "locked" ? (
                      <div className="block rounded-lg border border-dashed border-line p-3 text-sm opacity-60">{body}</div>
                    ) : (
                      <Link href={`/specialists/${slug}/${l.slug}`} className="block rounded-lg border border-line bg-surface p-3 text-sm hover:shadow-md">
                        {body}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="space-y-2 rounded-xl border border-line bg-surface p-4">
            <h2 className="font-semibold">What {specialist.name} remembers about you</h2>
            {memory ? (
              <>
                <p className="whitespace-pre-wrap text-sm">{memory}</p>
                <form action={forgetMe}>
                  <input type="hidden" name="specialist" value={slug} />
                  <button className="text-xs text-muted underline hover:text-ink">Forget this</button>
                </form>
              </>
            ) : (
              <p className="text-sm text-muted">Nothing yet. After a few messages, {specialist.name} keeps short notes so future chats pick up where you left off.</p>
            )}
          </div>

          <div className="space-y-2">
            <h2 className="font-semibold">Reading list</h2>
            <SourceList sources={specialist.sources} />
          </div>
        </aside>
      </div>
    </div>
  );
}
