import type { Metadata } from "next";
import Link from "next/link";
import { getLesson, SPECIALISTS } from "@/content";
import { ACCENTS, Disclaimer, ProgressBar } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getProgressRows } from "@/lib/data";
import { db } from "@/lib/db";
import { completedCount, nextLessonIndex } from "@/lib/progress";

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
      select: { id: true, specialistSlug: true, lessonSlug: true, score: true, passed: true, submittedAt: true },
    }),
  ]);

  const totalLessons = SPECIALISTS.reduce((n, s) => n + s.lessons.length, 0);
  const totalCompleted = SPECIALISTS.reduce((n, s) => n + completedCount(s, progress), 0);
  const completed = progress
    .filter((r) => r.status === "COMPLETED")
    .sort((a, b) => (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0));
  // "Continue" points at the first specialist the student has started with who still has an open lesson.
  const continueWith = SPECIALISTS.map((s) => ({ s, next: nextLessonIndex(s, progress) })).find(
    (x) => x.next !== null && progress.some((r) => r.specialistSlug === x.s.slug),
  );

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
            <span className="text-lg text-muted">/{totalLessons}</span>
          </p>
          <p className="text-xs text-muted">lessons completed</p>
        </div>
      </header>

      {continueWith && continueWith.next !== null && (
        <Link
          href={`/specialists/${continueWith.s.slug}/${continueWith.s.lessons[continueWith.next].slug}`}
          className="flex items-center gap-4 rounded-xl border border-brand bg-brand-soft p-5"
        >
          <span className="text-3xl" aria-hidden>{continueWith.s.emoji}</span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm text-muted">Continue with {continueWith.s.name}</span>
            <span className="block font-semibold">{continueWith.s.lessons[continueWith.next].title}</span>
          </span>
          <span aria-hidden>→</span>
        </Link>
      )}

      <section className="space-y-3">
        <h2 className="font-serif text-xl font-semibold">Specialists</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {SPECIALISTS.map((s) => (
            <Link
              key={s.slug}
              href={`/specialists/${s.slug}`}
              className={`block rounded-xl border border-l-4 border-line bg-surface p-4 hover:shadow-md ${ACCENTS[s.accent].ring}`}
            >
              <div className="mb-2 flex items-center gap-2">
                <span aria-hidden>{s.emoji}</span>
                <span className="font-medium">{s.name}</span>
                <span className="text-sm text-muted">{s.topic}</span>
              </div>
              <ProgressBar value={completedCount(s, progress)} max={s.lessons.length} accent={s.accent} />
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="space-y-3">
          <h2 className="font-serif text-xl font-semibold">Completed lessons</h2>
          {completed.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line p-5 text-sm text-muted">
              No lessons completed yet. Pass a lesson quiz to see it here.{" "}
              <Link href="/floor" className="text-brand underline">Visit the floor</Link>.
            </p>
          ) : (
            <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
              {completed.map((r) => {
                const found = getLesson(r.specialistSlug, r.lessonSlug);
                if (!found) return null;
                return (
                  <li key={`${r.specialistSlug}/${r.lessonSlug}`} className="flex items-center gap-3 px-4 py-3">
                    <span aria-hidden>{found.specialist.emoji}</span>
                    <span className="min-w-0 flex-1">
                      <Link href={`/specialists/${r.specialistSlug}/${r.lessonSlug}`} className="block truncate font-medium hover:underline">
                        {found.lesson.title}
                      </Link>
                      <span className="text-xs text-muted">
                        {found.specialist.name} · {r.completedAt ? dateFmt.format(r.completedAt) : ""}
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
              {recentAttempts.map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                  <span className="min-w-0 flex-1 truncate">{getLesson(a.specialistSlug, a.lessonSlug)?.lesson.title ?? a.lessonSlug}</span>
                  <span className="text-xs text-muted">{a.submittedAt ? dateFmt.format(a.submittedAt) : ""}</span>
                  <span className={`w-12 text-right font-semibold tabular-nums ${a.passed ? "text-success" : "text-danger"}`}>{a.score}%</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <Disclaimer />
    </div>
  );
}
