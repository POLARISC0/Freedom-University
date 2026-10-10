import { describe, expect, it } from "vitest";
import { getLesson, LESSONS } from "@/walk/content";
import { ambientLight, lampLevel, timeOfDayLabel, WorldClock } from "@/walk/world/clock";
import { collides, WalkGrid } from "@/walk/world/grid";
import { buildCapernaum } from "@/walk/world/maps/capernaum";
import { findPath } from "@/walk/world/pathfind";
import { mentorSpotForStep, storyState } from "@/walk/world/story";
import { World } from "@/walk/world/world";
import type { ProgressMap } from "@/walk/progress";

const map = buildCapernaum();
const grid = new WalkGrid(map);

describe("Capernaum map", () => {
  it("puts every named spot on walkable ground", () => {
    const blocked = Object.values(map.spots).filter((s) => !grid.isWalkable(Math.floor(s.x), Math.floor(s.y)));
    expect(blocked.map((s) => s.id)).toEqual([]);
  });

  it("can reach every quest target and mentor from the spawn point", () => {
    const targets = new Set(["jesus-home", "peter-home", "matthew-home", "signpost"]);
    for (const lesson of LESSONS) {
      for (const step of lesson.steps) if (step.kind === "quest") targets.add(step.target);
    }
    for (const id of targets) {
      expect(map.spots[id], id).toBeDefined();
      expect(findPath(grid, map.spawn, map.spots[id]), `path to ${id}`).not.toBeNull();
    }
  });

  it("has a home spot for every character", () => {
    for (const npc of map.npcs) expect(map.spots[npc.home], npc.id).toBeDefined();
  });
});

describe("movement", () => {
  it("can't walk into the lake", () => {
    const water = map.tiles.findIndex((t, i) => t === 0 && i > map.width * 50);
    const x = water % map.width;
    const y = Math.floor(water / map.width);
    expect(collides(grid, x + 0.5, y + 0.5)).toBe(true);
  });

  it("walks the player along a tapped path", () => {
    const world = new World(map);
    const goal = map.spots.well;
    world.walkTo(goal);
    for (let i = 0; i < 600 && world.player.path.length > 0; i++) world.update(1 / 30);
    expect(Math.hypot(world.player.pos.x - goal.x, world.player.pos.y - goal.y)).toBeLessThan(1.5);
  });
});

describe("clock", () => {
  it("names hours the first-century way", () => {
    expect(timeOfDayLabel(12 * 60)).toContain("sixth hour");
    expect(timeOfDayLabel(4 * 60)).toContain("fourth watch");
  });

  it("darkens at night and lights the lamps", () => {
    expect(ambientLight(13 * 60).alpha).toBe(0);
    expect(ambientLight(1 * 60).alpha).toBeGreaterThan(0.5);
    expect(lampLevel(13 * 60)).toBe(0);
    expect(lampLevel(23 * 60)).toBe(1);
  });

  it("wraps around midnight", () => {
    const clock = new WorldClock(23 * 60 + 59);
    clock.tick(10);
    expect(clock.minutes).toBeLessThan(60);
  });
});

describe("story", () => {
  const prayer = getLesson("teach-us-to-pray")!;
  const faith = getLesson("out-of-the-boat")!;
  const tithing = getLesson("the-widows-two-coins")!;

  it("sends a mentor who walks with you to the quest target, and keeps them there", () => {
    const questIndex = prayer.steps.findIndex((s) => s.kind === "quest");
    expect(mentorSpotForStep(prayer, 0)).toBeNull();
    expect(mentorSpotForStep(prayer, questIndex)).toBe("prayer-rock");
    expect(mentorSpotForStep(prayer, questIndex + 2)).toBe("prayer-rock");
    expect(mentorSpotForStep(prayer, prayer.steps.length)).toBeNull();
  });

  it("follows Peter from the jetty to the fire", () => {
    const quests = faith.steps.flatMap((s, i) => (s.kind === "quest" ? [i] : []));
    expect(mentorSpotForStep(faith, quests[0])).toBe("jetty-end");
    expect(mentorSpotForStep(faith, quests[1])).toBe("charcoal-fire");
  });

  it("lets Matthew catch up only after you reach the well", () => {
    const quest = tithing.steps.findIndex((s) => s.kind === "quest");
    expect(mentorSpotForStep(tithing, quest)).toBeNull();
    expect(mentorSpotForStep(tithing, quest + 1)).toBe("well");
  });

  it("derives the active quest from progress", () => {
    const questIndex = prayer.steps.findIndex((s) => s.kind === "quest");
    const progress: ProgressMap = {
      [prayer.slug]: {
        lessonSlug: prayer.slug,
        stepIndex: questIndex,
        status: "in_progress",
        choices: {},
        challengeAcceptedAt: null,
        challengeDoneAt: null,
        completedAt: null,
      },
    };
    const state = storyState(progress, prayer.slug);
    expect(state.quest?.target).toBe("prayer-rock");
    expect(state.mentorSpots.jesus).toBe("prayer-rock");
    expect(state.mentorsWithLessons).toContain("peter");
  });

  it("lets a mentor lead the way even while the lesson panel is open", () => {
    const world = new World(map);
    world.setStory({ mentorSpots: { jesus: "prayer-rock" }, quest: null, mentorsWithLessons: [] });
    world.setTalkingTo("jesus");
    // Panel open: the mentor pauses only while the player is right next to them.
    world.player.pos = { ...map.spots.signpost };
    for (let i = 0; i < 30 * 30; i++) world.update(1 / 30);
    const jesus = world.npc("jesus")!;
    const rock = map.spots["prayer-rock"];
    expect(Math.hypot(jesus.pos.x - rock.x, jesus.pos.y - rock.y)).toBeLessThan(2);
  });

  it("settles a mentor who is still far behind when the player arrives", () => {
    const world = new World(map);
    world.setStory({ mentorSpots: { peter: "charcoal-fire" }, quest: null, mentorsWithLessons: [] });
    world.update(1 / 30);
    world.settle("peter");
    const peter = world.npc("peter")!;
    const fire = map.spots["charcoal-fire"];
    expect(Math.hypot(peter.pos.x - fire.x, peter.pos.y - fire.y)).toBeLessThan(2);
  });

  it("raises an arrive event when the player reaches the quest target", () => {
    const world = new World(map);
    const arrived: string[] = [];
    world.events.on("arrive", (id) => arrived.push(id));
    world.setStory({ mentorSpots: {}, quest: { lessonSlug: "x", target: "well", objective: "" }, mentorsWithLessons: [] });
    world.walkToSpot("well");
    for (let i = 0; i < 900 && arrived.length === 0; i++) world.update(1 / 30);
    expect(arrived).toEqual(["well"]);
  });
});
