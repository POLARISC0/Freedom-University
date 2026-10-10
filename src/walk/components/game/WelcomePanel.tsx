"use client";

import { useState } from "react";
import type { Appearance } from "@/walk/content";
import { Portrait } from "../Portrait";
import { RefLink } from "../Scripture";

const SKINS = ["#d9a87e", "#c48b62", "#b07a52", "#a9734d", "#8d5a3b", "#7a4a30", "#5c3a26"];
const ROBES = ["#6c7c8c", "#8f7454", "#9b4a2e", "#5f7a5a", "#cbb68c", "#56617a", "#8a5a6a"];
const HAIR = ["#1d1510", "#3b2b1f", "#6a4a2a", "#9a948c"];
const STYLES = [
  { id: "beard", label: "Beard", apply: (a: Appearance): Appearance => ({ ...a, beard: "short", headcloth: undefined }) },
  { id: "clean", label: "No beard", apply: (a: Appearance): Appearance => ({ ...a, beard: "none", headcloth: undefined }) },
  { id: "covered", label: "Head covering", apply: (a: Appearance): Appearance => ({ ...a, beard: "none", headcloth: "#d9cdb0" }) },
];

export const DEFAULT_APPEARANCE: Appearance = { skin: "#a9734d", hair: "#2b1d14", beard: "short", robe: "#6c7c8c", sash: "#c99b5a" };

function Swatches({ label, colors, value, onPick }: { label: string; colors: string[]; value: string; onPick: (c: string) => void }) {
  return (
    <fieldset>
      <legend className="mb-1 text-xs font-semibold text-muted">{label}</legend>
      <div className="flex flex-wrap gap-1.5">
        {colors.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onPick(c)}
            aria-label={`${label} ${c}`}
            aria-pressed={value === c}
            className={`h-7 w-7 rounded-full border-2 ${value === c ? "border-brand ring-2 ring-gold/60" : "border-line"}`}
            style={{ background: c }}
          />
        ))}
      </div>
    </fieldset>
  );
}

/** First visit: where you are, how to move, and how you look. Also reachable later to change appearance. */
export function WelcomePanel({
  appearance,
  firstVisit,
  onDone,
}: {
  appearance: Appearance;
  firstVisit: boolean;
  onDone: (appearance: Appearance) => void;
}) {
  const [look, setLook] = useState<Appearance>(appearance);
  const style = look.headcloth ? "covered" : look.beard === "none" ? "clean" : "beard";
  return (
    <div className="space-y-5">
      {firstVisit && (
        <header className="space-y-2">
          <p className="text-xs font-semibold tracking-wider text-gold uppercase">Welcome</p>
          <h2 className="font-serif text-2xl leading-tight font-semibold">Capernaum, by the Sea of Galilee</h2>
          <p className="leading-relaxed">
            Jesus left Nazareth and made this lakeside town His home (<RefLink refText="Matthew 4:13" />). Walk the shore,
            meet the people who followed Him, and learn from them: Jesus on prayer, Peter on faith, Matthew on
            generosity.
          </p>
          <ul className="space-y-1 text-sm text-muted">
            <li>🚶 Walk with the arrow keys or WASD, or tap where you want to go.</li>
            <li>💬 Press E, or tap someone, to talk. Mentors with a lesson for you have a ✦ by their name.</li>
            <li>📖 Check in each day for a verse, and write in your Walk Journal any time.</li>
          </ul>
        </header>
      )}

      <section className="space-y-3 rounded-xl border border-line bg-surface p-4">
        <div className="flex items-center gap-3">
          <Portrait appearance={look} size={64} />
          <div>
            <h3 className="font-semibold">How you look</h3>
            <p className="text-xs text-muted">Just for fun: you can change this later.</p>
          </div>
        </div>
        <Swatches label="Skin" colors={SKINS} value={look.skin} onPick={(skin) => setLook({ ...look, skin })} />
        <Swatches label="Hair" colors={HAIR} value={look.hair} onPick={(hair) => setLook({ ...look, hair })} />
        <Swatches label="Robe" colors={ROBES} value={look.robe} onPick={(robe) => setLook({ ...look, robe })} />
        <fieldset>
          <legend className="mb-1 text-xs font-semibold text-muted">Style</legend>
          <div className="flex flex-wrap gap-1.5">
            {STYLES.map((s) => (
              <button
                key={s.id}
                type="button"
                aria-pressed={style === s.id}
                onClick={() => setLook(s.apply(look))}
                className={`rounded-full border px-3 py-1 text-xs font-medium ${style === s.id ? "border-brand bg-brand-soft" : "border-line"}`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </fieldset>
      </section>

      <button onClick={() => onDone(look)} className="btn-primary w-full">
        {firstVisit ? "Begin your walk" : "Done"}
      </button>
    </div>
  );
}
