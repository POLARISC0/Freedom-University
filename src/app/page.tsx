import Link from "next/link";
import { PROFESSORS } from "@/content";
import { ACCENTS } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";

export default async function HomePage() {
  const user = await getCurrentUser();
  return (
    <div className="space-y-14">
      <section className="space-y-5 pt-6 text-center">
        <p className="text-sm font-medium tracking-wide text-brand uppercase">A crypto &amp; finance classroom</p>
        <h1 className="mx-auto max-w-3xl font-serif text-4xl font-semibold tracking-tight sm:text-5xl">
          Learn how money really works, from Bitcoin to the Federal Reserve.
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-muted">
          Five AI professors, each with a structured beginner-to-advanced syllabus, end-of-module quizzes and a
          reading list they cite. Education only, never financial advice.
        </p>
        <div className="flex justify-center gap-3">
          <Link
            href={user ? "/dashboard" : "/login"}
            className="rounded-lg bg-brand px-5 py-2.5 font-medium text-brand-ink"
          >
            {user ? "Go to your dashboard" : "Enroll for free"}
          </Link>
          <Link href={user ? "/news" : "/login?next=/news"} className="rounded-lg border border-line px-5 py-2.5 font-medium">
            Today&apos;s briefing
          </Link>
        </div>
      </section>

      <section className="space-y-5">
        <h2 className="font-serif text-2xl font-semibold">Meet the faculty</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PROFESSORS.map((p) => (
            <div key={p.slug} className={`rounded-xl border-l-4 border border-line bg-surface p-5 ${ACCENTS[p.accent].ring}`}>
              <div className="text-3xl" aria-hidden>{p.emoji}</div>
              <p className="mt-3 text-xs text-muted">Course {p.number}</p>
              <h3 className="font-semibold">{p.course}</h3>
              <p className="text-sm text-muted">{p.name}</p>
              <p className="mt-2 text-sm">{p.tagline}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          ["Structured paths", "Six modules per professor, from beginner to advanced. Pass each quiz to unlock the next."],
          ["Cited sources", "Market and regulatory claims are cited against a curated reading list of primary sources."],
          ["Daily briefing", "Crypto and macro headlines, summarised every day by Professor Eleanor Reserve."],
        ].map(([title, body]) => (
          <div key={title} className="rounded-xl bg-surface-2 p-5">
            <h3 className="font-semibold">{title}</h3>
            <p className="mt-1 text-sm text-muted">{body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
