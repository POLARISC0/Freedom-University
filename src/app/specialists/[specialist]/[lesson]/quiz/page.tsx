import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getLesson } from "@/content";
import { QuizRunner } from "@/components/QuizRunner";
import { requireUser } from "@/lib/auth";
import { getProgressRows } from "@/lib/data";
import { isUnlocked, PASS_THRESHOLD } from "@/lib/progress";

export async function generateMetadata({ params }: PageProps<"/specialists/[specialist]/[lesson]/quiz">): Promise<Metadata> {
  const { specialist, lesson } = await params;
  const found = getLesson(specialist, lesson);
  return { title: found ? `Quiz: ${found.lesson.title}` : "Quiz" };
}

export default async function QuizPage({ params }: PageProps<"/specialists/[specialist]/[lesson]/quiz">) {
  const { specialist: specialistSlug, lesson: lessonSlug } = await params;
  const found = getLesson(specialistSlug, lessonSlug);
  if (!found) notFound();
  const { specialist, lesson, index } = found;

  const user = await requireUser(`/specialists/${specialistSlug}/${lessonSlug}/quiz`);
  if (!isUnlocked(specialist, index, await getProgressRows(user.id))) redirect(`/specialists/${specialistSlug}`);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <nav className="text-sm text-muted">
        <Link href={`/specialists/${specialistSlug}`} className="hover:text-ink">{specialist.name}</Link>
        {" / "}
        <Link href={`/specialists/${specialistSlug}/${lessonSlug}`} className="hover:text-ink">{lesson.title}</Link>
      </nav>
      <header className="space-y-1">
        <p className="text-sm text-muted">{specialist.emoji} {specialist.name} · Lesson {index + 1} quiz</p>
        <h1 className="font-serif text-3xl font-semibold">{lesson.title}</h1>
        <p className="text-muted">Four questions, written fresh for every attempt. Score {PASS_THRESHOLD}% or more to complete the lesson.</p>
      </header>
      <QuizRunner specialistSlug={specialistSlug} lessonSlug={lessonSlug} sources={specialist.sources} />
    </div>
  );
}
