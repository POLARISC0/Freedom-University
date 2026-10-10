import type { Metadata } from "next";
import Link from "next/link";
import { getModule, PROFESSORS } from "@/content";
import { ACCENTS, Disclaimer, ProgressBar } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getProgressRows } from "@/lib/data";
import { db } from "@/lib/db";
import { completedCount, nextModuleIndex } from "@/lib/progress";

export const metadata: Metadata = { title: "Dashboard" };

const dateFmt = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

export default async function DashboardPage() {
  const user = await requireUser("/dashboard");
  const [progress, recentAttempts] = await Promise.all([
    getProgressRows(user.id),
    db.quizAttempt.findMany({
      where: { userId: user.id, submittedAt: { not: null } },
      orderBy: { submittedAt: "desc" },
      take: 8,
      select: { id: true, professorSlug: true, moduleSlug: true, score: true, passed: true, submittedAt: true },
    }),
  ]);

  const totalModules = PROFESSORS.reduce((n, p) => n + p.modules.length, 0);
  const totalCompleted = PROFESSORS.reduce((n, p) => n + completedCount(p, progress), 0);
  const completed = progress
    .filter((r) => r.status === "COMPLETED")
    .sort((a, b) => (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0));
  // "Continue" points at the most recently touched course that still has an open module.
  const continueWith = PROFESSORS.map((p) => ({ p, next: nextModuleIndex(p, progress) }))
    .filter((x) => x.next !== null && progress.some((r) => r.professorSlug === x.p.slug))
    .at(0);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted">Welcome back, @{user.username}</p>
          <h1 className="font-serif text-3xl font-semibold">Your dashboard</h1>
        </div>
        <div className="rounded-xl border border-line bg-surface px-5 py-3 text-right">
          <p className="text-3xl font-semibold tabular-nums">
            {totalCompleted}
            <span className="text-lg text-muted">/{totalModules}</span>
          </p>
          <p className="text-xs text-muted">modules completed</p>
        </div>
      </header>

      {continueWith && continueWith.next !== null && (
        <Link
          href={`/classrooms/${continueWith.p.slug}/${continueWith.p.modules[continueWith.next].slug}`}
          className="flex items-center gap-4 rounded-xl border border-brand bg-brand-soft p-5"
        >
          <span className="text-3xl" aria-hidden>{continueWith.p.emoji}</span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm text-muted">Continue learning · {continueWith.p.course}</span>
            <span className="block font-semibold">{continueWith.p.modules[continueWith.next].title}</span>
          </span>
          <span aria-hidden>→</span>
        </Link>
      )}

      <section className="space-y-3">
        <h2 className="font-serif text-xl font-semibold">Courses</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {PROFESSORS.map((p) => (
            <Link
              key={p.slug}
              href={`/classrooms/${p.slug}`}
              className={`block rounded-xl border border-l-4 border-line bg-surface p-4 hover:shadow-md ${ACCENTS[p.accent].ring}`}
            >
              <div className="mb-2 flex items-center gap-2">
                <span aria-hidden>{p.emoji}</span>
                <span className="font-medium">{p.course}</span>
              </div>
              <ProgressBar value={completedCount(p, progress)} max={p.modules.length} accent={p.accent} />
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="space-y-3">
          <h2 className="font-serif text-xl font-semibold">Completed modules</h2>
          {completed.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line p-5 text-sm text-muted">
              No modules completed yet. Pass a module quiz with 70% or more to see it here.{" "}
              <Link href="/classrooms" className="text-brand underline">Pick a classroom</Link>.
            </p>
          ) : (
            <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
              {completed.map((r) => {
                const found = getModule(r.professorSlug, r.moduleSlug);
                if (!found) return null;
                return (
                  <li key={`${r.professorSlug}/${r.moduleSlug}`} className="flex items-center gap-3 px-4 py-3">
                    <span aria-hidden>{found.professor.emoji}</span>
                    <span className="min-w-0 flex-1">
                      <Link href={`/classrooms/${r.professorSlug}/${r.moduleSlug}`} className="block truncate font-medium hover:underline">
                        {found.module.title}
                      </Link>
                      <span className="text-xs text-muted">
                        {found.module.level} · {r.completedAt ? dateFmt.format(r.completedAt) : ""}
                      </span>
                    </span>
                    <span className="text-sm font-semibold tabular-nums text-success">{r.bestScore}%</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-xl font-semibold">Recent quiz attempts</h2>
          {recentAttempts.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line p-5 text-sm text-muted">No quizzes taken yet.</p>
          ) : (
            <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
              {recentAttempts.map((a) => {
                const found = getModule(a.professorSlug, a.moduleSlug);
                return (
                  <li key={a.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                    <span className="min-w-0 flex-1 truncate">{found?.module.title ?? a.moduleSlug}</span>
                    <span className="text-xs text-muted">{a.submittedAt ? dateFmt.format(a.submittedAt) : ""}</span>
                    <span className={`w-12 text-right font-semibold tabular-nums ${a.passed ? "text-success" : "text-danger"}`}>
                      {a.score}%
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <Disclaimer />
    </div>
  );
}
