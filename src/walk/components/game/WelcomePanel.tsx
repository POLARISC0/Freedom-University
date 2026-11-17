"use client";

import { getCharacter } from "@/walk/content";
import { NEED_INFO, NEEDS } from "@/walk/life";
import { Portrait } from "../Portrait";
import { RefLink } from "../Scripture";

const MENTORS = [
  { id: "jesus", path: "teaches you to pray, as He taught His friends." },
  { id: "peter", path: "walks with you in faith, courage and getting back up after a fall." },
  { id: "matthew", path: "shows you what money, stewardship and cheerful giving look like." },
];

/** How to get around: walking, turning the view, talking, and doing things in the world. */
export function HowToWalk() {
  return (
    <ul className="space-y-1.5 text-sm">
      <li>
        🚶 Walk with <Kbd>W</Kbd> <Kbd>A</Kbd> <Kbd>S</Kbd> <Kbd>D</Kbd> or the arrow keys: up always walks away from
        you, into the view, whichever way it faces. On a phone or tablet, tap where you want to go.
      </li>
      <li>
        🔄 Turn the view with <Kbd>[</Kbd> <Kbd>]</Kbd>, the ⟲ ⟳ buttons, or by dragging; zoom with <Kbd>+</Kbd>{" "}
        <Kbd>−</Kbd>, the scroll wheel or a pinch.
      </li>
      <li>
        💬 Press <Kbd>E</Kbd>, or tap someone, to talk. Mentors with a lesson for you have a ✦ by their name.
      </li>
      <li>🙏 Walk up to a place to pray, read the scroll, share a meal, lend a hand or rest. A button appears when you can.</li>
    </ul>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="rounded border border-line bg-surface-2 px-1 font-mono text-[11px]">{children}</kbd>;
}

/** The first thing a new player sees: where they are, how to walk, the five needs and the mentors. */
export function WelcomePanel({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <p className="text-xs font-semibold tracking-wider text-gold uppercase">Welcome</p>
        <h2 className="font-serif text-2xl leading-tight font-semibold">Capernaum, by the Sea of Galilee</h2>
        <p className="leading-relaxed">
          Jesus left Nazareth and made this lakeside town His home (<RefLink refText="Matthew 4:13" />). Here the
          fishermen are at their nets by dawn, the market fills by mid-morning, Jesus teaches the crowds by the shore,
          and friends share bread around Peter&apos;s table as the sun goes down. Come and live here alongside them.
        </p>
      </header>

      <section className="space-y-2">
        <h3 className="text-xs font-semibold tracking-wider text-gold uppercase">Getting around</h3>
        <HowToWalk />
      </section>

      <section className="space-y-2">
        <h3 className="text-xs font-semibold tracking-wider text-gold uppercase">Your walk with God</h3>
        <p className="text-sm leading-relaxed">
          Five small meters show how your walk is going. Each grows when you do something that feeds it, and fades
          gently as the days pass. They&apos;re an invitation, never a score.
        </p>
        <ul className="grid grid-cols-1 gap-1.5 text-sm sm:grid-cols-2">
          {NEEDS.map((n) => (
            <li key={n} className="flex items-start gap-2 rounded-lg bg-surface-2/60 px-2.5 py-1.5">
              <span aria-hidden>{NEED_INFO[n].icon}</span>
              <span>
                <strong>{NEED_INFO[n].label}</strong>
                <span className="block text-xs text-muted">{NEED_INFO[n].hint}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="text-xs font-semibold tracking-wider text-gold uppercase">Your mentors</h3>
        <ul className="space-y-2">
          {MENTORS.map(({ id, path }) => {
            const c = getCharacter(id)!;
            return (
              <li key={id} className="flex items-center gap-3">
                <Portrait appearance={c.appearance} size={40} className="shrink-0" />
                <p className="text-sm">
                  <strong>{c.shortName}</strong> {path}
                  <span className="block text-xs text-muted">{c.title}</span>
                </p>
              </li>
            );
          })}
        </ul>
        <p className="text-sm text-muted">
          Each keeps a daily routine: look for them at prayer before dawn, at the nets, at the market, listening by the
          shore, and at supper in Peter&apos;s courtyard. 📖 Check in each day for a verse, and write in your Walk
          Journal any time.
        </p>
      </section>

      <button onClick={onContinue} className="btn-primary w-full">
        Create your character →
      </button>
    </div>
  );
}
