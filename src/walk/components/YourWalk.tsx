import { getCharacter } from "@/walk/content";
import {
  BADGES,
  NEED_INFO,
  NEEDS,
  nextRelationshipLevel,
  relationshipLevel,
  type LifeState,
  type Needs,
  type Relationships,
} from "@/walk/life";
import { Portrait } from "./Portrait";
import { RefLink, TextWithRefs } from "./Scripture";

// "Your walk": the five needs, friendships with the characters, and growth badges. Shared by the panel in the game
// and the /walk/me page. Encouraging by design: no scores to beat, nobody to compare with.

function Meter({ value, color, label }: { value: number; color: string; label: string }) {
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      className="h-2 overflow-hidden rounded-full bg-surface-2"
    >
      <div className="h-full rounded-full" style={{ width: `${value}%`, background: color }} />
    </div>
  );
}

function SectionTitle({ title, note }: { title: string; note?: string }) {
  return (
    <div className="mb-2">
      <h3 className="text-xs font-semibold tracking-wider text-gold uppercase">{title}</h3>
      {note && <p className="text-sm text-muted">{note}</p>}
    </div>
  );
}

/** Each need: how full it is, why it matters (with its verse), and how to grow it in the world. */
export function NeedsSection({ needs }: { needs: Needs }) {
  return (
    <section>
      <SectionTitle
        title="Your needs"
        note="They grow as you pray, read, spend time with others, serve and rest, and fade gently as the days pass. An invitation, never a score."
      />
      <ul className="grid gap-2">
        {NEEDS.map((n) => {
          const info = NEED_INFO[n];
          const value = Math.round(needs[n]);
          return (
            <li key={n} className="space-y-1.5 rounded-xl border border-line bg-surface p-3">
              <p className="flex items-center gap-2">
                <span aria-hidden className="text-lg leading-none">
                  {info.icon}
                </span>
                <span className="font-semibold">{info.label}</span>
                <span className="ml-auto text-xs text-muted tabular-nums">{value} of 100</span>
              </p>
              <Meter value={value} color={info.color} label={info.label} />
              <p className="text-sm">
                <TextWithRefs text={info.summary} />
              </p>
              <p className="text-xs text-muted">🌱 {info.hint}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Everyone the player has met, closest first, with where the friendship stands and what comes next. */
export function FriendshipsSection({ relationships }: { relationships: Relationships }) {
  const met = Object.entries(relationships)
    .filter(([id]) => getCharacter(id))
    .sort((a, b) => b[1] - a[1]);
  return (
    <section>
      <SectionTitle title="Friendships" note="Friendships grow with time together: a hello, a conversation, a lesson, a shared meal." />
      {met.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line p-4 text-sm text-muted">
          You haven&apos;t met anyone yet. Walk down to the shore and say hello: Jesus, Peter and Matthew will be glad
          to meet you.
        </p>
      ) : (
        <ul className="grid gap-2">
          {met.map(([id, value]) => {
            const character = getCharacter(id)!;
            const level = relationshipLevel(id, value);
            const next = nextRelationshipLevel(id, value);
            return (
              <li key={id} className="flex gap-3 rounded-xl border border-line bg-surface p-3">
                <Portrait appearance={character.appearance} size={44} className="shrink-0" />
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-semibold">{character.shortName}</span>
                    <span className="text-xs font-semibold text-brand">{level.label}</span>
                  </p>
                  <Meter value={Math.round(value)} color="var(--gold)" label={`Friendship with ${character.shortName}`} />
                  <p className="text-sm">
                    <TextWithRefs text={level.description} />
                  </p>
                  {next && <p className="text-xs text-muted">Growing toward: {next.label}</p>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

/** Badges earned so far, newest first, and the ones still waiting to be found. `wide`: two columns on wide screens. */
export function BadgesSection({ badges, wide = false }: { badges: Record<string, string>; wide?: boolean }) {
  const grid = `grid gap-2 ${wide ? "sm:grid-cols-2" : ""}`;
  const earned = BADGES.filter((b) => Object.hasOwn(badges, b.id)).sort((a, b) => badges[b.id].localeCompare(badges[a.id]));
  const ahead = BADGES.filter((b) => !Object.hasOwn(badges, b.id));
  return (
    <section>
      <SectionTitle
        title="Growth badges"
        note="Small markers of moments in your walk. Nobody else sees them, and there's no hurry."
      />
      {earned.length > 0 && (
        <ul className={`mb-3 ${grid}`}>
          {earned.map((b) => (
            <li key={b.id} className="flex gap-3 rounded-xl border border-gold/50 bg-surface p-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gold/15 text-xl" aria-hidden>
                {b.icon}
              </span>
              <div className="min-w-0 space-y-0.5">
                <p className="font-semibold">{b.title}</p>
                <p className="text-xs text-muted">
                  {b.description} <RefLink refText={b.ref} />
                </p>
                <p className="text-[11px] text-muted">
                  <time dateTime={badges[b.id]} suppressHydrationWarning>
                    {formatDay(badges[b.id])}
                  </time>
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
      {ahead.length > 0 && (
        <>
          <p className="mb-2 text-sm font-medium">{earned.length ? "Still to find" : "Waiting to be found"}</p>
          <ul className={grid}>
            {ahead.map((b) => (
              <li key={b.id} className="flex gap-3 rounded-xl border border-dashed border-line p-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface-2 text-xl opacity-60 grayscale" aria-hidden>
                  {b.icon}
                </span>
                <div className="min-w-0 space-y-0.5">
                  <p className="font-medium">{b.title}</p>
                  <p className="text-xs text-muted">{b.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

/** Needs, friendships and badges together. */
export function WalkSummary({ life, wide = false }: { life: LifeState; wide?: boolean }) {
  return (
    <div className="space-y-6">
      <NeedsSection needs={life.needs} />
      <FriendshipsSection relationships={life.relationships} />
      <BadgesSection badges={life.badges} wide={wide} />
    </div>
  );
}
