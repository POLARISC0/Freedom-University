import type { Appearance, Passage } from "@/walk/content";
import type { CheckInView, JournalEntryView, ProgressMap } from "@/walk/progress";
import type { Pose, WeatherKind } from "@/walk/world/types";

// The player's life in the world, Sims-style but reimagined spiritually: five needs that grow when the player
// prays, reads, spends time with others, serves and rests; friendships with the characters; and growth badges.
// Everything here is plain data with pure functions over it, so it is easy to test and to save anywhere.

export const NEEDS = ["prayer", "word", "fellowship", "service", "rest"] as const;
export type Need = (typeof NEEDS)[number];
/** Each need is 0..100. */
export type Needs = Record<Need, number>;

export interface NeedInfo {
  id: Need;
  label: string;
  /** A single emoji for the HUD. */
  icon: string;
  /** CSS colour for the meter. */
  color: string;
  /** One sentence on why it matters, with a reference, e.g. "Jesus often withdrew to pray (Luke 5:16)." */
  summary: string;
  /** Where the reference points, e.g. "Luke 5:16". */
  ref: string;
  /** How to grow it in the game, e.g. "Pray in the quiet place on the hillside." */
  hint: string;
}

export interface ActivityDef {
  id: string;
  /** The button, e.g. "Pray here". */
  action: string;
  /** What the player is doing while it runs, for the activity bar, e.g. "Praying in the quiet place". */
  doing: string;
  /** What the toast says afterwards, e.g. "You spent time in prayer." */
  done: string;
  /** What the player's character does while it runs. */
  pose: Pose;
  /** Real seconds it takes on screen. */
  seconds: number;
  /** Game minutes that pass while doing it (ignored when `untilHour` is set). */
  minutes: number;
  /** Jump the clock forward to this hour (sleeping until morning). */
  untilHour?: number;
  /** How the needs change. Gains are positive; something tiring may cost a little rest. */
  needs: Partial<Needs>;
  /** Game hours when it can be done, as [from, to) ranges that may wrap midnight. Omitted: any time. */
  hours?: [number, number][];
  /** Why it can't be done outside those hours, e.g. "The synagogue opens again at sunrise." */
  closedNote?: string;
  /** Weather it can't be done in. */
  notIn?: WeatherKind[];
  /** Only while this character is there, settled within reach of the spot (Jesus, for listening to Him teach). */
  withCharacter?: string;
  /** Friendship each character within reach gains when the player does this alongside them. */
  friendship?: number;
  /** Shown when it's done: Scripture behind the activity (exact World English Bible wording, test-checked). */
  passage: Passage;
}

/** A kind word when a need has run low: what to do about it, and a verse to carry. */
export interface NeedNudge {
  need: Need;
  text: string;
  passage: Passage;
}

/** characterId -> friendship 0..100. */
export type Relationships = Record<string, number>;

export interface RelationshipLevel {
  /** Lowest friendship value for this level. */
  min: number;
  label: string;
  /** One sentence for the character panel. */
  description: string;
}

export interface LifeState {
  version: 1;
  /** The name the player chose; the characters call them by it. */
  name: string;
  appearance: Appearance;
  needs: Needs;
  relationships: Relationships;
  /**
   * How many times the player has done things, for badges and gentle milestones. Keys are activity ids,
   * "talk:<characterId>", "message:<characterId>", "lesson:<slug>", "checkin", "journal:<kind>".
   */
  counters: Record<string, number>;
  /** Badge id -> ISO time it was earned. */
  badges: Record<string, string>;
  /** Friendship already gained on the current game day, so greetings and chat only count so much per day. */
  today: DailyFriendship;
  /** Game time the needs were last brought up to date: total game minutes since the walk began. */
  clock: number;
  /** ISO time the character was created. */
  createdAt: string;
}

export interface DailyFriendship {
  /** The game day (WorldClock.day) these belong to. */
  day: number;
  /** Characters already greeted today. */
  greeted: string[];
  /** characterId -> chat messages sent today. */
  messages: Record<string, number>;
}

export interface BadgeContext {
  life: LifeState;
  progress: ProgressMap;
  journal: JournalEntryView[];
  checkIns: CheckInView[];
}

export interface BadgeDef {
  id: string;
  title: string;
  /** What earned it, in a sentence. */
  description: string;
  icon: string;
  /** The verse behind it, e.g. "John 15:15". */
  ref: string;
  earned(ctx: BadgeContext): boolean;
}
