"use client";

import { NEED_INFO, NEEDS, type NeedNudge, type Needs } from "@/walk/life";
import { bibleGatewayUrl, formatReference, parseReference } from "@/walk/scripture/references";

// The five spiritual needs over the world: small meters that open "Your walk", and a kind word when one runs low.

/** The five meters, compact on a phone. Tapping them opens the "Your walk" panel. */
export function NeedsMeters({ needs, onOpen }: { needs: Needs; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="pointer-events-auto flex items-end gap-2 rounded-2xl bg-black/45 px-2.5 py-1.5 text-white shadow backdrop-blur transition hover:bg-black/60 sm:items-center sm:gap-3 sm:px-3"
    >
      <span className="sr-only">Your walk: </span>
      {NEEDS.map((n, i) => {
        const info = NEED_INFO[n];
        const value = Math.round(needs[n]);
        return (
          <span key={n} className="flex flex-col items-center gap-0.5 sm:flex-row sm:gap-1.5" title={`${info.label}: ${value} of 100`}>
            <span aria-hidden className="text-sm leading-none">
              {info.icon}
            </span>
            <span aria-hidden className="block h-1 w-7 overflow-hidden rounded-full bg-white/25 sm:h-1.5 sm:w-10">
              <span className="block h-full rounded-full transition-[width] duration-700" style={{ width: `${value}%`, background: info.color }} />
            </span>
            <span className="sr-only">
              {info.label} {value} of 100{i < NEEDS.length - 1 ? ", " : ""}
            </span>
          </span>
        );
      })}
    </button>
  );
}

/** A gentle suggestion for the need that has run lowest, with a verse to carry. The player can wave it away. */
export function NudgeLine({ nudge, onDismiss }: { nudge: NeedNudge; onDismiss: () => void }) {
  const info = NEED_INFO[nudge.need];
  const parsed = parseReference(nudge.passage.ref);
  return (
    <div className="pointer-events-auto flex max-w-[22rem] items-start gap-2 rounded-xl bg-black/55 px-3 py-2 text-xs leading-snug text-white shadow backdrop-blur">
      <span aria-hidden className="text-base leading-none">
        {info.icon}
      </span>
      <div className="min-w-0 flex-1 space-y-1">
        <p>{nudge.text}</p>
        <p className="font-serif italic opacity-90">
          &ldquo;{nudge.passage.text}&rdquo;{" "}
          <a
            href={bibleGatewayUrl(nudge.passage.ref)}
            target="_blank"
            rel="noopener noreferrer"
            className="whitespace-nowrap not-italic text-amber-200 underline underline-offset-2"
          >
            {parsed ? formatReference(parsed) : nudge.passage.ref}
          </a>
        </p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="-mt-0.5 -mr-1 grid h-6 w-6 shrink-0 place-items-center rounded-full text-sm opacity-80 hover:bg-white/15 hover:opacity-100"
        aria-label="Dismiss this suggestion"
      >
        ×
      </button>
    </div>
  );
}
