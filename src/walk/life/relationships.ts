import type { RelationshipLevel, Relationships } from "./types";

// Friendships with the characters. They grow with time spent together: saying hello, talking, walking a lesson with
// a mentor, and doing things side by side. They never go down; a friend you haven't seen in a while is still a
// friend.

/** How much friendship each kind of time together is worth, out of 100. */
export const FRIENDSHIP = {
  /** Saying hello: counts once per character per game day. */
  greeting: 3,
  /** Each chat message to a character... */
  message: 1,
  /** ...up to this many messages per character per game day. */
  messagesPerDay: 5,
  /** Finishing a lesson with its mentor for the first time. */
  lesson: 20,
  /** Walking a finished lesson again. */
  lessonAgain: 4,
  // Doing an activity alongside someone adds that activity's own `friendship` (ActivityDef.friendship).
} as const;

const LEVELS: RelationshipLevel[] = [
  { min: 0, label: "Newly met", description: "You've only just met. Stop and say hello." },
  { min: 12, label: "Acquaintance", description: "You know each other's names and a little of each other's story." },
  { min: 30, label: "Friend", description: "\"A friend loves at all times\" (Proverbs 17:17)." },
  { min: 55, label: "Close friend", description: "\"There is a friend who sticks closer than a brother\" (Proverbs 18:24)." },
  { min: 80, label: "Like family", description: "Brothers and sisters who do the will of God together (Mark 3:35)." },
];

// With Jesus the steps are the same, described in His own words.
const JESUS_LEVELS: RelationshipLevel[] = [
  { min: 0, label: "Newly met", description: "He turns and asks what you are looking for (John 1:38)." },
  { min: 12, label: "Following", description: "\"Come after me,\" He said, and you came (Mark 1:17)." },
  { min: 30, label: "Friend", description: "\"But I have called you friends\" (John 15:15)." },
  { min: 55, label: "Close friend", description: "\"My sheep hear my voice, and I know them, and they follow me\" (John 10:27)." },
  {
    min: 80,
    label: "Like family",
    description: "\"Whoever does the will of God is my brother, my sister, and mother\" (Mark 3:35).",
  },
];

/** The friendship levels for a character, lowest first. */
export function relationshipLevels(characterId: string): RelationshipLevel[] {
  return characterId === "jesus" ? JESUS_LEVELS : LEVELS;
}

/** Where a friendship stands. */
export function relationshipLevel(characterId: string, value: number): RelationshipLevel {
  const levels = relationshipLevels(characterId);
  return levels.findLast((l) => value >= l.min) ?? levels[0];
}

/** The next level to grow into, or null at the top. */
export function nextRelationshipLevel(characterId: string, value: number): RelationshipLevel | null {
  return relationshipLevels(characterId).find((l) => l.min > value) ?? null;
}

/** Friendship with a character, 0 for someone not yet met. */
export function friendship(rel: Relationships, characterId: string): number {
  return Object.hasOwn(rel, characterId) ? rel[characterId] : 0;
}

/** Relationships after a friendship grows (or, with a negative amount, shrinks), kept within 0..100. */
export function addFriendship(rel: Relationships, characterId: string, amount: number): Relationships {
  const value = Math.min(100, Math.max(0, friendship(rel, characterId) + (Number.isFinite(amount) ? amount : 0)));
  return { ...rel, [characterId]: value };
}
