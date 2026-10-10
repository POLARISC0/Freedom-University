import { NEEDS, type BadgeContext, type BadgeDef } from "./types";
import { friendship, relationshipLevels } from "./relationships";

// Growth badges: small, gentle markers of the walk so far. Each celebrates something the player did, never how they
// compare with anyone else, and each points to the verse behind it.

const count = (ctx: BadgeContext, ...keys: string[]) => keys.reduce((sum, k) => sum + (ctx.life.counters[k] ?? 0), 0);

const lessonDone = (ctx: BadgeContext, slug: string) =>
  ctx.progress[slug]?.status === "completed" || count(ctx, `lesson:${slug}`) > 0;

/** Friendship needed for the "Friend" level. */
const friendAt = (characterId: string) => relationshipLevels(characterId).find((l) => l.label === "Friend")!.min;

const friendOf = (characterId: string) => (ctx: BadgeContext) =>
  friendship(ctx.life.relationships, characterId) >= friendAt(characterId);

/** A need at or above this counts as well tended for "With all your heart". */
export const WELL_TENDED = 70;

/** Lesson badges, one per playable lesson. */
export const LESSON_BADGES: Record<string, BadgeDef> = {
  "teach-us-to-pray": {
    id: "lesson-teach-us-to-pray",
    title: "Teach us to pray",
    description: "Walked the Prayer path with Jesus and learned the prayer He taught.",
    icon: "🙏",
    ref: "Luke 11:1",
    earned: (ctx) => lessonDone(ctx, "teach-us-to-pray"),
  },
  "out-of-the-boat": {
    id: "lesson-out-of-the-boat",
    title: "Out of the boat",
    description: "Walked the Faith path with Peter, from the end of the jetty to the fire of coals.",
    icon: "🌊",
    ref: "Matthew 14:29",
    earned: (ctx) => lessonDone(ctx, "out-of-the-boat"),
  },
  "the-widows-two-coins": {
    id: "lesson-the-widows-two-coins",
    title: "Two small coins",
    description: "Walked the Tithing & Generosity path with Matthew and saw what the widow gave.",
    icon: "🪙",
    ref: "Luke 21:2",
    earned: (ctx) => lessonDone(ctx, "the-widows-two-coins"),
  },
};

export const BADGES: BadgeDef[] = [
  ...Object.values(LESSON_BADGES),
  {
    id: "quiet-place",
    title: "A quiet place",
    description: "Prayed in the quiet place on the hillside.",
    icon: "🌄",
    ref: "Mark 1:35",
    earned: (ctx) => count(ctx, "pray") >= 1,
  },
  {
    id: "lamp-to-my-feet",
    title: "A lamp to my feet",
    description: "Read the scroll at the synagogue three times.",
    icon: "📜",
    ref: "Psalm 119:105",
    earned: (ctx) => count(ctx, "read") >= 3,
  },
  {
    id: "at-his-feet",
    title: "At His feet",
    description: "Sat and listened to Jesus teach by the sea three times.",
    icon: "👂",
    ref: "Luke 10:39",
    earned: (ctx) => count(ctx, "listen") >= 3,
  },
  {
    id: "breaking-bread",
    title: "Breaking bread",
    description: "Shared the evening meal in Peter's courtyard three times.",
    icon: "🍞",
    ref: "Acts 2:46",
    earned: (ctx) => count(ctx, "meal") >= 3,
  },
  {
    id: "one-anothers-burdens",
    title: "One another's burdens",
    description: "Lent a hand five times, at the nets or at the well.",
    icon: "🤲",
    ref: "Galatians 6:2",
    earned: (ctx) => count(ctx, "nets", "water") >= 5,
  },
  {
    id: "rest-awhile",
    title: "Rest awhile",
    description: "Took time to rest three times, in the shade or at home.",
    icon: "🌿",
    ref: "Mark 6:31",
    earned: (ctx) => count(ctx, "shade", "sleep") >= 3,
  },
  {
    id: "faithful-in-little",
    title: "Faithful in little",
    description: "Checked in on seven days.",
    icon: "🌱",
    ref: "Luke 16:10",
    earned: (ctx) => Math.max(count(ctx, "checkin"), ctx.checkIns.length) >= 7,
  },
  {
    id: "journal-keeper",
    title: "Journal keeper",
    description: "Wrote five entries in the Walk Journal, remembering what God has done.",
    icon: "📖",
    ref: "Psalm 77:11",
    earned: (ctx) =>
      Math.max(count(ctx, "journal:reflection", "journal:prayer", "journal:gratitude", "journal:note"), ctx.journal.length) >= 5,
  },
  {
    id: "friend-of-jesus",
    title: "Friend of Jesus",
    description: "Spent time with Jesus until He called you friend.",
    icon: "💛",
    ref: "John 15:15",
    earned: friendOf("jesus"),
  },
  {
    id: "friend-of-peter",
    title: "Friend of Peter",
    description: "Became friends with Peter, the fisherman.",
    icon: "🎣",
    ref: "Proverbs 27:17",
    earned: friendOf("peter"),
  },
  {
    id: "friend-of-matthew",
    title: "Friend of Matthew",
    description: "Became friends with Matthew, the tax collector who followed Jesus.",
    icon: "🤝",
    ref: "Proverbs 27:17",
    earned: friendOf("matthew"),
  },
  {
    id: "with-all-your-heart",
    title: "With all your heart",
    description: "Had all five needs well tended at the same time.",
    icon: "❤️",
    ref: "Mark 12:30",
    earned: (ctx) => NEEDS.every((n) => ctx.life.needs[n] >= WELL_TENDED),
  },
];

const BY_ID = new Map(BADGES.map((b) => [b.id, b]));

export function getBadge(id: string): BadgeDef | undefined {
  return BY_ID.get(id);
}

/** Badges the player has just earned: earned now, and not yet in `ctx.life.badges`. */
export function newlyEarned(ctx: BadgeContext): BadgeDef[] {
  return BADGES.filter((b) => !Object.hasOwn(ctx.life.badges, b.id) && b.earned(ctx));
}
