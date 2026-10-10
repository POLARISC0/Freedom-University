import type { Metadata } from "next";
import Link from "next/link";
import { PROFESSORS } from "@/content";
import { ACCENTS, Disclaimer, ProgressBar } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getProgressRows } from "@/lib/data";
import { completedCount } from "@/lib/progress";

export const metadata: Metadata = { title: "Classrooms" };

export default async function ClassroomsPage() {
  const user = await requireUser("/classrooms");
  const progress = await getProgressRows(user.id);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold">Classrooms</h1>
        <p className="text-muted">Choose a professor. Each course runs from beginner to advanced.</p>
      </div>
      <Disclaimer />
      <div className="grid gap-4 md:grid-cols-2">
        {PROFESSORS.map((p) => (
          <Link
            key={p.slug}
            href={`/classrooms/${p.slug}`}
            className={`group block rounded-xl border border-l-4 border-line bg-surface p-5 transition hover:shadow-md ${ACCENTS[p.accent].ring}`}
          >
            <div className="flex items-start gap-4">
              <div className="text-4xl" aria-hidden>{p.emoji}</div>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-xs text-muted">Course {p.number} · {p.name}</p>
                <h2 className="text-lg font-semibold group-hover:underline">{p.course}</h2>
                <p className="text-sm text-muted">{p.tagline}</p>
                <div className="pt-2">
                  <ProgressBar value={completedCount(p, progress)} max={p.modules.length} accent={p.accent} />
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
