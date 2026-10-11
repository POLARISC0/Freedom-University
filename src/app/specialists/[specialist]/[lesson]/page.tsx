import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getLesson } from "@/content";
import { ChatRoom } from "@/components/ChatRoom";
import { SourceList } from "@/components/SourceList";
import { StatusBadge } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getChatHistory, getProgressRows } from "@/lib/data";
import { lessonStatuses } from "@/lib/progress";
import { LESSON_KICKOFF } from "@/lib/prompts";

export async function generateMetadata({ params }: PageProps<"/specialists/[specialist]/[lesson]">): Promise<Metadata> {
  const { specialist, lesson } = await params;
  return { title: getLesson(specialist, lesson)?.lesson.title ?? "Lesson" };
}

export default async function LessonPage({ params }: PageProps<"/specialists/[specialist]/[lesson]">) {
  const { specialist: specialistSlug, lesson: lessonSlug } = await params;
  const found = getLesson(specialistSlug, lessonSlug);
  if (!found) notFound();
  const { specialist, lesson, index } = found;

  const user = await requireUser(`/specialists/${specialistSlug}/${lessonSlug}`);
  const status = lessonStatuses(specialist, await getProgressRows(user.id))[index];
  if (status === "locked") redirect(`/specialists/${specialistSlug}`);
  const history = await getChatHistory(user.id, specialistSlug, lessonSlug);

  return (
    <div className="space-y-6">
      <nav className="text-sm text-muted">
        <Link href="/floor" className="hover:text-ink">Trading Floor</Link>
        {" / "}
        <Link href={`/specialists/${specialistSlug}`} className="hover:text-ink">{specialist.name}</Link>
      </nav>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="min-w-0 space-y-4">
          <header className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
              <span>{specialist.emoji} {specialist.name} · Lesson {index + 1} of {specialist.lessons.length}</span>
              <StatusBadge status={status} />
            </div>
            <h1 className="font-serif text-2xl font-semibold sm:text-3xl">{lesson.title}</h1>
          </header>
          <ChatRoom
            specialist={{ slug: specialist.slug, name: specialist.name, emoji: specialist.emoji }}
            thread={lesson.slug}
            kickoff={{
              label: "Start the lesson",
              intro: `${specialist.name} is ready to teach "${lesson.title}". Start the lesson, or ask your own question.`,
              message: LESSON_KICKOFF,
            }}
            sources={specialist.sources}
            initialMessages={history.map((m) => ({ id: m.id, role: m.role === "assistant" ? "assistant" : "user", content: m.content }))}
          />
          <p className="text-xs text-muted">
            {specialist.name} is an AI teacher and can make mistakes. Check important facts against the cited sources.
            Education only, not financial advice.
          </p>
        </section>

        <aside className="space-y-6">
          <div className="space-y-3 rounded-xl border border-line bg-surface p-5">
            <h2 className="font-semibold">In this lesson</h2>
            <ul className="list-disc space-y-1.5 pl-5 text-sm">
              {lesson.objectives.map((o) => <li key={o}>{o}</li>)}
            </ul>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {lesson.keyTerms.map((t) => <span key={t} className="rounded-full bg-surface-2 px-2 py-0.5 text-xs">{t}</span>)}
            </div>
            <Link
              href={`/specialists/${specialistSlug}/${lessonSlug}/quiz`}
              className="mt-2 block rounded-lg bg-brand px-4 py-2 text-center font-medium text-brand-ink"
            >
              {status === "completed" ? "Retake the quiz" : "Take the quiz"}
            </Link>
            <p className="text-xs text-muted">A short 4-question quiz. Score 70% or more to complete the lesson.</p>
          </div>
          <div className="space-y-3">
            <h2 className="font-semibold">Reading list</h2>
            <SourceList sources={specialist.sources} />
          </div>
        </aside>
      </div>
    </div>
  );
}
