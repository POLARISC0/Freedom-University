import { describe, expect, it } from "vitest";
import { getLesson, LESSONS, PATHS } from "@/walk/content";
import {
  ACTIVITIES,
  activityEnd,
  activityMinutes,
  addFriendship,
  addNeeds,
  applyActivity,
  awardBadges,
  BADGES,
  clampNeeds,
  cleanName,
  decayNeeds,
  DECAY_PER_DAY,
  DEFAULT_APPEARANCE,
  FRIENDSHIP,
  getActivity,
  getBadge,
  inHours,
  isAvailable,
  LESSON_BADGES,
  lowestNeed,
  MAX_FADE_MINUTES,
  NEED_INFO,
  NEEDS,
  needNudge,
  newLife,
  newlyEarned,
  nextRelationshipLevel,
  parseLife,
  PATH_NEEDS,
  recordCheckIn,
  recordGreeting,
  recordJournal,
  recordLessonComplete,
  recordMessage,
  relationshipLevel,
  STARTING_NEEDS,
  tickLife,
  unavailableReason,
  type BadgeContext,
  type LifeState,
  type Needs,
} from "@/walk/life";
import type { ProgressMap } from "@/walk/progress";
import { isValidReference, parseReference } from "@/walk/scripture/references";
import { DAY_MINUTES } from "@/walk/world/clock";
import type { Weather } from "@/walk/world/types";

const clear: Weather = { kind: "clear", cloud: 0, rain: 0, fog: 0, wind: 0.2, label: "Clear" };
const at = (hour: number) => hour * 60;
const needs = (n: Partial<Needs>): Needs => ({ ...STARTING_NEEDS, ...n });
const activity = (id: string) => getActivity(id)!;

/** Freeze a life all the way down, so a reducer that mutates its input throws. */
function frozen(life: LifeState): LifeState {
  const freeze = (o: object) => {
    Object.values(o).forEach((v) => v && typeof v === "object" && freeze(v));
    return Object.freeze(o);
  };
  return freeze(structuredClone(life)) as LifeState;
}

const base = () => newLife("Miriam", DEFAULT_APPEARANCE, 0, new Date("2026-10-10T12:00:00Z"));

describe("needs", () => {
  it("describes all five, each pointing to a passage", () => {
    expect(Object.keys(NEED_INFO)).toEqual([...NEEDS]);
    for (const n of NEEDS) {
      const info = NEED_INFO[n];
      expect(info.id).toBe(n);
      expect(info.color).toMatch(/^#[0-9a-f]{6}$/);
      expect(info.summary).toContain(`(${info.ref})`);
      const ref = parseReference(info.ref);
      expect(ref && isValidReference(ref), info.ref).toBe(true);
    }
  });

  it("clamps to 0..100 and treats non-numbers as empty", () => {
    expect(clampNeeds({ prayer: 120, word: -5, fellowship: Number.NaN, service: 50.5, rest: Infinity })).toEqual({
      prayer: 100,
      word: 0,
      fellowship: 0,
      service: 50.5,
      rest: 0,
    });
    expect(addNeeds(needs({ prayer: 90, rest: 3 }), { prayer: 25, rest: -8 })).toEqual(needs({ prayer: 100, rest: 0 }));
  });

  it("fades gently with game time, rest a little faster, never below zero", () => {
    const full = needs({ prayer: 100, word: 100, fellowship: 100, service: 100, rest: 100 });
    const day = decayNeeds(full, DAY_MINUTES);
    for (const n of NEEDS) {
      expect(100 - day[n]).toBeCloseTo(DECAY_PER_DAY[n]);
      expect(DECAY_PER_DAY[n]).toBeGreaterThanOrEqual(15);
      expect(DECAY_PER_DAY[n]).toBeLessThanOrEqual(25);
    }
    expect(100 - day.rest).toBeGreaterThan(100 - day.prayer);
    expect(decayNeeds(full, 30 * DAY_MINUTES)).toEqual(needs({ prayer: 0, word: 0, fellowship: 0, service: 0, rest: 0 }));
    expect(decayNeeds(full, -50)).toEqual(full);
  });

  it("finds the need that could use the most care", () => {
    expect(lowestNeed(needs({ service: 12 }))).toBe("service");
    // A tie goes to the first in order.
    expect(lowestNeed(needs({}))).toBe("prayer");
  });

  it("nudges kindly, only when a need runs low, with a verse to carry", () => {
    expect(needNudge(needs({ rest: 40 }))).toBeNull();
    const nudge = needNudge(needs({ word: 30, rest: 20 }))!;
    expect(nudge.need).toBe("rest");
    expect(nudge.text).toMatch(/fig tree|house/);
    expect(nudge.passage.ref).toBe("Matthew 11:28");
    // Encouraging, never guilt.
    for (const n of NEEDS) {
      const text = needNudge(needs({ [n]: 0 }))!.text;
      expect(text).not.toMatch(/\b(should|must|fail|neglect|guilt|ashamed|behind)\b/i);
    }
  });
});

describe("activities", () => {
  it("each has a unique id, a pose, gains, and a passage", () => {
    const ids = ACTIVITIES.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(expect.arrayContaining(["pray", "read", "listen", "meal", "nets", "water", "shade", "sleep"]));
    for (const a of ACTIVITIES) {
      expect(getActivity(a.id)).toBe(a);
      expect(a.seconds).toBeGreaterThan(0);
      expect(Object.values(a.needs).some((v) => v > 0), a.id).toBe(true);
      const ref = parseReference(a.passage.ref);
      expect(ref && isValidReference(ref), a.passage.ref).toBe(true);
    }
    expect(getActivity("dance")).toBeUndefined();
  });

  it("feeds the need it is about", () => {
    expect(activity("pray").needs.prayer).toBeGreaterThan(0);
    expect(activity("read").needs.word).toBeGreaterThan(0);
    expect(activity("listen").needs.word).toBeGreaterThan(0);
    expect(activity("meal").needs.fellowship).toBeGreaterThan(0);
    expect(activity("nets").needs.service).toBeGreaterThan(0);
    expect(activity("nets").needs.rest).toBeLessThan(0);
    expect(activity("water").needs.service).toBeGreaterThan(0);
    expect(activity("shade").needs.rest).toBeGreaterThan(0);
    expect(activity("sleep").needs.rest).toBeGreaterThanOrEqual(50);
  });

  it("checks hour ranges, including ones that wrap midnight", () => {
    expect(inHours(undefined, 3)).toBe(true);
    expect(inHours([[6, 19]], 18.99)).toBe(true);
    expect(inHours([[6, 19]], 19)).toBe(false);
    expect(inHours([[20, 5]], 23)).toBe(true);
    expect(inHours([[20, 5]], 4.5)).toBe(true);
    expect(inHours([[20, 5]], 12)).toBe(false);
  });

  it("is available by the hour", () => {
    expect(isAvailable(activity("pray"), at(3), clear)).toBe(true);
    expect(isAvailable(activity("read"), at(10), clear)).toBe(true);
    expect(isAvailable(activity("read"), at(2), clear)).toBe(false);
    expect(isAvailable(activity("meal"), at(19), clear)).toBe(true);
    expect(isAvailable(activity("meal"), at(12), clear)).toBe(false);
    expect(isAvailable(activity("nets"), at(6), clear)).toBe(true);
    expect(isAvailable(activity("nets"), at(14), clear)).toBe(false);
    expect(isAvailable(activity("shade"), at(13), clear)).toBe(true);
    expect(isAvailable(activity("shade"), at(22), clear)).toBe(false);
    expect(isAvailable(activity("sleep"), at(23), clear)).toBe(true);
    expect(isAvailable(activity("sleep"), at(1), clear)).toBe(true);
    expect(isAvailable(activity("sleep"), at(13), clear)).toBe(false);
  });

  it("is available by the weather", () => {
    expect(isAvailable(activity("nets"), at(7), { kind: "windy" })).toBe(false);
    expect(isAvailable(activity("nets"), at(7), { kind: "rain" })).toBe(true);
    expect(isAvailable(activity("shade"), at(12), { kind: "rain" })).toBe(false);
    expect(isAvailable(activity("read"), at(12), { kind: "rain" })).toBe(true);
  });

  it("says why not, in a sentence", () => {
    expect(unavailableReason(activity("read"), at(2), clear)).toMatch(/closed for the night/);
    expect(unavailableReason(activity("nets"), at(7), { kind: "windy" })).toMatch(/wind/);
    expect(unavailableReason(activity("shade"), at(12), { kind: "rain" })).toMatch(/rain/);
    expect(unavailableReason(activity("pray"), at(12), { kind: "rain" })).toBeNull();
    for (const a of ACTIVITIES) if (a.hours) expect(a.closedNote, a.id).toBeTruthy();
  });

  it("sleeps until morning, across midnight if need be", () => {
    expect(activityMinutes(activity("sleep"), at(22))).toBe(8 * 60);
    expect(activityMinutes(activity("sleep"), at(2))).toBe(4 * 60);
    expect(activityMinutes(activity("pray"), at(2))).toBe(30);
    // Exactly six o'clock, whatever odd minute it started at.
    expect(activityEnd(activity("sleep"), 3 * DAY_MINUTES + at(22) + 0.37)).toBe(4 * DAY_MINUTES + at(6));
    expect(activityEnd(activity("sleep"), 3 * DAY_MINUTES + at(2) + 0.37)).toBe(3 * DAY_MINUTES + at(6));
    expect(activityEnd(activity("pray"), 1000)).toBe(1030);
  });
});

describe("relationships", () => {
  it("grows through five levels", () => {
    expect(relationshipLevel("peter", 0).label).toBe("Newly met");
    expect(relationshipLevel("peter", 12).label).toBe("Acquaintance");
    expect(relationshipLevel("peter", 30).label).toBe("Friend");
    expect(relationshipLevel("peter", 60).label).toBe("Close friend");
    expect(relationshipLevel("peter", 100).label).toBe("Like family");
    expect(nextRelationshipLevel("peter", 20)?.label).toBe("Friend");
    expect(nextRelationshipLevel("peter", 100)).toBeNull();
  });

  it("describes friendship with Jesus in His own words", () => {
    expect(relationshipLevel("jesus", 35).description).toContain("I have called you friends");
    expect(relationshipLevel("jesus", 35).description).toContain("John 15:15");
    expect(relationshipLevel("jesus", 90).description).toContain("Mark 3:35");
  });

  it("adds friendship without changing the original, kept within 0..100", () => {
    const rel = Object.freeze({ peter: 95 });
    expect(addFriendship(rel, "peter", 10)).toEqual({ peter: 100 });
    expect(addFriendship(rel, "john", 3)).toEqual({ peter: 95, john: 3 });
    expect(addFriendship(rel, "peter", -200)).toEqual({ peter: 0 });
    expect(addFriendship(rel, "peter", Number.NaN)).toEqual({ peter: 95 });
    expect(rel).toEqual({ peter: 95 });
  });
});

describe("badges", () => {
  const ctx = (life: LifeState, extra: Partial<BadgeContext> = {}): BadgeContext => ({
    life,
    progress: {},
    journal: [],
    checkIns: [],
    ...extra,
  });

  it("are about a dozen, each with an icon and a valid verse", () => {
    expect(BADGES.length).toBeGreaterThanOrEqual(10);
    expect(new Set(BADGES.map((b) => b.id)).size).toBe(BADGES.length);
    for (const b of BADGES) {
      expect(getBadge(b.id)).toBe(b);
      expect(b.icon).toBeTruthy();
      const ref = parseReference(b.ref);
      expect(ref && isValidReference(ref), b.ref).toBe(true);
    }
    for (const lesson of LESSONS) expect(LESSON_BADGES[lesson.slug], lesson.slug).toBeDefined();
  });

  it("start with none", () => {
    expect(newlyEarned(ctx(base()))).toEqual([]);
  });

  it("celebrate first prayers, habits and finished lessons", () => {
    let life = base();
    life = applyActivity(life, activity("pray"), [], 0);
    expect(newlyEarned(ctx(life)).map((b) => b.id)).toEqual(["quiet-place"]);
    for (let i = 0; i < 3; i++) life = applyActivity(life, activity("meal"), [], 0);
    expect(newlyEarned(ctx(life)).map((b) => b.id)).toContain("breaking-bread");
    const progress: ProgressMap = {
      "teach-us-to-pray": {
        lessonSlug: "teach-us-to-pray",
        stepIndex: 9,
        status: "completed",
        choices: {},
        challengeAcceptedAt: null,
        challengeDoneAt: null,
        completedAt: "2026-10-10T12:00:00.000Z",
      },
    };
    expect(newlyEarned(ctx(life, { progress })).map((b) => b.id)).toContain("lesson-teach-us-to-pray");
  });

  it("count check-ins and journal entries", () => {
    const checkIns = Array.from({ length: 7 }, (_, i) => ({ day: `2026-10-0${i + 1}`, mood: "peaceful" as const, note: null }));
    expect(newlyEarned(ctx(base(), { checkIns })).map((b) => b.id)).toEqual(["faithful-in-little"]);
    const sameDay = Array.from({ length: 7 }, () => ({ day: "2026-10-01", mood: "joyful" as const, note: null }));
    expect(newlyEarned(ctx(base(), { checkIns: sameDay }))).toEqual([]);
    let life = base();
    for (let i = 0; i < 5; i++) life = recordJournal(life, i % 2 ? "prayer" : "gratitude");
    expect(newlyEarned(ctx(life)).map((b) => b.id)).toEqual(["journal-keeper"]);
  });

  it("mark friendship with Jesus, Peter and Matthew", () => {
    const life = { ...base(), relationships: { jesus: 30, peter: 29, matthew: 80 } };
    expect(newlyEarned(ctx(life)).map((b) => b.id)).toEqual(["friend-of-jesus", "friend-of-matthew"]);
  });

  it("notice all five needs well tended at once", () => {
    const life = { ...base(), needs: needs({ prayer: 80, word: 75, fellowship: 70, service: 90, rest: 70 }) };
    expect(newlyEarned(ctx(life)).map((b) => b.id)).toEqual(["with-all-your-heart"]);
    expect(newlyEarned(ctx({ ...life, needs: { ...life.needs, rest: 69 } }))).toEqual([]);
  });

  it("are awarded once, stamped with the time", () => {
    const life = frozen(applyActivity(base(), activity("pray"), [], 0));
    const first = awardBadges(life, { progress: {}, journal: [], checkIns: [] }, "2026-10-10T13:00:00.000Z");
    expect(first.earned.map((b) => b.id)).toEqual(["quiet-place"]);
    expect(first.life.badges).toEqual({ "quiet-place": "2026-10-10T13:00:00.000Z" });
    const again = awardBadges(first.life, { progress: {}, journal: [], checkIns: [] }, "2026-10-11T13:00:00.000Z");
    expect(again.earned).toEqual([]);
    expect(again.life).toBe(first.life);
  });
});

describe("a new life", () => {
  it("starts with a name, a look and room to grow", () => {
    const life = newLife("  Miriam   of Magdala ", { ...DEFAULT_APPEARANCE, robe: "#AABBCC" }, 420);
    expect(life.version).toBe(1);
    expect(life.name).toBe("Miriam of Magdala");
    expect(life.appearance.robe).toBe("#aabbcc");
    expect(life.needs).toEqual(STARTING_NEEDS);
    expect(life.relationships).toEqual({});
    expect(life.clock).toBe(420);
    expect(Date.parse(life.createdAt)).not.toBeNaN();
  });

  it("tidies names, refusing empty or overlong ones", () => {
    expect(cleanName("  Ruth ")).toBe("Ruth");
    expect(cleanName("Ru\u0000th\u202e")).toBe("Ruth");
    expect(cleanName("   ")).toBeNull();
    expect(cleanName("x".repeat(41))).toBeNull();
    expect(cleanName("x".repeat(40))).toHaveLength(40);
    expect(cleanName(42)).toBeNull();
  });
});

describe("parseLife", () => {
  const saved = () => JSON.parse(JSON.stringify(applyActivity(recordGreeting(base(), "peter", 0), activity("pray"), ["jesus"], 600)));

  it("restores a saved life exactly", () => {
    const life = applyActivity(recordGreeting(base(), "peter", 0), activity("pray"), ["jesus"], 600);
    expect(parseLife(JSON.parse(JSON.stringify(life)))).toEqual(life);
  });

  it("refuses anything that isn't a version-1 life with a name", () => {
    for (const raw of [null, undefined, 42, "life", [], {}, { ...saved(), version: 2 }, { ...saved(), name: "" }, { ...saved(), name: "x".repeat(41) }, { ...saved(), name: { first: "A" } }]) {
      expect(parseLife(raw)).toBeNull();
    }
  });

  it("clamps numbers and falls back for ones that aren't", () => {
    const life = parseLife({
      ...saved(),
      needs: { prayer: 1e9, word: -4, fellowship: "100", service: null, rest: 33.3 },
      clock: -50,
      relationships: { peter: 500, john: -3, thomas: "lots", andrew: Number.NaN },
    })!;
    expect(life.needs).toEqual({ prayer: 100, word: 0, fellowship: STARTING_NEEDS.fellowship, service: STARTING_NEEDS.service, rest: 33.3 });
    expect(life.clock).toBe(0);
    expect(life.relationships).toEqual({ peter: 100, john: 0 });
  });

  it("only accepts #rrggbb colours and known choices in an appearance", () => {
    const life = parseLife({
      ...saved(),
      appearance: {
        skin: "red; background: url(javascript:alert(1))",
        hair: "#123ABC",
        beard: "enormous",
        robe: "#12345",
        sash: "#00ff00",
        mantle: "url(x)",
        headcloth: "#abcdef",
        hairStyle: "mohawk",
        build: "giant",
        grey: "yes",
        extra: "<script>",
      },
    })!;
    expect(life.appearance).toEqual({
      skin: DEFAULT_APPEARANCE.skin,
      hair: "#123abc",
      beard: DEFAULT_APPEARANCE.beard,
      robe: DEFAULT_APPEARANCE.robe,
      sash: "#00ff00",
      headcloth: "#abcdef",
    });
    expect(parseLife({ ...saved(), appearance: "plain" })!.appearance).toEqual(DEFAULT_APPEARANCE);
  });

  it("bounds the size of every collection and the shape of every key", () => {
    const counters: Record<string, unknown> = { "Bad Key": 3, "talk:peter": 2.7, pray: 1e12 };
    for (let i = 0; i < 5000; i++) counters[`c${i}`] = i;
    const relationships: Record<string, number> = {};
    for (let i = 0; i < 500; i++) relationships[`friend-${i}`] = 10;
    const life = parseLife({ ...saved(), counters, relationships })!;
    expect(Object.keys(life.counters).length).toBeLessThanOrEqual(256);
    expect(life.counters["Bad Key"]).toBeUndefined();
    expect(life.counters["talk:peter"]).toBe(2);
    expect(life.counters.pray).toBe(1_000_000);
    expect(Object.keys(life.relationships).length).toBeLessThanOrEqual(64);
  });

  it("can't be used to reach the object prototype", () => {
    const raw = JSON.parse(
      `{"version":1,"name":"Eli","__proto__":{"polluted":true},"counters":{"__proto__":{"polluted":true},"constructor":5},"relationships":{"__proto__":50}}`,
    );
    const life = parseLife(raw)!;
    expect(Object.getPrototypeOf(life.counters)).toBe(Object.prototype);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    expect(life.counters.constructor).toBe(5);
    expect(Object.keys(life.relationships)).toEqual([]);
  });

  it("keeps only known badges with real dates", () => {
    const life = parseLife({
      ...saved(),
      badges: { "quiet-place": "2026-10-10T13:00:00.000Z", "made-up": "2026-10-10T13:00:00.000Z", "breaking-bread": "yesterday" },
      createdAt: "not a date",
    }, new Date("2026-01-01T00:00:00Z"))!;
    expect(life.badges).toEqual({ "quiet-place": "2026-10-10T13:00:00.000Z" });
    expect(life.createdAt).toBe("2026-01-01T00:00:00.000Z");
  });

  it("sanitises today's friendship record", () => {
    const life = parseLife({
      ...saved(),
      today: { day: 3.7, greeted: ["peter", "peter", 5, "BAD ID", "john"], messages: { peter: 9999999, "<x>": 1 } },
    })!;
    expect(life.today).toEqual({ day: 3, greeted: ["peter", "john"], messages: { peter: 10_000 } });
    expect(parseLife({ ...saved(), today: "today" })!.today).toEqual({ day: 0, greeted: [], messages: {} });
  });
});

describe("life reducers", () => {
  it("tickLife fades needs for the game time since it last ran", () => {
    const life = frozen(base());
    expect(tickLife(life, 0)).toBe(life);
    const later = tickLife(life, DAY_MINUTES / 2);
    expect(later.clock).toBe(DAY_MINUTES / 2);
    expect(later.needs.prayer).toBeCloseTo(STARTING_NEEDS.prayer - DECAY_PER_DAY.prayer / 2);
    expect(life.needs).toEqual(STARTING_NEEDS);
  });

  it("tickLife fades only gently after a long gap", () => {
    const life = tickLife(base(), 50 * DAY_MINUTES);
    expect(life.needs).toEqual(decayNeeds(STARTING_NEEDS, MAX_FADE_MINUTES));
    expect(life.needs.prayer).toBeGreaterThan(35);
  });

  it("tickLife catches up with a clock that started again, without fading", () => {
    const life = { ...base(), clock: 5000 };
    const caught = tickLife(life, 100);
    expect(caught.clock).toBe(100);
    expect(caught.needs).toEqual(life.needs);
    expect(tickLife(life, Number.NaN)).toBe(life);
  });

  it("applyActivity changes needs, counts it, and draws the people who shared it closer", () => {
    const life = frozen(base());
    const after = applyActivity(life, activity("meal"), ["jesus", "peter", "peter", "widow", "nobody"], 0);
    expect(after.needs.fellowship).toBe(STARTING_NEEDS.fellowship + activity("meal").needs.fellowship!);
    expect(after.counters.meal).toBe(1);
    expect(after.relationships).toEqual({ jesus: activity("meal").friendship, peter: activity("meal").friendship });
  });

  it("applyActivity brings needs up to date before adding the gains", () => {
    const after = applyActivity(base(), activity("sleep"), [], DAY_MINUTES / 3);
    const expected = addNeeds(decayNeeds(STARTING_NEEDS, DAY_MINUTES / 3), activity("sleep").needs);
    expect(after.needs).toEqual(expected);
    expect(after.clock).toBe(DAY_MINUTES / 3);
  });

  it("recordGreeting counts once per character per game day", () => {
    const life = frozen(base());
    const once = recordGreeting(life, "peter", 0);
    expect(once.relationships.peter).toBe(FRIENDSHIP.greeting);
    expect(once.counters["talk:peter"]).toBe(1);
    expect(recordGreeting(once, "peter", 0)).toBe(once);
    const nextDay = recordGreeting(once, "peter", 1);
    expect(nextDay.relationships.peter).toBe(2 * FRIENDSHIP.greeting);
    expect(nextDay.today).toEqual({ day: 1, greeted: ["peter"], messages: {} });
    expect(recordGreeting(life, "widow", 0)).toBe(life);
  });

  it("recordMessage grows friendship with the first few messages each day", () => {
    let life = frozen(base());
    for (let i = 0; i < FRIENDSHIP.messagesPerDay + 4; i++) life = recordMessage(life, "matthew", 2);
    expect(life.relationships.matthew).toBe(FRIENDSHIP.messagesPerDay * FRIENDSHIP.message);
    expect(life.counters["message:matthew"]).toBe(FRIENDSHIP.messagesPerDay + 4);
    life = recordMessage(life, "matthew", 3);
    expect(life.relationships.matthew).toBe((FRIENDSHIP.messagesPerDay + 1) * FRIENDSHIP.message);
  });

  it("recordLessonComplete draws the mentor closer and feeds needs by path", () => {
    const prayer = getLesson("teach-us-to-pray")!;
    const faith = getLesson("out-of-the-boat")!;
    const tithing = getLesson("the-widows-two-coins")!;
    const life = frozen(base());
    const prayed = recordLessonComplete(life, prayer);
    expect(prayed.relationships.jesus).toBe(FRIENDSHIP.lesson);
    expect(prayed.needs.prayer).toBe(STARTING_NEEDS.prayer + 30);
    expect(recordLessonComplete(prayed, prayer).relationships.jesus).toBe(FRIENDSHIP.lesson + FRIENDSHIP.lessonAgain);
    const faithful = recordLessonComplete(life, faith);
    expect(faithful.relationships.peter).toBe(FRIENDSHIP.lesson);
    expect(faithful.needs.word).toBeGreaterThan(STARTING_NEEDS.word);
    expect(faithful.needs.fellowship).toBeGreaterThan(STARTING_NEEDS.fellowship);
    const generous = recordLessonComplete(life, tithing);
    expect(generous.relationships.matthew).toBe(FRIENDSHIP.lesson);
    expect(generous.needs.service).toBeGreaterThan(STARTING_NEEDS.service);
    for (const path of PATHS) expect(PATH_NEEDS[path.slug], path.slug).toBeDefined();
  });

  it("recordCheckIn and recordJournal count and lift prayer or the Word", () => {
    const life = frozen(base());
    const checked = recordCheckIn(life);
    expect(checked.counters.checkin).toBe(1);
    expect(checked.needs.prayer).toBeGreaterThan(life.needs.prayer);
    const prayed = recordJournal(life, "prayer");
    expect(prayed.counters["journal:prayer"]).toBe(1);
    expect(prayed.needs.prayer).toBeGreaterThan(life.needs.prayer);
    expect(recordJournal(life, "reflection").needs.word).toBeGreaterThan(life.needs.word);
  });
});
