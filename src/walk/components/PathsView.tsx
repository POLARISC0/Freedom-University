"use client";

import Link from "next/link";
import { useTransition } from "react";
import { setChallengeDone } from "@/app/walk/actions";
import { getCharacter, getLesson, PATHS } from "@/walk/content";
import { encouragement, lessonStatus, type LessonProgressView, type ProgressMap } from "@/walk/progress";
import { Portrait } from "./Portrait";
import { safely } from "./safe-action";
import { PassageBlock, RefChips } from "./Scripture";

/**
 * Every growth path with gentle progress: lessons walked and challenges practised, never scores or ranks.
 * `onOpenLesson` opens a lesson in place (the game); without it lessons link to their standalone page.
 */
export function PathsView({
  progress,
  onProgress,
  onOpenLesson,
  compact = false,
}: {
  progress: ProgressMap;
  onProgress: (view: LessonProgressView) => void;
  onOpenLesson?: (slug: string) => void;
  compact?: boolean;
}) {
  const available = PATHS.filter((p) => p.lessonSlugs.length > 0);
  const upcoming = PATHS.filter((p) => p.lessonSlugs.length === 0);
  return (
    <div className="space-y-6">
      <p className="rounded-xl bg-brand-soft px-4 py-3 text-sm">{encouragement(progress)}</p>

      <div className={`grid gap-4 ${compact ? "" : "md:grid-cols-3"}`}>
        {available.map((path) => (
          <section key={path.slug} className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4">
            <header>
              <h3 className="font-serif text-lg font-semibold">
                <span aria-hidden>{path.icon}</span> {path.title}
              </h3>
              <p className="text-sm text-muted">{path.summary}</p>
            </header>
            {!compact && <PassageBlock passage={path.keyPassage} />}
            {path.lessonSlugs.map((slug) => (
              <LessonRow key={slug} slug={slug} progress={progress[slug]} onProgress={onProgress} onOpenLesson={onOpenLesson} />
            ))}
            <div className="mt-auto">
              <p className="text-xs font-semibold text-muted">Coming in later chapters</p>
              <ul className="mt-1 space-y-0.5 text-xs text-muted">
                {path.upcoming.map((u) => (
                  <li key={u.title}>
                    {u.title} · with {getCharacter(u.mentorId)?.shortName}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ))}
      </div>

      <section>
        <h3 className="font-serif text-lg font-semibold">More paths on the way</h3>
        <p className="mb-3 text-sm text-muted">Each will have its own mentor and lessons in a later chapter.</p>
        <ul className={`grid gap-2 ${compact ? "" : "sm:grid-cols-2 lg:grid-cols-4"}`}>
          {upcoming.map((path) => (
            <li key={path.slug} className="rounded-lg border border-dashed border-line px-3 py-2">
              <p className="text-sm font-semibold">
                <span aria-hidden>{path.icon}</span> {path.title}
              </p>
              <p className="text-xs text-muted">
                {path.summary} With {path.mentorIds.map((id) => getCharacter(id)?.shortName).join(" and ")}.
              </p>
              <RefChips refs={[path.keyPassage.ref]} label="" />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function LessonRow({
  slug,
  progress,
  onProgress,
  onOpenLesson,
}: {
  slug: string;
  progress: LessonProgressView | undefined;
  onProgress: (view: LessonProgressView) => void;
  onOpenLesson?: (slug: string) => void;
}) {
  const lesson = getLesson(slug)!;
  const mentor = getCharacter(lesson.mentorId)!;
  const status = lessonStatus(progress);
  const [pending, startTransition] = useTransition();
  const label = status === "completed" ? "Walk it again" : status === "in_progress" ? "Continue" : "Begin";
  const challenge = lesson.steps.find((s) => s.kind === "challenge");

  return (
    <div className="rounded-lg bg-surface-2/60 p-3">
      <div className="flex items-center gap-2.5">
        <Portrait appearance={mentor.appearance} size={36} className="shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{lesson.title}</p>
          <p className="text-xs text-muted">
            with {mentor.shortName} ·{" "}
            {status === "completed" ? <span className="font-semibold text-success">✓ Walked</span> : status === "in_progress" ? "In progress" : `${lesson.minutes} min`}
          </p>
        </div>
        {onOpenLesson ? (
          <button onClick={() => onOpenLesson(slug)} className="btn-secondary !px-3 !py-1.5 text-xs">
            {label}
          </button>
        ) : (
          <Link href={`/walk/lessons/${slug}`} className="btn-secondary !px-3 !py-1.5 text-xs">
            {label}
          </Link>
        )}
      </div>
      {progress?.challengeAcceptedAt && challenge?.kind === "challenge" && (
        <label className="mt-2 flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={Boolean(progress.challengeDoneAt)}
            disabled={pending}
            onChange={(e) => {
              const done = e.target.checked;
              startTransition(async () => {
                const result = await safely(() => setChallengeDone(slug, done));
                if (result.ok) onProgress(result.data);
              });
            }}
          />
          <span>
            I practised this week&apos;s challenge: <em>{challenge.title}</em>
          </span>
        </label>
      )}
    </div>
  );
}
