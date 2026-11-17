import type { Accent } from "@/content/types";
import type { LessonStatus } from "@/lib/progress";

/** Full class strings per accent so Tailwind can see them at build time. */
export const ACCENTS: Record<Accent, { bar: string; ring: string; dot: string }> = {
  amber: { bar: "bg-amber-500", ring: "border-l-amber-500", dot: "bg-amber-400 ring-amber-600" },
  emerald: { bar: "bg-emerald-500", ring: "border-l-emerald-500", dot: "bg-emerald-400 ring-emerald-600" },
  sky: { bar: "bg-sky-500", ring: "border-l-sky-500", dot: "bg-sky-400 ring-sky-600" },
  violet: { bar: "bg-violet-500", ring: "border-l-violet-500", dot: "bg-violet-400 ring-violet-600" },
};

export function ProgressBar({ value, max, accent }: { value: number; max: number; accent: Accent }) {
  const pct = max === 0 ? 0 : Math.round((value / max) * 100);
  return (
    <div className="flex items-center gap-3">
      <div
        className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div className={`h-full rounded-full ${ACCENTS[accent].bar}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs tabular-nums text-muted">
        {value}/{max}
      </span>
    </div>
  );
}

export function StatusBadge({ status }: { status: LessonStatus }) {
  const map: Record<LessonStatus, { label: string; cls: string }> = {
    completed: { label: "✓ Completed", cls: "text-success" },
    in_progress: { label: "In progress", cls: "text-brand" },
    available: { label: "Ready to start", cls: "text-ink" },
    locked: { label: "🔒 Locked", cls: "text-muted" },
  };
  const { label, cls } = map[status];
  return <span className={`text-xs font-medium ${cls}`}>{label}</span>;
}

export function Disclaimer() {
  return (
    <p className="rounded-lg border border-line bg-brand-soft px-4 py-2.5 text-sm">
      <strong>Education only.</strong> The specialists teach concepts and frameworks. They never trade, and never give
      personalised investment, credit, tax or legal advice. Talk to a licensed professional about your own money.
    </p>
  );
}
