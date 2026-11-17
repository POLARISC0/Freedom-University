"use client";

import { useId, useState } from "react";
import { HAIR_STYLES, type Appearance, type HairStyle } from "@/walk/content";
import { cleanName, NAME_MAX } from "@/walk/life";
import { AvatarPreview } from "../AvatarPreview";
import { HowToWalk } from "./WelcomePanel";

// Sims-style character creation: a name, and how you look, with a live preview. Colours are ones a Galilean of the
// first century might have worn: undyed wool and linen, earth browns, madder red, indigo and olive.

interface Choice {
  value: string;
  name: string;
}

const SKINS: Choice[] = [
  { value: "#d9a87e", name: "Light" },
  { value: "#c48b62", name: "Light brown" },
  { value: "#b07a52", name: "Warm brown" },
  { value: "#a9734d", name: "Olive brown" },
  { value: "#8d5a3b", name: "Brown" },
  { value: "#7a4a30", name: "Dark brown" },
  { value: "#5c3a26", name: "Deep brown" },
];
const HAIR: Choice[] = [
  { value: "#1d1510", name: "Black" },
  { value: "#2b1d14", name: "Dark brown" },
  { value: "#3b2b1f", name: "Brown" },
  { value: "#6a4a2a", name: "Light brown" },
  { value: "#7a3b22", name: "Auburn" },
];
const ROBES: Choice[] = [
  { value: "#cbb68c", name: "Undyed wool" },
  { value: "#b9a27a", name: "Oatmeal" },
  { value: "#8f7454", name: "Earth brown" },
  { value: "#6c7c8c", name: "Slate" },
  { value: "#56617a", name: "Indigo" },
  { value: "#5f7a5a", name: "Olive green" },
  { value: "#9b4a2e", name: "Madder red" },
  { value: "#8a5a6a", name: "Mulberry" },
];
const MANTLES: Choice[] = [
  { value: "#d9cdb0", name: "Natural linen" },
  { value: "#7a5a3a", name: "Brown" },
  { value: "#3f5873", name: "Blue" },
  { value: "#4f5d3a", name: "Green" },
  { value: "#6b2f2a", name: "Deep red" },
];
const SASHES: Choice[] = [
  { value: "#c99b5a", name: "Ochre" },
  { value: "#6b4f3a", name: "Brown" },
  { value: "#8a3b2e", name: "Red" },
  { value: "#45607a", name: "Blue" },
  { value: "#d9cdb0", name: "Natural" },
  { value: "#2f2a26", name: "Charcoal" },
];
const HEADCLOTHS: Choice[] = [
  { value: "#d9cdb0", name: "Natural linen" },
  { value: "#ece6d6", name: "White" },
  { value: "#6b4f3a", name: "Brown" },
  { value: "#45607a", name: "Blue" },
  { value: "#8a3b2e", name: "Red" },
];
const HAIR_STYLE_NAMES: Record<HairStyle, string> = { short: "Short", long: "Long", curly: "Curly", bald: "Bald" };
const BEARDS: { value: Appearance["beard"]; name: string }[] = [
  { value: "none", name: "No beard" },
  { value: "short", name: "Short beard" },
  { value: "full", name: "Full beard" },
];

const same = (a: string | undefined, b: string | undefined) => (a ?? "").toLowerCase() === (b ?? "").toLowerCase();

function Swatches({
  legend,
  choices,
  value,
  onPick,
  none,
}: {
  legend: string;
  choices: Choice[];
  value: string | undefined;
  onPick: (value: string | undefined) => void;
  /** Offer "none" first, with this label (a mantle or head covering is optional). */
  none?: string;
}) {
  return (
    <fieldset>
      <legend className="mb-1 text-xs font-semibold text-muted">{legend}</legend>
      <div className="flex flex-wrap items-center gap-1.5">
        {none && (
          <button
            type="button"
            onClick={() => onPick(undefined)}
            aria-pressed={!value}
            className={`h-7 rounded-full border px-2.5 text-xs font-medium ${!value ? "border-brand bg-brand-soft" : "border-line"}`}
          >
            {none}
          </button>
        )}
        {choices.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => onPick(c.value)}
            aria-label={c.name}
            title={c.name}
            aria-pressed={same(value, c.value)}
            className={`h-7 w-7 rounded-full border-2 ${same(value, c.value) ? "border-brand ring-2 ring-gold/60" : "border-line"}`}
            style={{ background: c.value }}
          />
        ))}
      </div>
    </fieldset>
  );
}

function Options<T extends string>({
  legend,
  options,
  value,
  onPick,
}: {
  legend: string;
  options: { value: T; name: string }[];
  value: T;
  onPick: (value: T) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-1 text-xs font-semibold text-muted">{legend}</legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={value === o.value}
            onClick={() => onPick(o.value)}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${value === o.value ? "border-brand bg-brand-soft" : "border-line"}`}
          >
            {o.name}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * Make (or change) the player's character. `first`: the welcome's second step, ending in "Begin your walk".
 * Every change is shown live, in the preview here and on the player in the world (`onPreview`).
 */
export function CharacterCreator({
  first,
  initialName,
  initialAppearance,
  onPreview,
  onDone,
  onBack,
}: {
  first: boolean;
  initialName: string;
  initialAppearance: Appearance;
  onPreview: (appearance: Appearance) => void;
  onDone: (name: string, appearance: Appearance) => void;
  /** Back to the welcome (first visit) or close without changes. */
  onBack: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [look, setLook] = useState<Appearance>(initialAppearance);
  const nameId = useId();
  const valid = cleanName(name);

  function update(change: Partial<Appearance>) {
    const next = { ...look, ...change };
    setLook(next);
    onPreview(next);
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onDone(valid, look);
      }}
    >
      <header>
        <p className="text-xs font-semibold tracking-wider text-gold uppercase">{first ? "Step 2 of 2" : "Change it any time"}</p>
        <h2 className="font-serif text-2xl font-semibold">{first ? "Create your character" : "Your character"}</h2>
      </header>

      <div className="flex items-center gap-4">
        <div className="shrink-0 overflow-hidden rounded-2xl border border-line bg-surface-2">
          <AvatarPreview appearance={look} size={128} />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <label htmlFor={nameId} className="text-sm font-semibold">
            Your name
          </label>
          <input
            id={nameId}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={NAME_MAX}
            autoComplete="nickname"
            placeholder="e.g. Miriam or Sam"
            className="w-full rounded-lg border border-line bg-bg px-3 py-2 outline-none focus:border-brand"
          />
          <p className="text-xs text-muted">
            {valid || !name ? "Jesus and the disciples will call you by this name." : `Choose a name of 1 to ${NAME_MAX} characters.`}
          </p>
        </div>
      </div>

      <section className="space-y-3 rounded-xl border border-line bg-surface p-4">
        <Swatches legend="Skin tone" choices={SKINS} value={look.skin} onPick={(skin) => skin && update({ skin })} />
        <Swatches legend="Hair colour" choices={HAIR} value={look.hair} onPick={(hair) => hair && update({ hair })} />
        <Options
          legend="Hair"
          options={HAIR_STYLES.map((s) => ({ value: s, name: HAIR_STYLE_NAMES[s] }))}
          value={look.hairStyle ?? "short"}
          onPick={(hairStyle) => update({ hairStyle })}
        />
        <Options legend="Beard" options={BEARDS} value={look.beard} onPick={(beard) => update({ beard })} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={Boolean(look.grey)} onChange={(e) => update({ grey: e.target.checked })} />
          A touch of grey
        </label>
      </section>

      <section className="space-y-3 rounded-xl border border-line bg-surface p-4">
        <Swatches legend="Robe" choices={ROBES} value={look.robe} onPick={(robe) => robe && update({ robe })} />
        <Swatches legend="Mantle" choices={MANTLES} value={look.mantle} none="None" onPick={(mantle) => update({ mantle })} />
        <Swatches legend="Sash" choices={SASHES} value={look.sash} onPick={(sash) => sash && update({ sash })} />
        <Swatches
          legend="Head covering"
          choices={HEADCLOTHS}
          value={look.headcloth}
          none="None"
          onPick={(headcloth) => update({ headcloth })}
        />
      </section>

      {!first && (
        <details className="rounded-xl border border-line bg-surface p-4">
          <summary className="cursor-pointer text-sm font-semibold">How to walk</summary>
          <div className="mt-3">
            <HowToWalk />
          </div>
        </details>
      )}

      <div className="flex flex-wrap gap-2">
        <button disabled={!valid} className="btn-primary flex-1">
          {first ? "Begin your walk" : "Save"}
        </button>
        <button type="button" onClick={onBack} className="btn-secondary">
          {first ? "← Back" : "Cancel"}
        </button>
      </div>
    </form>
  );
}
