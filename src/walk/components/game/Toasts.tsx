"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { getCharacter } from "@/walk/content";
import { NEED_INFO, NEEDS, type ActivityDef, type BadgeDef } from "@/walk/life";
import { RefLink } from "../Scripture";

// Short messages over the world: a line of text, what an activity gave (with the Scripture behind it), or a new
// growth badge. A few at most, each fading on its own; the larger ones can be dismissed.

export type ToastBody =
  | { kind: "text"; text: string }
  | { kind: "activity"; def: ActivityDef; company: string[] }
  | { kind: "badge"; badge: BadgeDef };

interface Toast {
  id: number;
  body: ToastBody;
}

const SHOWN = 3;
/** On a short screen the larger toasts would reach the HUD at the top, so they take turns there. */
const SHORT_SCREEN = "(max-height: 719px)";
const DURATION: Record<ToastBody["kind"], number> = { text: 3200, activity: 9000, badge: 7000 };

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const show = useCallback((body: ToastBody) => {
    const id = ++nextId.current;
    // The same line twice in a row is shown once.
    const same = (t: Toast) => t.body.kind === "text" && body.kind === "text" && t.body.text === body.text;
    setToasts((list) => [...list.filter((t) => !same(t)), { id, body }].slice(-SHOWN));
  }, []);

  return { toasts, show, dismiss };
}

/** "+25 Prayer", "−8 Rest": how an activity changes each need, gains first. */
export function needChanges(def: ActivityDef): { label: string; color: string; gain: boolean }[] {
  return NEEDS.filter((n) => def.needs[n])
    .map((n) => ({ n, amount: def.needs[n]! }))
    .sort((a, b) => b.amount - a.amount)
    .map(({ n, amount }) => ({
      label: `${amount > 0 ? "+" : "−"}${Math.abs(amount)} ${NEED_INFO[n].label}`,
      color: NEED_INFO[n].color,
      gain: amount > 0,
    }));
}

/** "Peter", "Peter and Andrew", "Peter, Andrew and John". */
export function namesList(names: string[]): string {
  return names.length <= 1 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

function useShortScreen(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia(SHORT_SCREEN);
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    },
    () => window.matchMedia(SHORT_SCREEN).matches,
    () => false,
  );
}

/**
 * The newest `max` toasts (one at a time on a short screen); the rest wait their turn, and each one's time starts
 * when it is shown. With `linesOnly`, the larger toasts (an activity's result, a badge) wait too.
 */
export function ToastStack({
  toasts,
  onDismiss,
  max = SHOWN,
  linesOnly = false,
  className = "",
  style,
}: {
  toasts: Toast[];
  onDismiss: (id: number) => void;
  max?: number;
  linesOnly?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const shown = useShortScreen() ? 1 : max;
  const ready = linesOnly ? toasts.filter((t) => t.body.kind === "text") : toasts;
  return (
    <div role="status" aria-live="polite" style={style} className={`pointer-events-none flex flex-col items-center gap-2 px-3 ${className}`}>
      {ready.slice(-shown).map((t) => (
        <ToastView key={t.id} id={t.id} body={t.body} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastView({ id, body, onDismiss }: { id: number; body: ToastBody; onDismiss: (id: number) => void }) {
  // Timed from when it is actually on screen, however busy the page was when it was asked for.
  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(id), DURATION[body.kind]);
    return () => window.clearTimeout(timer);
  }, [id, body.kind, onDismiss]);

  if (body.kind === "text") {
    return <p className="max-w-md rounded-full bg-black/70 px-4 py-2 text-center text-sm text-white shadow">{body.text}</p>;
  }
  return (
    <div className="pointer-events-auto relative w-full max-w-sm rounded-2xl border border-line bg-surface/95 p-3 pr-9 text-sm shadow-lg backdrop-blur select-text">
      <button
        type="button"
        onClick={() => onDismiss(id)}
        className="absolute top-2 right-2 grid h-6 w-6 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-ink"
        aria-label="Dismiss"
      >
        ×
      </button>
      {body.kind === "activity" ? <ActivityResult def={body.def} company={body.company} /> : <BadgeEarned badge={body.badge} />}
    </div>
  );
}

function ActivityResult({ def, company }: { def: ActivityDef; company: string[] }) {
  const names = def.friendship ? company.map((id) => getCharacter(id)?.shortName).filter((n): n is string => Boolean(n)) : [];
  return (
    <div className="space-y-1.5">
      <p className="font-semibold">{def.done}</p>
      <p className="flex flex-wrap gap-1.5">
        {needChanges(def).map((c) => (
          <span
            key={c.label}
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${c.gain ? "text-white" : "bg-surface-2 text-muted"}`}
            style={c.gain ? { background: c.color } : undefined}
          >
            {c.label}
          </span>
        ))}
      </p>
      {names.length > 0 && <p className="text-xs text-muted">You grew closer to {namesList(names)}.</p>}
      <p className="scripture leading-snug">
        &ldquo;{def.passage.text}&rdquo; <RefLink refText={def.passage.ref} className="text-xs not-italic" />
      </p>
    </div>
  );
}

function BadgeEarned({ badge }: { badge: BadgeDef }) {
  return (
    <div className="flex gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gold/15 text-xl" aria-hidden>
        {badge.icon}
      </span>
      <div className="min-w-0 space-y-0.5">
        <p className="text-xs font-semibold tracking-wider text-gold uppercase">New growth badge</p>
        <p className="font-semibold">{badge.title}</p>
        <p className="text-xs text-muted">
          {badge.description} <RefLink refText={badge.ref} />
        </p>
      </div>
    </div>
  );
}
