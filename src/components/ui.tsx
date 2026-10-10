import type { Accent, Level } from "@/content/types";
import type { ModuleStatus } from "@/lib/progress";

/** Full class strings per accent so Tailwind can see them at build time. */
export const ACCENTS: Record<Accent, { bar: string; ring: string }> = {
  amber: { bar: "bg-amber-500", ring: "border-l-amber-500" },
  violet: { bar: "bg-violet-500", ring: "border-l-violet-500" },
  sky: { bar: "bg-sky-500", ring: "border-l-sky-500" },
  emerald: { bar: "bg-emerald-500", ring: "border-l-emerald-500" },
  rose: { bar: "bg-rose-500", ring: "border-l-rose-500" },
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

export function LevelBadge({ level }: { level: Level }) {
  const styles: Record<Level, string> = {
    Beginner: "border-line text-muted",
    Intermediate: "border-line text-ink",
    Advanced: "border-brand text-brand",
  };
  return <span className={`rounded-full border px-2 py-0.5 text-xs ${styles[level]}`}>{level}</span>;
}

export function StatusBadge({ status }: { status: ModuleStatus }) {
  const map: Record<ModuleStatus, { label: string; cls: string }> = {
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
      <strong>Education only.</strong> Professors teach concepts and frameworks. They never give personalised
      investment, tax or legal advice. Talk to a licensed professional about your own money.
    </p>
  );
}
