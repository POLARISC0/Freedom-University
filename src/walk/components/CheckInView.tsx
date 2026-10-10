"use client";

import { useState, useTransition } from "react";
import { saveCheckIn } from "@/app/walk/actions";
import { verseForDay } from "@/walk/content";
import { MOOD_VERSES } from "@/walk/content/checkin";
import { MOODS, type CheckInView as CheckIn, type JournalEntryView, type Mood } from "@/walk/progress";
import { detectConcerns } from "@/walk/safety/concern";
import type { ConcernKind } from "@/walk/safety/resources";
import { HelpCard } from "./HelpCard";
import { safely } from "./safe-action";
import { PassageBlock } from "./Scripture";

/** The player's own calendar date, YYYY-MM-DD. */
export function localDay(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const MOOD_LABELS: Record<Mood, { icon: string; label: string }> = {
  joyful: { icon: "☀️", label: "Joyful" },
  peaceful: { icon: "🕊️", label: "Peaceful" },
  grateful: { icon: "🌿", label: "Grateful" },
  weary: { icon: "🌙", label: "Weary" },
  anxious: { icon: "🌊", label: "Anxious" },
  struggling: { icon: "⛈️", label: "Struggling" },
};

export function CheckInView({
  checkIns,
  onCheckIn,
  onJournalEntry,
}: {
  checkIns: CheckIn[];
  onCheckIn: (checkIn: CheckIn) => void;
  onJournalEntry?: (entry: JournalEntryView) => void;
}) {
  const today = localDay();
  const existing = checkIns.find((c) => c.day === today);
  const verse = verseForDay(today);
  const [mood, setMood] = useState<Mood | null>(existing?.mood ?? null);
  const [note, setNote] = useState(existing?.note ?? "");
  const [addToJournal, setAddToJournal] = useState(true);
  const [saved, setSaved] = useState<Mood | null>(existing?.mood ?? null);
  const [error, setError] = useState<string | null>(null);
  const [care, setCare] = useState<ConcernKind[]>([]);
  const [pending, startTransition] = useTransition();
  const thisMonth = checkIns.filter((c) => c.day.slice(0, 7) === today.slice(0, 7)).length;

  return (
    <div className="space-y-5">
      <section>
        <p className="mb-2 text-xs font-semibold tracking-wider text-gold uppercase">Today&apos;s verse</p>
        <PassageBlock passage={verse} />
      </section>

      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!mood) return;
          setError(null);
          startTransition(async () => {
            const result = await safely(() =>
              saveCheckIn({ day: today, mood, note, addToJournal: addToJournal && Boolean(note.trim()) }),
            );
            if (!result.ok) return setError(result.error);
            setCare(detectConcerns(note));
            setSaved(mood);
            onCheckIn(result.data.checkIn);
            if (result.data.entry) onJournalEntry?.(result.data.entry);
          });
        }}
      >
        <p className="font-serif text-lg">How is your walk with God today?</p>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="How you're feeling">
          {MOODS.map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={mood === m}
              onClick={() => setMood(m)}
              className={`rounded-lg border px-2 py-2 text-sm ${mood === m ? "border-brand bg-brand-soft font-semibold" : "border-line bg-surface hover:bg-surface-2"}`}
            >
              <span aria-hidden>{MOOD_LABELS[m].icon}</span> {MOOD_LABELS[m].label}
            </button>
          ))}
        </div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="A prayer, or something you're thankful for (optional)"
          aria-label="Prayer or note"
          className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-brand"
        />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={addToJournal} onChange={(e) => setAddToJournal(e.target.checked)} />
          Also save it to my Walk Journal as a prayer
        </label>
        {error && <p className="text-sm text-danger" role="alert">{error}</p>}
        <button disabled={!mood || pending} className="btn-primary">
          {pending ? "Saving…" : existing ? "Update today's check-in" : "Check in"}
        </button>
      </form>

      {saved && (
        <div className="space-y-3 rounded-xl bg-surface-2/70 p-4">
          <PassageBlock passage={MOOD_VERSES[saved]} />
          {(saved === "struggling" || saved === "anxious") && (
            <p className="text-sm">
              You don&apos;t have to carry this alone. Tell someone you trust today, a friend, a pastor or a
              counselor, and bring it to God in prayer.
            </p>
          )}
          {(saved === "struggling" || care.length > 0) && <HelpCard concerns={care} compact />}
        </div>
      )}

      <p className="text-xs text-muted">
        {thisMonth > 0
          ? `You've checked in on ${thisMonth} ${thisMonth === 1 ? "day" : "days"} this month. There's no streak to keep: just come back whenever you can.`
          : "There's no streak to keep. Just come back whenever you can."}
      </p>
    </div>
  );
}
