"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type { Lesson } from "@/walk/content";
import type { CheckInView as CheckIn, JournalEntryView, LessonProgressView, ProgressMap } from "@/walk/progress";
import { JournalView } from "./JournalView";
import { LessonPlayer } from "./LessonPlayer";
import { PathsView } from "./PathsView";

// "Today" depends on the player's time zone, so the check-in renders only in the browser.
const CheckInView = dynamic(() => import("./CheckInView").then((m) => m.CheckInView), {
  ssr: false,
  loading: () => <p className="text-sm text-muted">Loading today&apos;s verse…</p>,
});

// Thin stateful wrappers so the full-page versions of the journal, paths and lessons share the game's components.

export function JournalPageClient({ initialEntries, initialCheckIns }: { initialEntries: JournalEntryView[]; initialCheckIns: CheckIn[] }) {
  const [entries, setEntries] = useState(initialEntries);
  const [checkIns, setCheckIns] = useState(initialCheckIns);
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <JournalView entries={entries} onEntriesChange={setEntries} />
      <aside className="space-y-3">
        <h2 className="font-serif text-xl font-semibold">Daily check-in</h2>
        <CheckInView
          checkIns={checkIns}
          onCheckIn={(c) => setCheckIns((list) => [c, ...list.filter((x) => x.day !== c.day)])}
          onJournalEntry={(e) => setEntries((list) => [e, ...list])}
        />
      </aside>
    </div>
  );
}

export function PathsPageClient({ initialProgress }: { initialProgress: ProgressMap }) {
  const [progress, setProgress] = useState(initialProgress);
  return <PathsView progress={progress} onProgress={(v) => setProgress((p) => ({ ...p, [v.lessonSlug]: v }))} />;
}

export function LessonPageClient({
  lesson,
  initialProgress,
  spotLabels,
}: {
  lesson: Lesson;
  initialProgress: LessonProgressView | undefined;
  spotLabels: Record<string, string>;
}) {
  const [progress, setProgress] = useState(initialProgress);
  return (
    <LessonPlayer
      lesson={lesson}
      progress={progress}
      mode="standalone"
      onProgress={setProgress}
      spotLabel={(id) => spotLabels[id] ?? "the next place"}
    />
  );
}
