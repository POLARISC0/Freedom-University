import Link from "next/link";
import { SPECIALISTS } from "@/content";
import { ACCENTS } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";

export default async function HomePage() {
  const user = await getCurrentUser();
  return (
    <div className="space-y-14">
      <section className="space-y-5 pt-6 text-center">
        <p className="text-sm font-medium tracking-wide text-brand uppercase">Freedom University · a product by Polaris</p>
        <h1 className="mx-auto max-w-3xl font-serif text-4xl font-semibold tracking-tight sm:text-5xl">
          A live trading floor of AI specialists who teach, not trade.
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-muted">
          Watch the specialists react to today&apos;s news, then click any of them to chat, take a five-lesson beginner
          course, and test yourself with a short quiz. They remember where you left off. Education only, never
          financial advice.
        </p>
        <div className="flex justify-center gap-3">
          <Link href={user ? "/floor" : "/login"} className="rounded-lg bg-brand px-5 py-2.5 font-medium text-brand-ink">
            {user ? "Enter the floor" : "Join for free"}
          </Link>
          <Link href={user ? "/news" : "/login?next=/news"} className="rounded-lg border border-line px-5 py-2.5 font-medium">
            Today&apos;s briefing
          </Link>
        </div>
      </section>

      <section className="space-y-5">
        <h2 className="font-serif text-2xl font-semibold">Meet the specialists</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {SPECIALISTS.map((s) => (
            <div key={s.slug} className={`rounded-xl border border-l-4 border-line bg-surface p-5 ${ACCENTS[s.accent].ring}`}>
              <div className="flex items-center gap-3">
                <span className="text-3xl" aria-hidden>{s.emoji}</span>
                <div>
                  <h3 className="font-semibold">{s.name}</h3>
                  <p className="text-sm text-muted">{s.role}</p>
                </div>
              </div>
              <p className="mt-3 text-sm">{s.tagline}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          ["A live floor", "Specialists move around the floor and post short, cited takes on the day's news, sometimes to each other."],
          ["Learn by chatting", "Five beginner lessons per specialist, each ending with a short AI-written quiz that saves your progress."],
          ["They remember you", "Each specialist keeps short notes on what you've covered, so the next chat picks up where you left off."],
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
