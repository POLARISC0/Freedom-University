import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProfessor, PROFESSORS } from "@/content";
import { LEVELS } from "@/content/types";
import { SourceList } from "@/components/SourceList";
import { ACCENTS, Disclaimer, LevelBadge, ProgressBar, StatusBadge } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getProgressRows } from "@/lib/data";
import { completedCount, moduleStatuses } from "@/lib/progress";

export function generateStaticParams() {
  return PROFESSORS.map((p) => ({ professor: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/classrooms/[professor]">): Promise<Metadata> {
  const professor = getProfessor((await params).professor);
  return { title: professor?.course ?? "Classroom" };
}

export default async function ProfessorPage({ params }: PageProps<"/classrooms/[professor]">) {
  const { professor: slug } = await params;
  const professor = getProfessor(slug);
  if (!professor) notFound();

  const user = await requireUser(`/classrooms/${slug}`);
  const progress = await getProgressRows(user.id);
  const statuses = moduleStatuses(professor, progress);
  const scores = new Map(progress.filter((r) => r.professorSlug === slug).map((r) => [r.moduleSlug, r]));

  return (
    <div className="space-y-8">
      <header className={`rounded-2xl border border-l-4 border-line bg-surface p-6 ${ACCENTS[professor.accent].ring}`}>
        <div className="flex flex-wrap items-start gap-5">
          <div className="text-5xl" aria-hidden>{professor.emoji}</div>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-sm text-muted">Course {professor.number} · {professor.name}</p>
            <h1 className="font-serif text-3xl font-semibold">{professor.course}</h1>
            <p className="text-muted">{professor.tagline}</p>
            <div className="max-w-sm pt-3">
              <ProgressBar value={completedCount(professor, progress)} max={professor.modules.length} accent={professor.accent} />
            </div>
          </div>
        </div>
      </header>

      <Disclaimer />

      <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
        <section className="space-y-6">
          <h2 className="font-serif text-2xl font-semibold">Lesson path</h2>
          {LEVELS.map((level) => (
            <div key={level} className="space-y-3">
              <h3 className="text-sm font-semibold tracking-wide text-muted uppercase">{level}</h3>
              {professor.modules.map((m, i) => {
                if (m.level !== level) return null;
                const status = statuses[i];
                const row = scores.get(m.slug);
                const card = (
                  <div className="flex items-start gap-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-sm font-semibold">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-semibold">{m.title}</h4>
                        <LevelBadge level={m.level} />
                      </div>
                      <p className="text-sm text-muted">{m.summary}</p>
                      <div className="flex flex-wrap items-center gap-3 pt-1">
                        <StatusBadge status={status} />
                        {row && row.attempts > 0 && (
                          <span className="text-xs text-muted">
                            Best quiz score {row.bestScore}% · {row.attempts} attempt{row.attempts === 1 ? "" : "s"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
                return status === "locked" ? (
                  <div key={m.slug} className="rounded-xl border border-dashed border-line p-4 opacity-60" aria-disabled>
                    {card}
                  </div>
                ) : (
                  <Link
                    key={m.slug}
                    href={`/classrooms/${slug}/${m.slug}`}
                    className="block rounded-xl border border-line bg-surface p-4 transition hover:shadow-md"
                  >
                    {card}
                  </Link>
                );
              })}
            </div>
          ))}
        </section>

        <aside className="space-y-3">
          <h2 className="font-serif text-xl font-semibold">Reading list</h2>
          <p className="text-sm text-muted">The professor cites these as [S1], [S2], …</p>
          <SourceList sources={professor.sources} />
        </aside>
      </div>
    </div>
  );
}
