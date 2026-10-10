import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { todayUtc } from "@/lib/data";
import { CHARACTERS, DAILY_VERSES, LESSONS, PATHS, verseForDay } from "@/walk/content";
import { Portrait } from "@/walk/components/Portrait";
import { PassageBlock, RefChips } from "@/walk/components/Scripture";

export default async function WalkHome() {
  const user = await getCurrentUser();
  const fatherless = DAILY_VERSES.find((v) => v.ref === "Psalm 68:5")!;
  const mentors = CHARACTERS.filter((c) => c.conversational);
  const play = user ? "/walk/play" : "/walk/begin";

  return (
    <div className="space-y-16">
      <section className="grid items-center gap-10 pt-4 md:grid-cols-[1.2fr_1fr]">
        <div className="space-y-5">
          <p className="text-sm font-semibold tracking-wider text-gold uppercase">A walk through the world of the Gospels</p>
          <h1 className="font-serif text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">
            Walk With Him
          </h1>
          <p className="text-lg leading-relaxed text-muted">
            Many people never had a father or a mentor to teach them how to live. Scripture can. Walk the shore of
            the Sea of Galilee, meet the people who walked with Jesus, and learn from them: how to pray, how to
            trust, how to give, how to get back up.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href={play} className="btn-primary !px-6 !py-3 !text-base">
              {user ? "Enter Galilee" : "Begin your walk"}
            </Link>
            <Link href="/walk/paths" className="btn-secondary !px-6 !py-3 !text-base">
              See the growth paths
            </Link>
          </div>
        </div>
        <div className="space-y-3">
          <PassageBlock passage={fatherless} />
          <div className="rounded-xl border border-line bg-surface p-4">
            <p className="mb-2 text-xs font-semibold tracking-wider text-gold uppercase">Today&apos;s verse</p>
            <PassageBlock passage={verseForDay(todayUtc())} />
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          ["👣 Walk the world", "Explore Capernaum by the lake: fishing boats, the market, the tax booth, the quiet hills. Day turns to night as you walk."],
          ["💬 Learn from mentors", "Each character teaches from Scripture with chapter and verse, so you can read it yourself. Ask them your own questions."],
          ["✍️ Reflect and practise", "Every lesson ends with a reflection for your private Walk Journal and a real-life challenge for your week."],
        ].map(([title, body]) => (
          <div key={title} className="rounded-xl bg-surface-2/70 p-5">
            <h2 className="font-semibold">{title}</h2>
            <p className="mt-1 text-sm text-muted">{body}</p>
          </div>
        ))}
      </section>

      <section className="space-y-5">
        <div>
          <h2 className="font-serif text-2xl font-semibold">Your first mentors</h2>
          <p className="text-sm text-muted">Jesus at the center, and the disciples He sent out. More arrive in later chapters.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {mentors.map((c) => {
            const lesson = LESSONS.find((l) => l.mentorId === c.id);
            return (
              <article key={c.id} className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-5">
                <div className="flex items-center gap-3">
                  <Portrait appearance={c.appearance} size={56} />
                  <div>
                    <h3 className="font-serif text-lg font-semibold">{c.shortName}</h3>
                    <p className="text-xs text-muted">{c.title}</p>
                  </div>
                </div>
                <p className="text-sm">{c.summary}</p>
                {lesson && (
                  <p className="mt-auto text-sm">
                    <span className="text-muted">First lesson:</span> <strong>{lesson.title}</strong>
                  </p>
                )}
              </article>
            );
          })}
        </div>
        <Link href="/walk/mentors" className="text-sm font-medium text-brand underline">
          Meet all twelve mentors →
        </Link>
      </section>

      <section className="space-y-4">
        <h2 className="font-serif text-2xl font-semibold">Growth paths</h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PATHS.map((p) => (
            <li key={p.slug} className={`rounded-xl border p-4 ${p.lessonSlugs.length ? "border-line bg-surface" : "border-dashed border-line"}`}>
              <p className="font-semibold">
                <span aria-hidden>{p.icon}</span> {p.title}
              </p>
              <p className="text-sm text-muted">{p.summary}</p>
              <p className="mt-2 text-xs font-semibold text-muted">{p.lessonSlugs.length ? "Open now" : "Coming soon"}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-6 rounded-2xl border border-line bg-surface p-6 md:grid-cols-2">
        <div className="space-y-2">
          <h2 className="font-serif text-2xl font-semibold">Grounded in Scripture</h2>
          <p className="text-sm leading-relaxed text-muted">
            Every lesson is built on passages from the World English Bible, quoted word for word and checked
            automatically. The AI characters must cite chapter and verse, may not invent doctrine, prophecies or
            personal revelations, and Jesus speaks only in words faithful to the Gospels. They will tell you plainly
            that they are AI portrayals.
          </p>
          <RefChips refs={["2 Timothy 3:16-17", "Acts 17:11"]} label="Why:" />
        </div>
        <div className="space-y-2">
          <h2 className="font-serif text-2xl font-semibold">Not a replacement for church</h2>
          <p className="text-sm leading-relaxed text-muted">
            This game points you to your own Bible, your own prayers and a local church community, where the real
            growth happens. If you are hurting, the characters will point you to real people who can help.
          </p>
          <Link href="/walk/help" className="text-sm font-medium text-brand underline">
            Need help right now?
          </Link>
        </div>
      </section>
    </div>
  );
}
