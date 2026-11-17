import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getModule } from "@/content";
import { QuizRunner } from "@/components/QuizRunner";
import { requireUser } from "@/lib/auth";
import { getProgressRows } from "@/lib/data";
import { isUnlocked, PASS_THRESHOLD } from "@/lib/progress";

export async function generateMetadata({ params }: PageProps<"/classrooms/[professor]/[module]/quiz">): Promise<Metadata> {
  const { professor, module } = await params;
  const found = getModule(professor, module);
  return { title: found ? `Quiz: ${found.module.title}` : "Quiz" };
}

export default async function QuizPage({ params }: PageProps<"/classrooms/[professor]/[module]/quiz">) {
  const { professor: professorSlug, module: moduleSlug } = await params;
  const found = getModule(professorSlug, moduleSlug);
  if (!found) notFound();
  const { professor, module, index } = found;

  const user = await requireUser(`/classrooms/${professorSlug}/${moduleSlug}/quiz`);
  if (!isUnlocked(professor, index, await getProgressRows(user.id))) redirect(`/classrooms/${professorSlug}`);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <nav className="text-sm text-muted">
        <Link href={`/classrooms/${professorSlug}`} className="hover:text-ink">{professor.course}</Link>
        {" / "}
        <Link href={`/classrooms/${professorSlug}/${moduleSlug}`} className="hover:text-ink">{module.title}</Link>
      </nav>
      <header className="space-y-1">
        <p className="text-sm text-muted">{professor.emoji} {professor.name} · Module {index + 1} quiz</p>
        <h1 className="font-serif text-3xl font-semibold">{module.title}</h1>
        <p className="text-muted">
          Five multiple-choice questions and one short answer, written fresh for every attempt. Score {PASS_THRESHOLD}% or
          more to complete the module.
        </p>
      </header>
      <QuizRunner professorSlug={professorSlug} moduleSlug={moduleSlug} sources={professor.sources} />
    </div>
  );
}
