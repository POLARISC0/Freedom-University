"use client";

import { useState, useTransition } from "react";
import { deleteJournalEntry, saveJournalEntry } from "@/app/walk/actions";
import { getLesson } from "@/walk/content";
import { JOURNAL_KIND_LABELS, JOURNAL_KINDS, type JournalEntryView, type JournalKind } from "@/walk/progress";
import { detectConcerns } from "@/walk/safety/concern";
import type { ConcernKind } from "@/walk/safety/resources";
import { HelpCard } from "./HelpCard";
import { safely } from "./safe-action";

const KIND_ICONS: Record<JournalKind, string> = { reflection: "✍️", prayer: "🙏", gratitude: "🌿", note: "📝" };

const PROMPTS: Record<JournalKind, string> = {
  prayer: "Talk to God honestly. What's on your heart today?",
  gratitude: "What are three things you're thankful for today?",
  reflection: "What is God teaching you right now?",
  note: "A verse, a thought, something to remember…",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

/** The Walk Journal: write reflections and prayers, read them back, edit or delete them. */
export function JournalView({
  entries,
  onEntriesChange,
}: {
  entries: JournalEntryView[];
  onEntriesChange: React.Dispatch<React.SetStateAction<JournalEntryView[]>>;
}) {
  const [filter, setFilter] = useState<JournalKind | "all">("all");
  const [editing, setEditing] = useState<JournalEntryView | null>(null);
  const [care, setCare] = useState<ConcernKind[]>([]);
  const shown = filter === "all" ? entries : entries.filter((e) => e.kind === filter);

  return (
    <div className="space-y-5">
      <Composer
        key={editing?.id ?? "new"}
        editing={editing}
        onSaved={(entry) => {
          const edited = Boolean(editing);
          onEntriesChange((list) => (edited ? list.map((e) => (e.id === entry.id ? entry : e)) : [entry, ...list]));
          setCare(detectConcerns(`${entry.title ?? ""}\n${entry.body}`));
          setEditing(null);
        }}
        onCancel={() => setEditing(null)}
      />
      {care.length > 0 && <HelpCard concerns={care} compact />}

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter entries">
        {(["all", ...JOURNAL_KINDS] as const).map((k) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            aria-pressed={filter === k}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              filter === k ? "border-brand bg-brand text-brand-ink" : "border-line bg-surface text-muted hover:text-ink"
            }`}
          >
            {k === "all" ? "All" : `${KIND_ICONS[k]} ${JOURNAL_KIND_LABELS[k]}`}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">
          {entries.length === 0
            ? "Your journal is empty. Write a prayer, or finish a lesson's reflection, and it will appear here."
            : "No entries of this kind yet."}
        </p>
      ) : (
        <ul className="space-y-3">
          {shown.map((e) => (
            <EntryCard
              key={e.id}
              entry={e}
              onEdit={() => setEditing(e)}
              onDeleted={() => onEntriesChange((list) => list.filter((x) => x.id !== e.id))}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function Composer({
  editing,
  onSaved,
  onCancel,
}: {
  editing: JournalEntryView | null;
  onSaved: (entry: JournalEntryView) => void;
  onCancel: () => void;
}) {
  const [kind, setKind] = useState<JournalKind>(editing?.kind ?? "prayer");
  const [title, setTitle] = useState(editing?.title ?? "");
  const [body, setBody] = useState(editing?.body ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-3 rounded-xl border border-line bg-surface p-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          const result = await safely(() => saveJournalEntry({ id: editing?.id, kind, title, body }));
          if (!result.ok) return setError(result.error);
          setTitle("");
          setBody("");
          onSaved(result.data);
        });
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold">{editing ? "Edit entry" : "New entry"}</span>
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as JournalKind)}
          aria-label="Kind of entry"
          className="rounded-md border border-line bg-bg px-2 py-1 text-sm"
        >
          {JOURNAL_KINDS.map((k) => (
            <option key={k} value={k}>
              {KIND_ICONS[k]} {JOURNAL_KIND_LABELS[k]}
            </option>
          ))}
        </select>
      </div>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={200}
        placeholder="Title (optional)"
        aria-label="Title"
        className="w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-brand"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={5}
        maxLength={10_000}
        placeholder={PROMPTS[kind]}
        aria-label="Entry"
        className="w-full rounded-lg border border-line bg-bg px-3 py-2 leading-relaxed outline-none focus:border-brand"
      />
      {error && <p className="text-sm text-danger" role="alert">{error}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <button disabled={pending || !body.trim()} className="btn-primary">
          {pending ? "Saving…" : editing ? "Save changes" : "Save entry"}
        </button>
        {editing && (
          <button type="button" onClick={onCancel} className="btn-secondary">
            Cancel
          </button>
        )}
        <span className="text-xs text-muted">🔒 Private: only you can read your journal.</span>
      </div>
    </form>
  );
}

function EntryCard({ entry, onEdit, onDeleted }: { entry: JournalEntryView; onEdit: () => void; onDeleted: () => void }) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const lesson = entry.lessonSlug ? getLesson(entry.lessonSlug) : undefined;
  return (
    <li className="rounded-xl border border-line bg-surface p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-xs font-semibold text-muted">
          {KIND_ICONS[entry.kind]} {JOURNAL_KIND_LABELS[entry.kind]} ·{" "}
          <time dateTime={entry.createdAt} suppressHydrationWarning>
            {formatDate(entry.createdAt)}
          </time>
          {lesson && <> · from &ldquo;{lesson.title}&rdquo;</>}
        </p>
        <div className="flex gap-3 text-xs">
          <button onClick={onEdit} className="text-brand underline">
            Edit
          </button>
          {confirming ? (
            <>
              <button
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const result = await safely(() => deleteJournalEntry(entry.id));
                    if (result.ok) onDeleted();
                  })
                }
                className="font-semibold text-danger underline"
              >
                {pending ? "Deleting…" : "Yes, delete"}
              </button>
              <button onClick={() => setConfirming(false)} className="text-muted underline">
                Keep
              </button>
            </>
          ) : (
            <button onClick={() => setConfirming(true)} className="text-muted underline">
              Delete
            </button>
          )}
        </div>
      </div>
      {entry.title && <h3 className="mt-1 font-serif text-base font-semibold">{entry.title}</h3>}
      <p className="mt-1 leading-relaxed whitespace-pre-wrap">{entry.body}</p>
    </li>
  );
}
