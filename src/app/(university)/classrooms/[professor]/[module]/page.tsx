import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getModule } from "@/content";
import { ChatRoom } from "@/components/ChatRoom";
import { SourceList } from "@/components/SourceList";
import { LevelBadge, StatusBadge } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getChatHistory, getProgressRows } from "@/lib/data";
import { moduleStatuses } from "@/lib/progress";

export async function generateMetadata({ params }: PageProps<"/classrooms/[professor]/[module]">): Promise<Metadata> {
  const { professor, module } = await params;
  return { title: getModule(professor, module)?.module.title ?? "Lesson" };
}

export default async function ModulePage({ params }: PageProps<"/classrooms/[professor]/[module]">) {
  const { professor: professorSlug, module: moduleSlug } = await params;
  const found = getModule(professorSlug, moduleSlug);
  if (!found) notFound();
  const { professor, module, index } = found;

  const user = await requireUser(`/classrooms/${professorSlug}/${moduleSlug}`);
  const progress = await getProgressRows(user.id);
  const status = moduleStatuses(professor, progress)[index];
  if (status === "locked") redirect(`/classrooms/${professorSlug}`);

  const history = await getChatHistory(user.id, professorSlug, moduleSlug);

  return (
    <div className="space-y-6">
      <nav className="text-sm text-muted">
        <Link href="/classrooms" className="hover:text-ink">Classrooms</Link>
        {" / "}
        <Link href={`/classrooms/${professorSlug}`} className="hover:text-ink">{professor.course}</Link>
      </nav>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="min-w-0 space-y-4">
          <header className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted">Module {index + 1} of {professor.modules.length}</span>
              <LevelBadge level={module.level} />
              <StatusBadge status={status} />
            </div>
            <h1 className="font-serif text-2xl font-semibold sm:text-3xl">{module.title}</h1>
          </header>
          <ChatRoom
            professor={{ slug: professor.slug, name: professor.name, emoji: professor.emoji }}
            moduleSlug={module.slug}
            sources={professor.sources}
            initialMessages={history.map((m) => ({
              id: m.id,
              role: m.role === "assistant" ? "assistant" : "user",
              content: m.content,
            }))}
          />
          <p className="text-xs text-muted">
            {professor.name} is an AI teacher and can make mistakes. Check important facts against the cited sources.
            Education only, not financial advice.
          </p>
        </section>

        <aside className="space-y-6">
          <div className="space-y-3 rounded-xl border border-line bg-surface p-5">
            <h2 className="font-semibold">Learning objectives</h2>
            <ul className="list-disc space-y-1.5 pl-5 text-sm">
              {module.objectives.map((o) => <li key={o}>{o}</li>)}
            </ul>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {module.keyTerms.map((t) => (
                <span key={t} className="rounded-full bg-surface-2 px-2 py-0.5 text-xs">{t}</span>
              ))}
            </div>
            <Link
              href={`/classrooms/${professorSlug}/${moduleSlug}/quiz`}
              className="mt-2 block rounded-lg bg-brand px-4 py-2 text-center font-medium text-brand-ink"
            >
              {status === "completed" ? "Retake the quiz" : "Take the quiz"}
            </Link>
            <p className="text-xs text-muted">Score 70% or more to complete the module and unlock the next one.</p>
          </div>
          <div className="space-y-3">
            <h2 className="font-semibold">Reading list</h2>
            <SourceList sources={professor.sources} />
          </div>
        </aside>
      </div>
    </div>
  );
}
