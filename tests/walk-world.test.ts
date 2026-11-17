import { describe, expect, it } from "vitest";
import { getLesson, LESSONS } from "@/walk/content";
import { ACTIVITIES, getActivity } from "@/walk/life";
import { ambientLight, DAY_MINUTES, lampLevel, timeOfDayLabel, WorldClock } from "@/walk/world/clock";
import { collides, WalkGrid } from "@/walk/world/grid";
import { buildCapernaum } from "@/walk/world/maps/capernaum";
import { findPath } from "@/walk/world/pathfind";
import { mentorSpotForStep, storyState } from "@/walk/world/story";
import type { Vec, Weather } from "@/walk/world/types";
import { weatherAt } from "@/walk/world/weather";
import { HEAVY_RAIN, INTERACT_RADIUS, World, type ActivityEvent, type Interactable, type SavedState } from "@/walk/world/world";
import type { ProgressMap } from "@/walk/progress";

const map = buildCapernaum();
const grid = new WalkGrid(map);
const MENTORS = ["jesus", "peter", "matthew"];

const dist = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);
const hours = (h: number) => Math.round(h * 60);
const spotOf = (id: string) => map.activitySpots.find((s) => s.id === id)!;

/** Run the world for `seconds` of real time, or until `done` returns true. */
function run(world: World, seconds: number, done: () => boolean = () => false) {
  for (let i = 0; i < seconds * 30 && !done(); i++) world.update(1 / 30);
}

/** A world at a game time, with the player standing at an activity spot (or anywhere else). */
function worldAt(time: Partial<SavedState>, at?: Vec): World {
  const world = new World(map, time);
  if (at) world.player.pos = { x: at.x, y: at.y };
  return world;
}

/** The first moment (day, minutes) in the first year when the weather matches. */
function findWeather(match: (w: Weather, hour: number) => boolean): { day: number; minutes: number } {
  for (let day = 0; day < 365; day++) {
    for (let minutes = 0; minutes < DAY_MINUTES; minutes += 10) if (match(weatherAt(day, minutes), minutes / 60)) return { day, minutes };
  }
  throw new Error("No such weather in a year");
}

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

  it("has a reachable place for every activity", () => {
    const ids = map.activitySpots.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(map.spots[id] ?? map.npcs.find((n) => n.id === id), id).toBeUndefined();
    for (const activity of ACTIVITIES) {
      expect(map.activitySpots.some((s) => s.activity === activity.id), activity.id).toBe(true);
    }
    for (const s of map.activitySpots) {
      expect(getActivity(s.activity), s.id).toBeDefined();
      expect(grid.isWalkable(Math.floor(s.x), Math.floor(s.y)), s.id).toBe(true);
      expect(findPath(grid, map.spawn, s), `path to ${s.id}`).not.toBeNull();
    }
  });

  it("puts Peter's house beside the synagogue, with a table and a cooking fire in the courtyard", () => {
    const house = map.objects.find((o) => o.id === "peter-house")!;
    const synagogue = map.objects.find((o) => o.id === "synagogue")!;
    expect(house.x + house.w).toBe(synagogue.x);
    expect(map.objects.find((o) => o.kind === "table")).toBeDefined();
    expect(map.objects.find((o) => o.kind === "cookfire")?.light).toBeDefined();
    const world = new World(map);
    expect(world.regionAt(spotOf("meal-spot"))).toBe("Peter's house");
    expect(world.regionAt(map.spots["peter-courtyard"])).toBe("Peter's house");
    expect(findPath(grid, map.spawn, map.spots["peter-courtyard"])).not.toBeNull();
    expect(world.regionAt(map.spots["player-house"])).toBe("Your house");
    expect(world.regionAt(map.spawn)).toBe("Your house");
    expect(map.spots["player-house"].label).toBe("Your house");
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

  it("brings Matthew to the well as soon as the story needs him there", () => {
    // In the afternoon he is far off by the shore: he comes straight there.
    const world = worldAt({ minutes: hours(13) });
    world.setStory({ mentorSpots: { matthew: "well" }, quest: null, mentorsWithLessons: [] });
    world.settle("matthew");
    const matthew = world.npc("matthew")!;
    expect(dist(matthew.pos, map.spots.well)).toBeLessThan(2);
    expect(matthew.doing).toBe("Waiting for you at the well");
  });

  it("lets Matthew walk the last few steps from the market, even once the lesson has opened", () => {
    const world = worldAt({ minutes: hours(7.5) }, map.spots.well);
    const matthew = world.npc("matthew")!;
    expect(dist(matthew.pos, map.spots.well)).toBeLessThan(5);
    world.setStory({ mentorSpots: { matthew: "well" }, quest: null, mentorsWithLessons: [] });
    world.settle("matthew");
    world.setInputEnabled(false);
    world.setTalkingTo("matthew");
    run(world, 3);
    expect(dist(matthew.pos, map.spots.well)).toBeLessThan(2);
    // He comes up beside the player and turns to them.
    expect(matthew.moving).toBe(false);
    expect(matthew.facing).toBe(world.player.pos.x > matthew.pos.x ? "right" : "left");
  });

  it("re-arms a quest target after the player steps away", () => {
    const world = new World(map);
    const arrived: string[] = [];
    world.events.on("arrive", (id) => arrived.push(id));
    world.setStory({ mentorSpots: {}, quest: { lessonSlug: "x", target: "well", objective: "" }, mentorsWithLessons: [] });
    world.player.pos = { ...map.spots.well };
    world.update(1 / 30);
    world.player.pos = { x: map.spots.well.x, y: map.spots.well.y + 5 };
    world.update(1 / 30);
    world.player.pos = { ...map.spots.well };
    world.update(1 / 30);
    expect(arrived).toEqual(["well", "well"]);
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

describe("daily routines", () => {
  it("has Jesus praying alone in the quiet place before dawn", () => {
    const jesus = worldAt({ minutes: hours(5) }).npc("jesus")!;
    expect(jesus.visible).toBe(true);
    expect(jesus.pose).toBe("kneel");
    expect(dist(jesus.pos, map.spots["prayer-rock"])).toBeLessThan(3);
    expect(jesus.doing).toContain("Mark 1:35");
  });

  it("has Jesus walk up from Peter's courtyard to pray, and kneel when He gets there", () => {
    const world = worldAt({ minutes: hours(3.75) });
    const jesus = world.npc("jesus")!;
    expect(jesus.pose).toBe("sleep");
    expect(dist(jesus.pos, map.spots["jesus-rest"])).toBeLessThan(1);
    run(world, 40, () => world.clock.minutes >= hours(5));
    expect(jesus.pose).toBe("kneel");
    expect(dist(jesus.pos, map.spots["prayer-rock"])).toBeLessThan(3);
  });

  it("has Jesus teaching the crowds by the sea at noon, with Peter and Matthew listening", () => {
    const world = worldAt({ minutes: hours(12) });
    const jesus = world.npc("jesus")!;
    expect(jesus.pose).toBe("sit");
    expect(dist(jesus.pos, map.spots["jesus-home"])).toBeLessThan(1);
    expect(jesus.doing).toContain("Mark 4:1");
    for (const id of ["peter", "matthew"]) {
      const npc = world.npc(id)!;
      expect(npc.pose, id).toBe("sit");
      expect(dist(npc.pos, jesus.pos), id).toBeLessThan(3);
    }
    const crowd = world.npcs.filter((n) => n.def.schedule?.some((e) => e.spot?.startsWith("crowd-")));
    expect(crowd.length).toBeGreaterThan(0);
    for (const n of crowd) expect(n.pose).toBe("sit");
  });

  it("gathers Jesus, Peter and Matthew around Peter's table for the evening meal", () => {
    const world = worldAt({ minutes: hours(19) });
    const table = map.objects.find((o) => o.kind === "table")!;
    const centre = { x: table.x + table.w / 2, y: table.y + table.h / 2 };
    for (const id of [...MENTORS, "andrew", "james-zebedee", "john"]) {
      const npc = world.npc(id)!;
      expect(npc.pose, id).toBe("sit");
      expect(dist(npc.pos, centre), id).toBeLessThan(2.5);
    }
    expect(world.npc("jesus")!.doing).toContain("Mark 1:29-31");
    expect(world.npc("matthew")!.doing).toContain("Luke 5:29");
  });

  it("has Peter at work by his boat at dawn", () => {
    const peter = worldAt({ minutes: hours(5.5) }).npc("peter")!;
    expect(peter.pose).toBe("work");
    expect(dist(peter.pos, map.spots["peter-home"])).toBeLessThan(1.5);
    expect(peter.doing).toContain("Luke 5:2");
  });

  it("has Matthew by his old tax booth mid-morning", () => {
    const matthew = worldAt({ minutes: hours(10) }).npc("matthew")!;
    expect(dist(matthew.pos, map.spots["matthew-home"])).toBeLessThan(1.5);
    expect(matthew.doing).toContain("Matthew 9:9");
  });

  it("keeps Jesus, Peter and Matthew outdoors where the player can reach them, at every hour", () => {
    for (let minutes = 0; minutes < DAY_MINUTES; minutes += 30) {
      const world = worldAt({ minutes });
      for (const id of MENTORS) {
        const npc = world.npc(id)!;
        expect(npc.visible, `${id} at ${minutes / 60}h`).toBe(true);
        expect(findPath(grid, map.spawn, npc.pos), `${id} at ${minutes / 60}h`).not.toBeNull();
      }
    }
  });

  it("keeps them in sight as the hours turn through a whole day", () => {
    const world = worldAt({ minutes: 0 });
    world.clock.speed = 20;
    const hidden = new Set<string>();
    for (let i = 0; i < 400 && world.clock.day === 0; i++) {
      world.update(0.1);
      for (const id of MENTORS) if (!world.npc(id)!.visible) hidden.add(id);
    }
    expect(world.clock.day).toBe(1);
    expect([...hidden]).toEqual([]);
  });

  it("still lets the story send a mentor where a lesson needs them", () => {
    const world = worldAt({ minutes: hours(5) });
    world.setStory({ mentorSpots: { peter: "charcoal-fire" }, quest: null, mentorsWithLessons: [] });
    world.settle("peter");
    world.update(1 / 30);
    const peter = world.npc("peter")!;
    expect(dist(peter.pos, map.spots["charcoal-fire"])).toBeLessThan(2);
    expect(peter.pose).toBe("stand");
    expect(peter.doing).toBe("Waiting for you at the fire of coals");
  });

  it("wakes a sleeping character who is spoken to", () => {
    const world = worldAt({ minutes: hours(23) });
    const jesus = world.npc("jesus")!;
    world.player.pos = { x: jesus.pos.x, y: jesus.pos.y + 1 };
    world.setTalkingTo("jesus");
    world.update(1 / 30);
    expect(jesus.pose).toBe("sit");
    expect(jesus.facing).toBe("down");
    world.setTalkingTo(null);
    world.update(1 / 30);
    expect(jesus.pose).toBe("sleep");
  });

  it("sends townsfolk in the square indoors in heavy rain, while the fishermen keep working", () => {
    const { day, minutes } = findWeather((w, h) => w.rain >= HEAVY_RAIN && h >= 9.5 && h < 11.5);
    const world = worldAt({ day, minutes });
    const hour = minutes / 60;
    const now = (e: { from: number; to: number }) => hour >= e.from && hour < e.to;
    const sheltered = world.npcs.filter((n) => n.def.schedule?.some((e) => now(e) && e.shelterFromRain));
    expect(sheltered.length).toBeGreaterThan(0);
    for (const n of sheltered) expect(n.visible, n.def.id).toBe(false);
    const fishermen = world.npcs.filter((n) => n.def.schedule?.some((e) => now(e) && e.spot === "boats" && e.pose === "work"));
    expect(fishermen.length).toBeGreaterThan(0);
    for (const n of fishermen) expect(n.visible, n.def.id).toBe(true);
  });
});

describe("activities", () => {
  /** Collect the world's events by name. */
  function listen(world: World) {
    const log: { name: string; payload: unknown }[] = [];
    for (const name of ["nearby", "interact", "activityStart", "activityDone", "activityCancel", "weather"] as const) {
      world.events.on(name, (payload) => log.push({ name, payload }));
    }
    return {
      all: (name: string) => log.filter((e) => e.name === name).map((e) => e.payload),
      last: (name: string) => log.filter((e) => e.name === name).at(-1)?.payload,
    };
  }

  it("offers what can be done nearby, though a person closer by comes first", () => {
    const world = worldAt({ minutes: hours(10) }, spotOf("read-spot"));
    const events = listen(world);
    world.update(1 / 30);
    expect(events.last("nearby")).toEqual({ id: "read-spot", kind: "activity", label: "Read the scroll", activity: "read" });

    const noon = worldAt({ minutes: hours(12) });
    const peter = noon.npc("peter")!;
    noon.player.pos = { x: peter.pos.x + 0.1, y: peter.pos.y + 0.4 };
    const noonEvents = listen(noon);
    noon.update(1 / 30);
    expect((noonEvents.last("nearby") as Interactable).id).toBe("peter");
  });

  it("does not offer what can't be done now", () => {
    const world = worldAt({ minutes: hours(12) }, spotOf("meal-spot"));
    const events = listen(world);
    world.update(1 / 30);
    expect(events.last("nearby") ?? null).toBeNull();
    expect(world.activityReason("meal-spot")).toMatch(/around sunset/);
    expect(world.startActivity("meal-spot")).toBe(false);
    expect(worldAt({ minutes: hours(2) }).activityReason("read-spot")).toMatch(/closed for the night/);
  });

  it("runs an activity: the player kneels in place, time moves on, and it reports who shared it", () => {
    const spot = spotOf("pray-spot");
    const world = worldAt({ minutes: hours(5) }, { x: spot.x + 1, y: spot.y + 0.5 });
    const events = listen(world);
    world.update(1 / 30);
    const start = world.clock.total;
    expect(world.startActivity("pray-spot")).toBe(true);
    const p = world.player;
    expect(p.pos).toEqual({ x: spot.x, y: spot.y });
    expect(p.facing).toBe("up");
    expect(p.pose).toBe("kneel");
    expect(p.activity).toMatchObject({ id: "pray", spotId: "pray-spot", elapsed: 0 });
    expect((events.last("activityStart") as ActivityEvent).nearby).toContain("jesus");
    expect(events.last("nearby")).toBeNull();

    // The player stays put while it runs.
    world.setInput(1, 0);
    world.walkTo(map.spots.well);
    run(world, 1);
    expect(p.pos).toEqual({ x: spot.x, y: spot.y });
    expect(world.startActivity("pray-spot")).toBe(false);
    world.setInput(0, 0);

    run(world, 10, () => p.activity === null);
    const done = events.last("activityDone") as ActivityEvent;
    expect(done).toMatchObject({ activity: "pray", spotId: "pray-spot" });
    expect(done.nearby).toContain("jesus");
    expect(world.clock.total).toBeCloseTo(start + getActivity("pray")!.minutes, 5);
    expect(p.pose).toBe("stand");

    world.setInput(1, 0);
    run(world, 0.5);
    expect(p.pos.x).toBeGreaterThan(spot.x);
  });

  it("won't start out of reach, at an unknown spot, or twice", () => {
    const world = worldAt({ minutes: hours(12) }, map.spots.well);
    expect(world.startActivity("pray-spot")).toBe(false);
    expect(world.startActivity("nowhere")).toBe(false);
    expect(world.player.activity).toBeNull();
  });

  it("can be stopped part-way, with nothing gained", () => {
    const world = worldAt({ minutes: hours(10) }, spotOf("water-spot"));
    const events = listen(world);
    const start = world.clock.total;
    expect(world.startActivity("water-spot")).toBe(true);
    expect(world.player.pose).toBe("work");
    run(world, 2);
    world.cancelActivity();
    expect(events.last("activityCancel")).toMatchObject({ activity: "water", spotId: "water-spot" });
    expect(world.player.activity).toBeNull();
    expect(world.player.pose).toBe("stand");
    run(world, 10);
    expect(events.all("activityDone")).toEqual([]);
    expect(world.clock.total).toBeGreaterThan(start);
    expect(world.clock.total).toBeLessThan(start + getActivity("water")!.minutes + 10);
  });

  it("sleeps through midnight until six in the morning, and wakes to a town at its morning work", () => {
    const world = worldAt({ minutes: hours(22), day: 0 }, spotOf("sleep-spot"));
    const events = listen(world);
    expect(world.startActivity("sleep-spot")).toBe(true);
    expect(world.player.pose).toBe("sleep");
    run(world, 12, () => world.player.activity === null);
    expect(events.all("activityDone")).toHaveLength(1);
    expect(world.clock.day).toBe(1);
    expect(world.clock.minutes).toBe(hours(6));
    const jesus = world.npc("jesus")!;
    expect(jesus.pose).toBe("kneel");
    expect(dist(jesus.pos, map.spots["prayer-rock"])).toBeLessThan(3);
  });

  it("sleeps after midnight until six the same morning, on the dot", () => {
    const world = worldAt({ minutes: hours(2), day: 3 }, spotOf("sleep-spot"));
    world.clock.advance(0.37);
    expect(world.startActivity("sleep-spot")).toBe(true);
    run(world, 12, () => world.player.activity === null);
    expect(world.clock.day).toBe(3);
    expect(world.clock.minutes).toBe(hours(6));
  });

  it("lets the player listen only while Jesus is there teaching", () => {
    const world = worldAt({ minutes: hours(12) }, spotOf("listen-spot"));
    expect(world.activityReason("listen-spot")).toBeNull();
    world.setStory({ mentorSpots: { jesus: "prayer-rock" }, quest: null, mentorsWithLessons: [] });
    world.settle("jesus");
    world.update(1 / 30);
    expect(world.activityReason("listen-spot")).toBe("Jesus isn't here just now.");
    expect(world.startActivity("listen-spot")).toBe(false);
  });

  it("shares the evening meal with everyone at the table", () => {
    const world = worldAt({ minutes: hours(19) }, spotOf("meal-spot"));
    const events = listen(world);
    expect(world.startActivity("meal-spot")).toBe(true);
    run(world, 12, () => world.player.activity === null);
    const done = events.last("activityDone") as ActivityEvent;
    expect(done.nearby).toEqual(expect.arrayContaining([...MENTORS, "andrew", "james-zebedee", "john"]));
  });

  it("puts the nets away in a strong wind, and keeps people out of the shade in the rain", () => {
    const windy = findWeather((w, h) => w.kind === "windy" && h >= 5 && h < 11);
    const world = worldAt(windy, spotOf("nets-spot"));
    expect(world.activityReason("nets-spot")).toMatch(/wind/);
    expect(world.startActivity("nets-spot")).toBe(false);
    const rainy = findWeather((w, h) => w.kind === "rain" && h >= 7 && h < 18);
    expect(worldAt(rainy).activityReason("shade-spot")).toMatch(/rain/);
  });

  it("walks the player to an activity and says why when it can't be done", () => {
    const world = worldAt({ minutes: hours(2) });
    const events = listen(world);
    world.approach("shade-spot");
    run(world, 20, () => events.all("interact").length > 0);
    expect(events.last("interact")).toMatchObject({ id: "shade-spot", kind: "activity", activity: "shade" });
    expect((events.last("interact") as Interactable).reason).toMatch(/shade/);
    expect(world.activitySpotAt(spotOf("shade-spot"))?.id).toBe("shade-spot");
  });
});

describe("approach", () => {
  it("catches up with someone walking away", () => {
    const world = worldAt({ minutes: hours(8.5) - 1 });
    const jesus = world.npc("jesus")!;
    run(world, 3, () => jesus.moving && jesus.goal === "jesus-home");
    expect(jesus.moving).toBe(true);
    world.player.pos = { ...map.spots["shore-east"] };
    const met: Interactable[] = [];
    world.events.on("interact", (item) => met.push(item));
    world.approach("jesus");
    run(world, 20, () => met.length > 0);
    expect(met.map((m) => m.id)).toEqual(["jesus"]);
    expect(dist(world.player.pos, jesus.pos)).toBeLessThanOrEqual(INTERACT_RADIUS + 0.6);
  });

  it("lists who is close by, nearest first", () => {
    const world = worldAt({ minutes: hours(19) }, spotOf("meal-spot"));
    const near = world.nearbyCharacters(1.2);
    expect(near.sort()).toEqual(["james-zebedee", "john"]);
    expect(world.nearbyCharacters()).toEqual(expect.arrayContaining(MENTORS));
  });
});

describe("weather", () => {
  it("is the same for the same day and hour, every time", () => {
    expect(weatherAt(12, 400)).toEqual(weatherAt(12, 400));
    const world = worldAt({ day: 9, minutes: 620 });
    expect(world.weather).toEqual(weatherAt(9, 620));
    expect(weatherAt(0, hours(7)).kind).toBe("clear");
  });

  it("changes smoothly, minute by minute and across midnight", () => {
    let worst = 0;
    for (let day = 0; day < 60; day++) {
      for (let m = 0; m < DAY_MINUTES; m++) {
        const a = weatherAt(day, m);
        const b = m + 1 < DAY_MINUTES ? weatherAt(day, m + 1) : weatherAt(day + 1, 0);
        for (const k of ["cloud", "rain", "fog", "wind"] as const) {
          expect(a[k]).toBeGreaterThanOrEqual(0);
          expect(a[k]).toBeLessThanOrEqual(1);
          worst = Math.max(worst, Math.abs(b[k] - a[k]));
        }
      }
    }
    expect(worst).toBeLessThan(0.02);
    expect(weatherAt(4, DAY_MINUTES)).toEqual({ ...weatherAt(5, 0), label: weatherAt(4, DAY_MINUTES).label });
  });

  it("is mostly clear, with some cloud, rain and wind, and mist only in the morning", () => {
    const daytime: Record<string, number> = {};
    for (let day = 0; day < 200; day++) {
      for (let m = 0; m < DAY_MINUTES; m += 15) {
        const w = weatherAt(day, m);
        expect(w.label.length).toBeGreaterThan(0);
        if (w.kind === "mist") {
          expect(m).toBeGreaterThanOrEqual(hours(4));
          expect(m).toBeLessThan(hours(10));
        }
        if (m >= hours(6) && m < hours(18)) daytime[w.kind] = (daytime[w.kind] ?? 0) + 1;
      }
    }
    const total = Object.values(daytime).reduce((a, b) => a + b, 0);
    expect(daytime.clear / total).toBeGreaterThan(0.45);
    for (const kind of ["cloudy", "mist", "rain", "windy"]) {
      expect(daytime[kind], kind).toBeGreaterThan(0);
      expect(daytime[kind] / total, kind).toBeLessThan(daytime.clear / total);
    }
  });

  it("tells the world when the weather turns", () => {
    let turn = -1;
    for (let m = 10; m < 8 * DAY_MINUTES && turn < 0; m++) {
      const day = Math.floor(m / DAY_MINUTES);
      const before = weatherAt(day, (m - 1) % DAY_MINUTES);
      if (before.kind !== weatherAt(day, m % DAY_MINUTES).kind && m % DAY_MINUTES > 2) turn = m;
    }
    const day = Math.floor(turn / DAY_MINUTES);
    const world = worldAt({ day, minutes: (turn % DAY_MINUTES) - 2 });
    const changes: Weather[] = [];
    world.events.on("weather", (w) => changes.push(w));
    run(world, 5);
    expect(changes.length).toBeGreaterThan(0);
    expect(changes[0].kind).toBe(weatherAt(day, turn % DAY_MINUTES).kind);
  });
});

describe("world clock", () => {
  it("moves to a moment exactly, counting days, and never backwards", () => {
    const clock = new WorldClock(22 * 60, 0);
    clock.setTotal(DAY_MINUTES + 6 * 60);
    expect([clock.day, clock.minutes]).toEqual([1, 360]);
    clock.setTotal(10);
    expect(clock.total).toBe(DAY_MINUTES + 360);
    clock.advance(DAY_MINUTES * 2 + 30);
    expect([clock.day, clock.minutes]).toEqual([3, 390]);
  });
});
