import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getLesson } from "@/walk/content";
import { LessonPageClient } from "@/walk/components/pages";
import { getProgressMap } from "@/walk/server/data";
import { buildCapernaum } from "@/walk/world/maps/capernaum";

export async function generateMetadata({ params }: PageProps<"/walk/lessons/[slug]">): Promise<Metadata> {
  const lesson = getLesson((await params).slug);
  return { title: lesson?.title ?? "Lesson" };
}

/** A lesson outside the game world, for players who prefer reading or use assistive technology. */
export default async function LessonPage({ params }: PageProps<"/walk/lessons/[slug]">) {
  const { slug } = await params;
  const lesson = getLesson(slug);
  if (!lesson) notFound();
  const user = await requireUser(`/walk/lessons/${slug}`, "/walk/begin");
  const progress = await getProgressMap(user.id);
  const spots = buildCapernaum().spots;
  const spotLabels = Object.fromEntries(Object.values(spots).map((s) => [s.id, s.label]));
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <p className="text-sm">
        <Link href="/walk/paths" className="text-brand underline">
          ← Growth paths
        </Link>{" "}
        · <Link href="/walk/play" className="text-brand underline">Take this lesson in the world instead</Link>
      </p>
      <div className="rounded-2xl border border-line bg-surface p-5 sm:p-7">
        <LessonPageClient lesson={lesson} initialProgress={progress[slug]} spotLabels={spotLabels} />
      </div>
    </div>
  );
}
