import type { Metadata } from "next";
import { CHARACTERS, getPath } from "@/walk/content";
import { Portrait } from "@/walk/components/Portrait";
import { RefChips } from "@/walk/components/Scripture";

export const metadata: Metadata = { title: "Mentors" };

export default function MentorsPage() {
  return (
    <div className="space-y-6">
      <header className="max-w-3xl">
        <p className="text-sm font-semibold tracking-wider text-gold uppercase">A mentorship team</p>
        <h1 className="font-serif text-3xl font-semibold">The mentors</h1>
        <p className="text-muted">
          Like a team of specialists around one leader, each disciple teaches one area of growth, and Jesus is at the
          center of it all. Their personalities come from what Scripture records; where the Bible says little, the game
          says so. More biblical figures (Moses, David, Ruth, Mary, Paul) will join in later chapters.
        </p>
      </header>
      <ul className="grid gap-4 md:grid-cols-2">
        {CHARACTERS.map((c) => (
          <li key={c.id} className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-5">
            <div className="flex items-center gap-3">
              <Portrait appearance={c.appearance} size={56} className="shrink-0" />
              <div>
                <h2 className="font-serif text-xl font-semibold">{c.name}</h2>
                <p className="text-sm text-muted">{c.title}</p>
              </div>
              <span
                className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                  c.conversational ? "bg-brand text-brand-ink" : "bg-surface-2 text-muted"
                }`}
              >
                {c.conversational ? "Mentoring now" : "In the world"}
              </span>
            </div>
            <p className="text-sm">{c.summary}</p>
            <p className="text-sm">
              <span className="text-muted">Teaches:</span> {c.themes.join(", ")}
              {c.pathSlugs.length > 0 && (
                <span className="text-muted"> · {c.pathSlugs.map((s) => getPath(s)?.title).join(", ")}</span>
              )}
            </p>
            {c.cautions && <p className="text-xs text-muted">Note: {c.cautions}</p>}
            <RefChips refs={c.keyRefs.slice(0, 6)} label="In Scripture:" />
          </li>
        ))}
      </ul>
    </div>
  );
}
