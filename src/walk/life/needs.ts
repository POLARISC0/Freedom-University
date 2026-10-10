import { DAY_MINUTES } from "@/walk/world/clock";
import { NEEDS, type Need, type NeedInfo, type NeedNudge, type Needs } from "./types";

// The five spiritual needs: what each one is, how they gently fade with game time, and a kind word when one runs
// low. Needs are an invitation, never a score: they fade slowly, never below zero, and the nudge only ever suggests.

export const NEED_INFO: Record<Need, NeedInfo> = {
  prayer: {
    id: "prayer",
    label: "Prayer",
    icon: "🙏",
    color: "#8f7fd6",
    summary: "Jesus often withdrew from the crowds to quiet places to pray (Luke 5:16).",
    ref: "Luke 5:16",
    hint: "Pray in the quiet place on the hillside, at any hour.",
  },
  word: {
    id: "word",
    label: "Word",
    icon: "📜",
    color: "#d9a441",
    summary: "\"Man shall not live by bread alone, but by every word that proceeds out of God's mouth\" (Matthew 4:4).",
    ref: "Matthew 4:4",
    hint: "Read the scroll at the synagogue by day, or sit and listen while Jesus teaches by the shore.",
  },
  fellowship: {
    id: "fellowship",
    label: "Fellowship",
    icon: "🍞",
    color: "#d0705c",
    summary: "The first believers kept to \"fellowship, in the breaking of bread, and prayer\" (Acts 2:42).",
    ref: "Acts 2:42",
    hint: "Share the evening meal in Peter's courtyard, and stop to talk with the people you meet.",
  },
  service: {
    id: "service",
    label: "Service",
    icon: "🤲",
    color: "#5f9e6e",
    summary: "Jesus \"came not to be served, but to serve\" (Mark 10:45).",
    ref: "Mark 10:45",
    hint: "Help the fishermen with their nets in the morning, or carry water at the well for your neighbours.",
  },
  rest: {
    id: "rest",
    label: "Rest",
    icon: "🌙",
    color: "#5b8fc9",
    summary: "Jesus told His tired friends to \"come apart into a deserted place, and rest awhile\" (Mark 6:31).",
    ref: "Mark 6:31",
    hint: "Sit in the shade of the fig tree by day, and sleep at your house at night.",
  },
};

/** Where every need starts for a new character: a good start, with room to grow. */
export const STARTING_NEEDS: Needs = { prayer: 60, word: 60, fellowship: 60, service: 60, rest: 60 };

/**
 * How much each need fades over one game day (12 real minutes) of play. Rest fades a little faster, because the
 * player is awake and walking; sleeping gives it back.
 */
export const DECAY_PER_DAY: Needs = { prayer: 16, word: 16, fellowship: 16, service: 15, rest: 22 };

/** Below this, a need earns a gentle nudge. */
export const NUDGE_BELOW = 35;

const clamp = (n: number) => (Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : 0);

/** Every need within 0..100 (anything that isn't a number counts as 0). */
export function clampNeeds(needs: Needs): Needs {
  return Object.fromEntries(NEEDS.map((n) => [n, clamp(needs[n])])) as Needs;
}

/** Needs after a change: gains are positive, costs negative. */
export function addNeeds(needs: Needs, delta: Partial<Needs>): Needs {
  return clampNeeds(Object.fromEntries(NEEDS.map((n) => [n, needs[n] + (delta[n] ?? 0)])) as Needs);
}

/** Needs after `gameMinutes` of game time: a gentle, steady fade that stops at zero. */
export function decayNeeds(needs: Needs, gameMinutes: number): Needs {
  const days = Math.max(0, Number.isFinite(gameMinutes) ? gameMinutes : 0) / DAY_MINUTES;
  return clampNeeds(Object.fromEntries(NEEDS.map((n) => [n, needs[n] - DECAY_PER_DAY[n] * days])) as Needs);
}

/** The need that could use the most care right now (the first in NEEDS order on a tie). */
export function lowestNeed(needs: Needs): Need {
  return NEEDS.reduce((low, n) => (needs[n] < needs[low] ? n : low), NEEDS[0]);
}

const NUDGES: Record<Need, Omit<NeedNudge, "need">> = {
  prayer: {
    text: "Your Father is always glad to hear from you. The quiet place on the hillside is open whenever you are.",
    passage: { ref: "James 4:8", text: "Draw near to God, and he will draw near to you." },
  },
  word: {
    text: "There's a scroll waiting at the synagogue, and most days Jesus teaches by the shore. Come and listen.",
    passage: { ref: "Psalm 119:103", text: "How sweet are your promises to my taste, more than honey to my mouth!" },
  },
  fellowship: {
    text: "There's room at Peter's table tonight. Say hello to someone on the way.",
    passage: { ref: "Psalm 133:1", text: "See how good and how pleasant it is for brothers to live together in unity!" },
  },
  service: {
    text: "The fishermen could use a hand with the nets in the morning, and the well is never far away.",
    passage: { ref: "Galatians 5:13", text: "through love be servants to one another." },
  },
  rest: {
    text: "You've been busy. Find some shade under the fig tree, or turn in early at your house tonight.",
    passage: { ref: "Matthew 11:28", text: "Come to me, all you who labor and are heavily burdened, and I will give you rest." },
  },
};

/** A kind suggestion for the lowest need when it has run low, or null when all is well. */
export function needNudge(needs: Needs): NeedNudge | null {
  const need = lowestNeed(needs);
  return needs[need] < NUDGE_BELOW ? { need, ...NUDGES[need] } : null;
}

/** Every nudge, for the Scripture tests. */
export function allNudges(): NeedNudge[] {
  return NEEDS.map((need) => ({ need, ...NUDGES[need] }));
}
