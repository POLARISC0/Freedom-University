"use client";

import Link from "next/link";
import { useState } from "react";
import { getCharacter, getPath, LESSONS, TOWNSFOLK } from "@/walk/content";
import { nextRelationshipLevel, relationshipLevel } from "@/walk/life";
import { lessonStatus, type ProgressMap } from "@/walk/progress";
import { ChatPanel } from "../ChatPanel";
import { Portrait } from "../Portrait";
import { RefChips, TextWithRefs } from "../Scripture";

const FREE_TALK_SUGGESTIONS: Record<string, string[]> = {
  jesus: ["How should I pray?", "What does it mean to follow you?", "How do I forgive someone who hurt me?"],
  peter: ["How did you get back up after denying Jesus?", "How do I have more faith?", "What was it like to walk on water?"],
  matthew: ["What changed when you left the tax booth?", "How should I think about money?", "What does generosity look like day to day?"],
};

/**
 * Walking up to someone: what they're doing, your friendship, their greeting, their lessons, and (for AI mentors)
 * a conversation.
 */
export function CharacterPanel({
  id,
  progress,
  friendship,
  doing,
  routine,
  onOpenLesson,
  onMessageSent,
}: {
  id: string;
  progress: ProgressMap;
  /** Friendship with them so far, 0-100 (undefined before the player has made their character). */
  friendship?: number;
  /** What they're doing right now, e.g. "Mending the nets (Luke 5:2-5)". */
  doing?: string | null;
  /** Their usual day in one line. */
  routine?: string | null;
  onOpenLesson: (slug: string) => void;
  onMessageSent?: () => void;
}) {
  const [talking, setTalking] = useState(false);
  const character = getCharacter(id);

  if (!character) {
    const townsperson = TOWNSFOLK[id];
    return (
      <div className="space-y-4">
        <header className="flex items-center gap-3">
          {townsperson && <Portrait appearance={townsperson.appearance} size={48} />}
          <div>
            <h2 className="font-serif text-xl font-semibold">{townsperson?.name ?? "A neighbour"}</h2>
            {doing && <p className="text-sm text-muted">{doing}</p>}
          </div>
        </header>
        <p className="leading-relaxed">
          &ldquo;Shalom, child. The water is cool today, and the Lord is good. Go well.&rdquo;
        </p>
      </div>
    );
  }

  const lessons = LESSONS.filter((l) => l.mentorId === id);
  return (
    <div className="space-y-5">
      <header className="flex items-center gap-3">
        <Portrait appearance={character.appearance} size={56} className="shrink-0" />
        <div>
          <h2 className="font-serif text-2xl leading-tight font-semibold">{character.name}</h2>
          <p className="text-sm text-muted">{character.title}</p>
        </div>
      </header>

      {(doing || routine || friendship !== undefined) && (
        <section className="space-y-2 rounded-xl bg-surface-2/70 p-3 text-sm">
          {doing && (
            <p>
              <span className="font-semibold">Now: </span>
              <TextWithRefs text={doing} />
            </p>
          )}
          {routine && (
            <p className="text-xs text-muted">
              {character.shortName}
              {character.shortName.endsWith("s") ? "'" : "'s"} usual day: {routine}
            </p>
          )}
          {friendship !== undefined && <Friendship id={id} name={character.shortName} value={friendship} />}
        </section>
      )}

      {!talking && (
        <div className="space-y-3">
          {character.greeting.map((line, i) => (
            <div key={i}>
              <p className={`leading-relaxed ${line.text.startsWith('"') ? "scripture text-[1.05rem]" : ""}`}>{line.text}</p>
              <RefChips refs={line.refs ?? []} label="" />
            </div>
          ))}
        </div>
      )}

      {!talking && lessons.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-xs font-semibold tracking-wider text-gold uppercase">Walk with {character.shortName}</h3>
          {lessons.map((l) => {
            const status = lessonStatus(progress[l.slug]);
            return (
              <button key={l.slug} onClick={() => onOpenLesson(l.slug)} className="btn-choice flex w-full items-center gap-3">
                <span className="text-xl" aria-hidden>
                  {getPath(l.pathSlug)?.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block">
                    {status === "in_progress" ? "Continue: " : status === "completed" ? "Walk again: " : "Begin: "}
                    {l.title}
                  </span>
                  <span className="block text-xs font-normal text-muted">
                    {status === "completed" ? "✓ Walked · " : ""}
                    {getPath(l.pathSlug)?.title} · about {l.minutes} min
                  </span>
                </span>
              </button>
            );
          })}
        </section>
      )}

      {character.conversational ? (
        talking ? (
          <div className="space-y-3">
            <ChatPanel
              character={character}
              suggestions={FREE_TALK_SUGGESTIONS[character.id] ?? []}
              onMessageSent={onMessageSent}
            />
            <button onClick={() => setTalking(false)} className="text-sm text-muted underline">
              ← Back
            </button>
          </div>
        ) : (
          <button onClick={() => setTalking(true)} className="btn-secondary w-full">
            🗣️ Talk with {character.shortName}
          </button>
        )
      ) : (
        <div className="rounded-lg bg-surface-2/70 p-3 text-sm">
          <p>
            {character.shortName} will mentor you in <strong>{character.themes.join(", ")}</strong> in a later chapter.
          </p>
          <RefChips refs={character.keyRefs.slice(0, 4)} label="Read about them:" />
          <Link href="/walk/mentors" className="mt-2 inline-block text-brand underline">
            Meet all the mentors
          </Link>
        </div>
      )}
    </div>
  );
}

/** Where a friendship stands: its level in words, how far it has grown, and the level it is growing toward. */
function Friendship({ id, name, value }: { id: string; name: string; value: number }) {
  const level = relationshipLevel(id, value);
  const next = nextRelationshipLevel(id, value);
  return (
    <div className="space-y-1 border-t border-line pt-2">
      <p className="flex flex-wrap items-baseline gap-x-2">
        <span className="font-semibold">Friendship: {level.label}</span>
        {next && <span className="text-xs text-muted">growing toward {next.label}</span>}
      </p>
      <div
        role="meter"
        aria-label={`Friendship with ${name}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(value)}
        className="h-1.5 overflow-hidden rounded-full bg-surface"
      >
        <div className="h-full rounded-full bg-gold" style={{ width: `${Math.round(value)}%` }} />
      </div>
      <p className="text-xs text-muted">
        <TextWithRefs text={level.description} />
      </p>
    </div>
  );
}
