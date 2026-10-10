import { z } from "zod";
import { getCharacter, HAIR_STYLES, type Appearance, type Lesson } from "@/walk/content";
import type { JournalKind } from "@/walk/progress";
import { DAY_MINUTES } from "@/walk/world/clock";
import { getBadge, newlyEarned } from "./badges";
import { addNeeds, decayNeeds, STARTING_NEEDS } from "./needs";
import { addFriendship, FRIENDSHIP } from "./relationships";
import { NEEDS, type ActivityDef, type BadgeContext, type BadgeDef, type DailyFriendship, type LifeState, type Needs } from "./types";

// The player's life as plain data, with immutable reducers the UI calls as things happen in the world. Every
// reducer returns a new LifeState (or the same one when nothing changed), so it drops straight into React state.
// Saved lives come back through parseLife, which trusts nothing.

export const NAME_MAX = 40;

/** How the player looks until they choose: a plain robe and sash, like most people in Capernaum. */
export const DEFAULT_APPEARANCE: Appearance = {
  skin: "#a9734d",
  hair: "#2b1d14",
  beard: "none",
  robe: "#b9a27a",
  sash: "#6b4f3a",
  hairStyle: "short",
  build: "adult",
};

/** Needs gained when a lesson is finished, by growth path. */
export const PATH_NEEDS: Record<string, Partial<Needs>> = {
  prayer: { prayer: 30 },
  faith: { word: 15, fellowship: 15 },
  generosity: { service: 30 },
  fasting: { prayer: 30 },
  worship: { prayer: 20, fellowship: 10 },
  forgiveness: { fellowship: 30 },
  serving: { service: 30 },
  fear: { prayer: 15, word: 15 },
  word: { word: 30 },
  sharing: { fellowship: 15, service: 15 },
  questions: { word: 30 },
};

/** Needs gained by a daily check-in. */
export const CHECK_IN_NEEDS: Partial<Needs> = { prayer: 5 };

/** Needs gained by writing in the Walk Journal, by kind of entry. */
export const JOURNAL_NEEDS: Record<JournalKind, Partial<Needs>> = {
  reflection: { word: 6 },
  prayer: { prayer: 10 },
  gratitude: { prayer: 6 },
  note: { word: 3 },
};

/** The most game time one tick fades needs for, so coming back after a long gap is gentle. */
export const MAX_FADE_MINUTES = DAY_MINUTES;

// Limits for saved data.
const MAX_COUNT = 1_000_000;
const MAX_CLOCK = DAY_MINUTES * 1_000_000;
const MAX_RELATIONSHIPS = 64;
const MAX_COUNTERS = 256;
const MAX_MESSAGES_PER_DAY = 10_000;
const ID = /^[a-z0-9][a-z0-9-]{0,47}$/;
const COUNTER_KEY = /^[a-z0-9][a-z0-9:-]{0,79}$/;
const HEX = /^#[0-9a-f]{6}$/i;
const ISO_MAX = 40;

/** A name the characters can call the player by: 1-40 characters, tidied, or null if there isn't one. */
export function cleanName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  // Control characters and bidirectional overrides have no place in a name and can disguise one.
  const name = raw.replace(/[\p{Cc}\u202a-\u202e\u2066-\u2069]/gu, "").replace(/\s+/g, " ").trim();
  return name.length >= 1 && name.length <= NAME_MAX ? name : null;
}

const color = (fallback: string) =>
  z
    .string()
    .regex(HEX)
    .transform((c) => c.toLowerCase())
    .catch(fallback);
const optionalColor = z
  .string()
  .regex(HEX)
  .transform((c) => c.toLowerCase())
  .optional()
  .catch(undefined);

const AppearanceSchema = z.object({
  skin: color(DEFAULT_APPEARANCE.skin),
  hair: color(DEFAULT_APPEARANCE.hair),
  beard: z.enum(["none", "short", "full"]).catch(DEFAULT_APPEARANCE.beard),
  grey: z.boolean().optional().catch(undefined),
  robe: color(DEFAULT_APPEARANCE.robe),
  mantle: optionalColor,
  sash: color(DEFAULT_APPEARANCE.sash),
  headcloth: optionalColor,
  build: z.enum(["adult", "child"]).optional().catch(undefined),
  hairStyle: z.enum(HAIR_STYLES).optional().catch(undefined),
});

/** An appearance with every colour a #rrggbb hex and every choice a known one; anything else takes the default. */
export function cleanAppearance(raw: unknown): Appearance {
  const parsed = isRecord(raw) ? AppearanceSchema.safeParse(raw) : null;
  const out: Appearance = parsed?.success ? { ...parsed.data } : { ...DEFAULT_APPEARANCE };
  for (const key of Object.keys(out) as (keyof Appearance)[]) if (out[key] === undefined) delete out[key];
  return out;
}

/** A new character, starting at the world clock's `clockTotal` so their needs begin fading from now. */
export function newLife(name: string, appearance: Appearance, clockTotal = 0, now = new Date()): LifeState {
  return {
    version: 1,
    name: cleanName(name) ?? "Friend",
    appearance: cleanAppearance(appearance),
    needs: { ...STARTING_NEEDS },
    relationships: {},
    counters: {},
    badges: {},
    today: { day: 0, greeted: [], messages: {} },
    clock: clampNumber(clockTotal, 0, MAX_CLOCK, 0),
    createdAt: now.toISOString(),
  };
}

/**
 * A saved life, checked field by field. Saved data may have been edited by hand or come from an older build, so
 * numbers are clamped, colours and choices validated, collections bounded, and unknown fields dropped. A damaged
 * field falls back to its default; without a version-1 object and a usable name there is no life to restore (null).
 */
export function parseLife(raw: unknown, now = new Date()): LifeState | null {
  if (!isRecord(raw) || raw.version !== 1) return null;
  const name = cleanName(raw.name);
  if (!name) return null;

  const savedNeeds = isRecord(raw.needs) ? raw.needs : {};
  const needs = Object.fromEntries(
    NEEDS.map((n) => [n, clampNumber(savedNeeds[n], 0, 100, STARTING_NEEDS[n])]),
  ) as Needs;

  const relationships = cleanRecord(raw.relationships, ID, MAX_RELATIONSHIPS, (v) =>
    typeof v === "number" && Number.isFinite(v) ? clampNumber(v, 0, 100, 0) : undefined,
  );
  const counters = cleanRecord(raw.counters, COUNTER_KEY, MAX_COUNTERS, (v) =>
    typeof v === "number" && Number.isFinite(v) ? Math.floor(clampNumber(v, 0, MAX_COUNT, 0)) : undefined,
  );
  const badges = cleanRecord(raw.badges, ID, MAX_COUNTERS, (v) => cleanIso(v) ?? undefined);
  for (const id of Object.keys(badges)) if (!getBadge(id)) delete badges[id];

  return {
    version: 1,
    name,
    appearance: cleanAppearance(raw.appearance),
    needs,
    relationships,
    counters,
    badges,
    today: cleanToday(raw.today),
    clock: clampNumber(raw.clock, 0, MAX_CLOCK, 0),
    createdAt: cleanIso(raw.createdAt) ?? now.toISOString(),
  };
}

function cleanToday(raw: unknown): DailyFriendship {
  if (!isRecord(raw)) return { day: 0, greeted: [], messages: {} };
  const greeted = Array.isArray(raw.greeted)
    ? [...new Set(raw.greeted.filter((id): id is string => typeof id === "string" && ID.test(id)))].slice(0, MAX_RELATIONSHIPS)
    : [];
  return {
    day: Math.floor(clampNumber(raw.day, 0, MAX_CLOCK / DAY_MINUTES, 0)),
    greeted,
    messages: cleanRecord(raw.messages, ID, MAX_RELATIONSHIPS, (v) =>
      typeof v === "number" && Number.isFinite(v) ? Math.floor(clampNumber(v, 0, MAX_MESSAGES_PER_DAY, 0)) : undefined,
    ),
  };
}

// ---- Reducers ----------------------------------------------------------------------------------------------------

/**
 * Bring needs up to date with the world clock (`World.clock.total`): they fade for the game time since `life.clock`,
 * at most MAX_FADE_MINUTES' worth. Needs are fractional; round them for display.
 */
export function tickLife(life: LifeState, clockTotal: number): LifeState {
  if (!Number.isFinite(clockTotal) || clockTotal === life.clock) return life;
  const elapsed = clockTotal - life.clock;
  // The clock only runs backwards when the world's own save was lost and it started again: just catch up with it.
  if (elapsed < 0) return { ...life, clock: Math.max(0, clockTotal) };
  return { ...life, needs: decayNeeds(life.needs, Math.min(elapsed, MAX_FADE_MINUTES)), clock: clockTotal };
}

/**
 * An activity the world reports as done ("activityDone"): needs change, everyone who shared it (`nearby`, from the
 * event) grows closer, and it is counted.
 */
export function applyActivity(life: LifeState, def: ActivityDef, nearbyCharacterIds: string[], clockTotal: number): LifeState {
  const ticked = tickLife(life, clockTotal);
  let relationships = ticked.relationships;
  if (def.friendship) {
    for (const id of new Set(nearbyCharacterIds)) {
      if (getCharacter(id)) relationships = addFriendship(relationships, id, def.friendship);
    }
  }
  return {
    ...ticked,
    needs: addNeeds(ticked.needs, def.needs),
    relationships,
    counters: bump(ticked.counters, def.id),
  };
}

/** The player greeted a character (opened a conversation). Friendship grows once per character per game day. */
export function recordGreeting(life: LifeState, characterId: string, day: number): LifeState {
  if (!getCharacter(characterId)) return life;
  const today = todayFor(life, day);
  if (today.greeted.includes(characterId)) return life;
  return {
    ...life,
    today: { ...today, greeted: [...today.greeted, characterId] },
    relationships: addFriendship(life.relationships, characterId, FRIENDSHIP.greeting),
    counters: bump(life.counters, `talk:${characterId}`),
  };
}

/** The player sent a character a chat message. Friendship grows with the first few each game day. */
export function recordMessage(life: LifeState, characterId: string, day: number): LifeState {
  if (!getCharacter(characterId)) return life;
  const today = todayFor(life, day);
  const sent = today.messages[characterId] ?? 0;
  return {
    ...life,
    today: { ...today, messages: { ...today.messages, [characterId]: Math.min(MAX_MESSAGES_PER_DAY, sent + 1) } },
    relationships:
      sent < FRIENDSHIP.messagesPerDay ? addFriendship(life.relationships, characterId, FRIENDSHIP.message) : life.relationships,
    counters: bump(life.counters, `message:${characterId}`),
  };
}

/** The player finished a lesson: closer to its mentor (most of all the first time), and needs by growth path. */
export function recordLessonComplete(life: LifeState, lesson: Lesson): LifeState {
  const key = `lesson:${lesson.slug}`;
  const first = !life.counters[key];
  return {
    ...life,
    needs: addNeeds(life.needs, PATH_NEEDS[lesson.pathSlug] ?? {}),
    relationships: addFriendship(life.relationships, lesson.mentorId, first ? FRIENDSHIP.lesson : FRIENDSHIP.lessonAgain),
    counters: bump(life.counters, key),
  };
}

/** The player checked in for the day (call once per new check-in). */
export function recordCheckIn(life: LifeState): LifeState {
  return { ...life, needs: addNeeds(life.needs, CHECK_IN_NEEDS), counters: bump(life.counters, "checkin") };
}

/** The player wrote a new entry in the Walk Journal (not for edits). */
export function recordJournal(life: LifeState, kind: JournalKind): LifeState {
  return { ...life, needs: addNeeds(life.needs, JOURNAL_NEEDS[kind] ?? {}), counters: bump(life.counters, `journal:${kind}`) };
}

/** Award every badge the player has just earned, stamped `nowIso`. `earned` is empty (and `life` unchanged) if none. */
export function awardBadges(
  life: LifeState,
  ctx: Omit<BadgeContext, "life">,
  nowIso: string,
): { life: LifeState; earned: BadgeDef[] } {
  const earned = newlyEarned({ ...ctx, life });
  if (earned.length === 0) return { life, earned };
  const badges = { ...life.badges };
  for (const badge of earned) badges[badge.id] = nowIso;
  return { life: { ...life, badges }, earned };
}

// ---- Helpers -----------------------------------------------------------------------------------------------------

function todayFor(life: LifeState, day: number): DailyFriendship {
  return life.today.day === day ? life.today : { day, greeted: [], messages: {} };
}

function bump(counters: Record<string, number>, key: string): Record<string, number> {
  return { ...counters, [key]: Math.min(MAX_COUNT, (counters[key] ?? 0) + 1) };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function clampNumber(v: unknown, min: number, max: number, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
}

function cleanIso(v: unknown): string | null {
  return typeof v === "string" && v.length <= ISO_MAX && Number.isFinite(Date.parse(v)) ? new Date(v).toISOString() : null;
}

/** Up to `max` entries whose keys match `key` and whose values `clean` accepts. */
function cleanRecord<T>(raw: unknown, key: RegExp, max: number, clean: (v: unknown) => T | undefined): Record<string, T> {
  const out: Record<string, T> = {};
  if (!isRecord(raw)) return out;
  let n = 0;
  for (const [k, v] of Object.entries(raw)) {
    if (n >= max) break;
    const value = key.test(k) ? clean(v) : undefined;
    if (value === undefined) continue;
    out[k] = value;
    n++;
  }
  return out;
}
