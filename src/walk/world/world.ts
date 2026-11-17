import { getCharacter } from "@/walk/content";
import { activityEnd, getActivity, unavailableReason } from "@/walk/life/activities";
import type { ActivityDef } from "@/walk/life/types";
import { WorldClock } from "./clock";
import { Emitter } from "./events";
import { collides, moveWithCollision, WalkGrid } from "./grid";
import { rng } from "./noise";
import { findPath } from "./pathfind";
import type { StoryState } from "./story";
import type { ActivitySpot, Facing, NpcDef, Pose, ScheduleEntry, Vec, Weather, WeatherKind, WorldMap } from "./types";
import { weatherAt } from "./weather";

export const PLAYER_SPEED = 4.2; // tiles per second
export const INTERACT_RADIUS = 1.7;
export const ARRIVE_RADIUS = 1.8;
/** Characters within this many tiles share an activity with the player. */
export const COMPANY_RADIUS = 3.5;
/** Rain this heavy sends townsfolk out in the square indoors. */
export const HEAVY_RAIN = 0.5;

/** How close a character an activity needs (ActivityDef.withCharacter) must be to its spot. */
const WITH_CHARACTER_RADIUS = 4;
/** After an activity this long (sleeping), everyone is settled where the new hour finds them. */
const SETTLE_AFTER_MINUTES = 120;
/** Walking up to someone on the move: re-route when they are this far from where the route was heading... */
const REPATH_DISTANCE = 1.2;
/** ...at most this often (seconds)... */
const REPATH_SECONDS = 0.4;
/** ...and give up after this many routes. */
const MAX_APPROACH_ROUTES = 40;

export interface Walker {
  pos: Vec;
  facing: Facing;
  moving: boolean;
  /** What they're doing while standing still. Renderers show "stand" while moving. */
  pose: Pose;
}

/** An activity the player is in the middle of (praying, resting...). */
export interface ActivityRun {
  /** Activity id from `@/walk/life/activities`. */
  id: string;
  /** The activity spot it is happening at. */
  spotId: string;
  pose: Pose;
  /** Real seconds done so far, and in total. */
  elapsed: number;
  duration: number;
}

export interface NpcState extends Walker {
  def: NpcDef;
  visible: boolean;
  path: Vec[];
  /** The spot the NPC is heading to or standing at; null when they've gone indoors. */
  goal: string | null;
  wanderRadius: number;
  anchor: Vec;
  idle: number;
  face: Facing | null;
  speed: number;
  /** What they're doing now, for the player to read, e.g. "Teaching the crowds by the sea (Mark 4:1)". */
  doing: string | null;
}

export interface Interactable {
  /** A character's NPC id, "signpost", or an activity spot id. */
  id: string;
  kind: "character" | "signpost" | "activity";
  /** The button text, e.g. "Peter" or "Pray here". */
  label: string;
  /** Activities only: the activity id (see `getActivity`). */
  activity?: string;
  /** Activities only: why it can't be done right now, when the player walked up to one that isn't available. */
  reason?: string;
}

/** Payload of the activity events. */
export interface ActivityEvent {
  /** Activity id. */
  activity: string;
  /** Activity spot id. */
  spotId: string;
  /** Character ids of everyone within COMPANY_RADIUS: when it started, and (for "activityDone") when it ended. */
  nearby: string[];
}

export interface WorldEvents extends Record<string, unknown> {
  /** What the player could interact with right now changed (null: nothing in reach). */
  nearby: Interactable | null;
  /** The player chose to interact. For kind "activity" call `startActivity(item.id)`, or show `item.reason`. */
  interact: Interactable;
  region: string;
  arrive: string;
  clock: number;
  /** The player began an activity; input stays off until it ends. */
  activityStart: ActivityEvent;
  /** An activity finished and the clock has moved on: apply it to the player's life (`applyActivity`). */
  activityDone: ActivityEvent;
  /** An activity was stopped part-way (`cancelActivity`): nothing is gained. */
  activityCancel: ActivityEvent;
  /** The kind of weather changed. */
  weather: Weather;
}

export interface SavedState {
  x: number;
  y: number;
  facing: Facing;
  minutes: number;
  /** Days since the walk began. */
  day: number;
}

function facingFor(dx: number, dy: number, fallback: Facing): Facing {
  if (Math.abs(dx) < 1e-4 && Math.abs(dy) < 1e-4) return fallback;
  return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
}

function scheduleAt(schedule: ScheduleEntry[], hour: number): ScheduleEntry | null {
  return schedule.find((e) => (e.from <= e.to ? hour >= e.from && hour < e.to : hour >= e.from || hour < e.to)) ?? null;
}

/** "The well" -> "the well", for use mid-sentence. */
function midSentence(label: string): string {
  return label.replace(/^(The|A) /, (m) => m.toLowerCase());
}

/** Where an NPC wants to be right now, and what they do there. */
interface Plan {
  spot: string | null;
  wander: number;
  face: Facing | null;
  /** A mentor the story has sent somewhere: they stand beside the spot and walk faster. */
  offsetForMentor: boolean;
  pose: Pose;
  doing: string | null;
}

/**
 * The simulation: player, people, animals, time of day and weather. Renderers read `player`, `npcs`, `clock` and
 * `weather` every frame; the UI listens to `events` and calls the control methods.
 */
export class World {
  readonly map: WorldMap;
  readonly grid: WalkGrid;
  readonly clock: WorldClock;
  readonly events = new Emitter<WorldEvents>();
  readonly player: Walker & { path: Vec[]; activity: ActivityRun | null };
  readonly npcs: NpcState[];

  private input: Vec = { x: 0, y: 0 };
  private inputEnabled = true;
  private pendingInteract: string | null = null;
  /** Where the route to `pendingInteract` was heading, and how often it has been re-planned. */
  private approachGoal: Vec = { x: 0, y: 0 };
  private approachRoutes = 0;
  private approachTimer = 0;
  private story: StoryState = { mentorSpots: {}, quest: null, mentorsWithLessons: [] };
  private talkingTo: string | null = null;
  private nearby: Interactable | null = null;
  private region = "";
  private arrivedAt: string | null = null;
  private clockAccumulator = 0;
  private random = rng(2026);
  /** The running activity's game time: it runs from `start` to `end` (clock totals) while it plays out. */
  private activityClock: { start: number; end: number; company: string[] } | null = null;
  private weatherNow: Weather;
  private weatherKind: WeatherKind;

  constructor(map: WorldMap, saved?: Partial<SavedState>) {
    this.map = map;
    this.grid = new WalkGrid(map);
    this.clock = new WorldClock(saved?.minutes ?? 7 * 60, typeof saved?.day === "number" ? saved.day : 0);
    this.weatherNow = weatherAt(this.clock.day, this.clock.minutes);
    this.weatherKind = this.weatherNow.kind;
    const start = saved && typeof saved.x === "number" && typeof saved.y === "number" ? { x: saved.x, y: saved.y } : map.spawn;
    const pos = collides(this.grid, start.x, start.y) ? this.walkableNear(map.spawn) : start;
    this.player = { pos, facing: saved?.facing ?? "down", moving: false, pose: "stand", path: [], activity: null };
    this.npcs = map.npcs.map((def) => this.createNpc(def));
  }

  // ---- Controls ------------------------------------------------------------------------------------------------

  /** Keyboard or joystick direction, each axis -1..1. Cancels any tap-to-move path. */
  setInput(x: number, y: number) {
    this.input = { x, y };
    if ((x !== 0 || y !== 0) && this.canMove()) {
      this.player.path = [];
      this.pendingInteract = null;
    }
  }

  /** While a panel is open the player stands still and keys go to the panel. */
  setInputEnabled(enabled: boolean) {
    this.inputEnabled = enabled;
    if (!enabled) {
      this.input = { x: 0, y: 0 };
      this.player.path = [];
      this.player.moving = false;
      this.pendingInteract = null;
    }
  }

  /** Tap-to-move: walk to a tile (or as close as possible). */
  walkTo(target: Vec) {
    if (!this.canMove()) return;
    this.pendingInteract = null;
    const goal = this.grid.nearestWalkable(target.x - 0.5, target.y - 0.5, 6);
    if (!goal) return;
    this.player.path = findPath(this.grid, this.player.pos, goal) ?? [];
  }

  /**
   * Walk up to a character, the signpost or an activity spot, and interact on arrival. Someone on the move is
   * followed: the route is re-planned as they go, so the player can catch up with Jesus walking along the shore.
   */
  approach(id: string) {
    if (!this.canMove()) return;
    const target = this.interactablePosition(id);
    if (!target) return;
    if (this.distance(this.player.pos, target) <= this.reachOf(id)) {
      this.interact(id);
      return;
    }
    this.approachRoutes = 0;
    this.approachTimer = REPATH_SECONDS;
    if (this.routeTo(id, target)) this.pendingInteract = id;
  }

  /** Walk to a named spot, e.g. a mentor's place when the player picks "take me there". */
  walkToSpot(spotId: string) {
    const spot = this.map.spots[spotId];
    if (spot) this.walkTo(spot);
  }

  /** Talk to (or use) whatever is nearby. */
  interactNearby() {
    if (this.canMove() && this.nearby) this.interact(this.nearby.id);
  }

  /**
   * Begin the activity at an activity spot. The player must be within the spot's radius and the activity available
   * now (see `activityReason`). The player stops, takes their place at the spot facing it, and holds the activity's
   * pose with input off; game time runs faster until the activity's minutes have passed (or, for sleep, until
   * morning), then "activityDone" fires. Returns false, changing nothing, if it can't start.
   */
  startActivity(spotId: string): boolean {
    if (this.player.activity) return false;
    const spot = this.activitySpot(spotId);
    const def = spot ? getActivity(spot.activity) : undefined;
    if (!spot || !def) return false;
    // A little slack: the player may have drifted a step since the activity was offered.
    if (this.distance(this.player.pos, spot) > spot.radius + 0.25 || this.reasonFor(spot, def) !== null) return false;

    const p = this.player;
    this.input = { x: 0, y: 0 };
    this.pendingInteract = null;
    p.path = [];
    p.moving = false;
    p.facing = spot.face ?? facingFor(spot.x - p.pos.x, spot.y - p.pos.y, p.facing);
    if (!collides(this.grid, spot.x, spot.y)) p.pos = { x: spot.x, y: spot.y };
    p.pose = def.pose;
    p.activity = { id: def.id, spotId: spot.id, pose: def.pose, elapsed: 0, duration: def.seconds };

    const start = this.clock.total;
    const company = this.nearbyCharacters();
    this.activityClock = { start, end: activityEnd(def, start), company };
    this.setNearby(null);
    this.events.emit("activityStart", { activity: def.id, spotId: spot.id, nearby: company });
    return true;
  }

  /** Stop the running activity part-way. The time already spent has passed; nothing is gained. */
  cancelActivity() {
    const run = this.player.activity;
    if (!run) return;
    const company = this.activityClock?.company ?? [];
    this.endActivity();
    this.events.emit("activityCancel", { activity: run.id, spotId: run.spotId, nearby: company });
  }

  setStory(story: StoryState) {
    this.story = story;
    if (this.arrivedAt && this.arrivedAt !== story.quest?.target) this.arrivedAt = null;
  }

  get storyState(): StoryState {
    return this.story;
  }

  /** The weather right now. */
  get weather(): Weather {
    return weatherAt(this.clock.day, this.clock.minutes);
  }

  /**
   * Bring a character straight to where the story needs them (beside a quest spot) if they're still far away,
   * so a scene never starts without them. Close by, they keep walking the last few steps.
   */
  settle(id: string) {
    const npc = this.npc(id);
    if (!npc) return;
    const plan = this.planFor(npc);
    if (!plan.spot) return;
    const target = this.standPoint(plan.spot, plan.offsetForMentor);
    if (this.distance(npc.pos, target) <= 5) return;
    this.place(npc, plan);
  }

  /** The character the player is talking to stops and faces them. */
  setTalkingTo(id: string | null) {
    this.talkingTo = id;
  }

  save(): SavedState {
    return {
      x: this.player.pos.x,
      y: this.player.pos.y,
      facing: this.player.facing,
      minutes: Math.round(this.clock.minutes),
      day: this.clock.day,
    };
  }

  // ---- Queries -------------------------------------------------------------------------------------------------

  regionAt(pos: Vec): string {
    const r = this.map.regions.find((r) => pos.x >= r.x && pos.x < r.x + r.w && pos.y >= r.y && pos.y < r.y + r.h);
    return r?.name ?? this.map.name;
  }

  npc(id: string): NpcState | undefined {
    return this.npcs.find((n) => n.def.id === id);
  }

  /** The NPC whose sprite is under a world point (in tiles), for tap-to-talk. */
  npcAt(point: Vec, radius = 0.7): NpcState | undefined {
    let best: NpcState | undefined;
    let bestD = radius;
    for (const n of this.npcs) {
      if (!n.visible || !n.def.characterId) continue;
      // Sprites are drawn above the feet, so test against the body centre.
      const d = this.distance(point, { x: n.pos.x, y: n.pos.y - 0.6 });
      if (d < bestD) {
        bestD = d;
        best = n;
      }
    }
    return best;
  }

  /** The activity spot at a world point (in tiles), for tap-to-do: pass its id to `approach`. */
  activitySpotAt(point: Vec, radius = 1): ActivitySpot | undefined {
    let best: ActivitySpot | undefined;
    let bestD = radius;
    for (const spot of this.map.activitySpots) {
      const d = this.distance(point, spot);
      if (d < bestD) {
        bestD = d;
        best = spot;
      }
    }
    return best;
  }

  /**
   * Why the activity at a spot can't be done right now (the hour, the weather, or the person it needs isn't
   * there), in a sentence for the player; null when it can. Being close enough is checked by `startActivity`.
   */
  activityReason(spotId: string): string | null {
    const spot = this.activitySpot(spotId);
    const def = spot ? getActivity(spot.activity) : undefined;
    return spot && def ? this.reasonFor(spot, def) : "There's nothing to do here.";
  }

  /** Character ids of everyone within `radius` tiles of the player, nearest first (named townsfolk included). */
  nearbyCharacters(radius = COMPANY_RADIUS): string[] {
    const p = this.player.pos;
    return this.npcs
      .filter((n) => n.visible && n.def.characterId && this.distance(p, n.pos) <= radius)
      .sort((a, b) => this.distance(p, a.pos) - this.distance(p, b.pos))
      .map((n) => n.def.characterId!);
  }

  // ---- Simulation ----------------------------------------------------------------------------------------------

  update(dt: number) {
    dt = Math.min(dt, 0.1);
    const run = this.player.activity;
    if (run && this.activityClock) {
      // While the player is busy, time runs faster so the activity's game minutes pass in its few real seconds.
      run.elapsed = Math.min(run.duration, run.elapsed + dt);
      const { start, end } = this.activityClock;
      this.clock.setTotal(start + (end - start) * (run.duration > 0 ? run.elapsed / run.duration : 1));
    } else {
      this.clock.tick(dt);
    }
    this.clockAccumulator += dt;
    if (this.clockAccumulator > 0.5) {
      this.clockAccumulator = 0;
      this.events.emit("clock", this.clock.minutes);
    }
    this.updateWeather();
    this.updatePlayer(dt);
    for (const npc of this.npcs) this.updateNpc(npc, dt);
    if (run && run.elapsed >= run.duration) this.finishActivity();
    this.checkSurroundings(dt);
  }

  private canMove(): boolean {
    return this.inputEnabled && !this.player.activity;
  }

  private updateWeather() {
    this.weatherNow = weatherAt(this.clock.day, this.clock.minutes);
    if (this.weatherNow.kind !== this.weatherKind) {
      this.weatherKind = this.weatherNow.kind;
      this.events.emit("weather", this.weatherNow);
    }
  }

  private finishActivity() {
    const run = this.player.activity!;
    const clock = this.activityClock!;
    this.clock.setTotal(clock.end);
    this.endActivity();
    // After a long sleep, wake to a town already going about its morning.
    if (clock.end - clock.start >= SETTLE_AFTER_MINUTES) for (const npc of this.npcs) this.place(npc, this.planFor(npc));
    this.updateWeather();
    this.events.emit("clock", this.clock.minutes);
    const nearby = [...new Set([...clock.company, ...this.nearbyCharacters()])];
    this.events.emit("activityDone", { activity: run.id, spotId: run.spotId, nearby });
  }

  private endActivity() {
    this.player.activity = null;
    this.player.pose = "stand";
    this.activityClock = null;
  }

  private updatePlayer(dt: number) {
    const p = this.player;
    if (p.activity) {
      p.moving = false;
      return;
    }
    let dx = 0;
    let dy = 0;
    if (this.inputEnabled && (this.input.x !== 0 || this.input.y !== 0)) {
      const len = Math.hypot(this.input.x, this.input.y);
      dx = (this.input.x / len) * PLAYER_SPEED * dt;
      dy = (this.input.y / len) * PLAYER_SPEED * dt;
    } else if (p.path.length > 0) {
      const target = p.path[0];
      const tx = target.x - p.pos.x;
      const ty = target.y - p.pos.y;
      const dist = Math.hypot(tx, ty);
      const step = PLAYER_SPEED * dt;
      if (dist <= step) {
        p.pos = { x: target.x, y: target.y };
        p.path.shift();
        p.facing = facingFor(tx, ty, p.facing);
        p.moving = p.path.length > 0;
        return;
      }
      dx = (tx / dist) * step;
      dy = (ty / dist) * step;
    }
    if (dx === 0 && dy === 0) {
      p.moving = false;
      return;
    }
    const before = p.pos;
    p.pos = p.path.length > 0 ? { x: before.x + dx, y: before.y + dy } : moveWithCollision(this.grid, before, dx, dy);
    p.facing = facingFor(dx, dy, p.facing);
    p.moving = p.pos.x !== before.x || p.pos.y !== before.y;
  }

  private createNpc(def: NpcDef): NpcState {
    const npc: NpcState = {
      def,
      pos: { x: 0, y: 0 },
      facing: def.facing ?? "down",
      moving: false,
      pose: "stand",
      visible: true,
      path: [],
      goal: null,
      wanderRadius: def.wander ?? 0,
      anchor: { x: 0, y: 0 },
      idle: this.random() * 4,
      face: def.facing ?? null,
      speed: def.speed,
      doing: null,
    };
    // Start everyone where they should be right now, so the world looks settled on load.
    this.place(npc, this.planFor(npc));
    return npc;
  }

  /** Put an NPC straight where a plan wants them, already arrived (or indoors). */
  private place(npc: NpcState, plan: Plan) {
    const at = this.standPoint(plan.spot ?? npc.def.home, plan.offsetForMentor);
    Object.assign(npc, {
      pos: { ...at },
      anchor: at,
      path: [],
      moving: false,
      goal: plan.spot,
      visible: plan.spot !== null,
      wanderRadius: plan.wander,
      face: plan.face,
      pose: plan.pose,
    });
    if (plan.face) npc.facing = plan.face;
    npc.speed = plan.offsetForMentor ? Math.max(npc.def.speed, PLAYER_SPEED * 1.15) : npc.def.speed;
    npc.doing = this.doingFor(npc, plan);
  }

  /** Where an NPC wants to be right now. */
  private planFor(npc: NpcState): Plan {
    const def = npc.def;
    const override = def.characterId ? this.story.mentorSpots[def.characterId] : undefined;
    if (override) return { spot: override, wander: 0, face: null, offsetForMentor: true, pose: "stand", doing: null };
    // The widow stays by the well while Matthew's quest sends the player to find her.
    if (def.id === "widow") {
      return { spot: def.home, wander: 0, face: def.facing ?? null, offsetForMentor: false, pose: "stand", doing: null };
    }
    if (def.schedule) {
      const entry = scheduleAt(def.schedule, this.clock.hour);
      const sheltering = entry?.shelterFromRain && this.weatherNow.rain >= HEAVY_RAIN;
      if (!entry || !entry.spot || sheltering) {
        const doing = sheltering ? "Heading indoors out of the rain" : (entry?.doing ?? null);
        return { spot: null, wander: 0, face: null, offsetForMentor: false, pose: "stand", doing };
      }
      return {
        spot: entry.spot,
        wander: entry.wander,
        face: entry.face ?? null,
        offsetForMentor: false,
        pose: entry.pose ?? "stand",
        doing: entry.doing ?? null,
      };
    }
    return { spot: def.home, wander: def.wander ?? 0, face: def.facing ?? null, offsetForMentor: false, pose: "stand", doing: null };
  }

  /** What an NPC is doing, for the player. A mentor the story has sent somewhere is on the way, then waiting. */
  private doingFor(npc: NpcState, plan: Plan): string | null {
    if (!plan.offsetForMentor || !plan.spot) return plan.doing;
    const place = midSentence(this.map.spots[plan.spot]?.label ?? "the place");
    return npc.path.length > 0 ? `On the way to ${place}` : `Waiting for you at ${place}`;
  }

  /** The tile centre an NPC stands on for a spot. Mentors stand beside it so the player can step onto it. */
  private standPoint(spotId: string, besideSpot: boolean): Vec {
    const spot = this.map.spots[spotId] ?? this.map.spots[Object.keys(this.map.spots)[0]];
    const want = besideSpot ? { x: spot.x + 1, y: spot.y } : spot;
    const tile = this.grid.nearestWalkable(want.x - 0.5, want.y - 0.5, 6);
    return tile ? { x: tile.x + 0.5, y: tile.y + 0.5 } : { x: spot.x, y: spot.y };
  }

  private updateNpc(npc: NpcState, dt: number) {
    const plan = this.planFor(npc);
    if (plan.spot !== npc.goal) {
      // Going indoors: walk to the door, then disappear. Coming out: appear at the door and walk over.
      if (plan.spot === null) {
        const door = this.standPoint(npc.def.home, false);
        npc.path = npc.visible ? (findPath(this.grid, npc.pos, door) ?? []) : [];
        npc.anchor = door;
      } else {
        if (!npc.visible) {
          npc.pos = this.standPoint(npc.def.home, false);
          npc.visible = true;
        }
        const target = this.standPoint(plan.spot, plan.offsetForMentor);
        npc.anchor = target;
        npc.path = findPath(this.grid, npc.pos, target) ?? [];
      }
      npc.goal = plan.spot;
      npc.wanderRadius = plan.wander;
      npc.face = plan.face;
      // Mentors who lead the way walk a little faster than the player, so they're there to meet them.
      npc.speed = plan.offsetForMentor ? Math.max(npc.def.speed, PLAYER_SPEED * 1.15) : npc.def.speed;
    }
    this.moveNpc(npc, plan, dt);
    npc.doing = this.doingFor(npc, plan);
  }

  private moveNpc(npc: NpcState, plan: Plan, dt: number) {
    // Someone in conversation with the player pauses and turns to them, but keeps their route for afterwards; if
    // the route leads to the player (a mentor coming to meet them), they keep coming. Someone asleep sits up to talk.
    const toPlayer = this.distance(npc.pos, this.player.pos);
    const comingToYou = npc.path.length > 0 && this.distance(npc.anchor, this.player.pos) < toPlayer;
    if (this.talkingTo === npc.def.id && toPlayer < 4 && !comingToYou) {
      npc.moving = false;
      npc.facing = facingFor(this.player.pos.x - npc.pos.x, this.player.pos.y - npc.pos.y, npc.facing);
      if (npc.pose === "sleep") npc.pose = "sit";
      return;
    }

    if (npc.path.length > 0) {
      const target = npc.path[0];
      const tx = target.x - npc.pos.x;
      const ty = target.y - npc.pos.y;
      const dist = Math.hypot(tx, ty);
      const step = npc.speed * dt;
      npc.facing = facingFor(tx, ty, npc.facing);
      npc.moving = true;
      npc.pose = "stand";
      if (dist <= step) {
        npc.pos = { x: target.x, y: target.y };
        npc.path.shift();
      } else {
        npc.pos = { x: npc.pos.x + (tx / dist) * step, y: npc.pos.y + (ty / dist) * step };
      }
      return;
    }

    npc.moving = false;
    if (npc.goal === null) {
      npc.visible = false;
      npc.pose = "stand";
      return;
    }
    // Arrived: take up what they came to do (kneel, sit, work...). Wanderers do it between strolls.
    const settled = npc.wanderRadius > 0 || this.distance(npc.pos, npc.anchor) <= 0.6;
    npc.pose = settled ? plan.pose : "stand";
    // Lost the way (no route was found earlier, say): try again to reach the spot.
    if (npc.wanderRadius === 0 && this.distance(npc.pos, npc.anchor) > 1) {
      npc.idle -= dt;
      if (npc.idle <= 0) {
        npc.idle = 1.5;
        npc.path = findPath(this.grid, npc.pos, npc.anchor) ?? [];
        if (npc.path.length > 0) return;
      }
    }
    if (npc.face) npc.facing = npc.face;
    else if (plan.offsetForMentor) {
      const spot = this.map.spots[npc.goal];
      if (spot) npc.facing = facingFor(spot.x - npc.pos.x, spot.y - npc.pos.y, npc.facing);
    }
    if (npc.wanderRadius > 0) {
      npc.idle -= dt;
      if (npc.idle <= 0) {
        npc.idle = 2 + this.random() * 5;
        const r = npc.wanderRadius;
        const goal = this.grid.nearestWalkable(
          npc.anchor.x - 0.5 + (this.random() * 2 - 1) * r,
          npc.anchor.y - 0.5 + (this.random() * 2 - 1) * r,
          2,
        );
        if (goal) npc.path = findPath(this.grid, npc.pos, goal, 2000)?.slice(0, 12) ?? [];
      }
    }
  }

  private activitySpot(id: string): ActivitySpot | undefined {
    return this.map.activitySpots.find((s) => s.id === id);
  }

  private reasonFor(spot: ActivitySpot, def: ActivityDef): string | null {
    const reason = unavailableReason(def, this.clock.minutes, this.weather);
    if (reason || !def.withCharacter) return reason;
    const npc = this.npcs.find((n) => n.def.characterId === def.withCharacter);
    const there =
      npc?.visible && !npc.moving && npc.path.length === 0 && this.distance(npc.pos, spot) <= WITH_CHARACTER_RADIUS;
    const name = getCharacter(def.withCharacter)?.shortName;
    return there ? null : name ? `${name} isn't here just now.` : "Not just now.";
  }

  private interactablePosition(id: string): Vec | null {
    if (id === "signpost") return this.map.spots.signpost ?? null;
    const spot = this.activitySpot(id);
    if (spot) return spot;
    const npc = this.npc(id);
    return npc?.visible ? npc.pos : null;
  }

  /** How close the player must be to interact with something. */
  private reachOf(id: string): number {
    return this.activitySpot(id)?.radius ?? INTERACT_RADIUS;
  }

  /** Plan a route to stand by `target` (a character's feet: just below them; an activity spot: on it). */
  private routeTo(id: string, target: Vec): boolean {
    const onSpot = Boolean(this.activitySpot(id));
    const goal = this.grid.nearestWalkable(target.x - 0.5, target.y + (onSpot ? -0.5 : 0.5), 4);
    const path = goal ? findPath(this.grid, this.player.pos, goal) : null;
    this.approachRoutes++;
    if (!path) return false;
    this.player.path = path;
    this.approachGoal = { x: target.x, y: target.y };
    return true;
  }

  private interact(id: string) {
    const item = this.describe(id);
    if (item) this.events.emit("interact", item);
  }

  private describe(id: string): Interactable | null {
    if (id === "signpost") return { id, kind: "signpost", label: "Read the signpost" };
    const spot = this.activitySpot(id);
    if (spot) {
      const def = getActivity(spot.activity);
      if (!def) return null;
      const reason = this.reasonFor(spot, def);
      return { id, kind: "activity", label: def.action, activity: def.id, ...(reason ? { reason } : {}) };
    }
    const npc = this.npc(id);
    if (!npc?.def.characterId) return null;
    return { id, kind: "character", label: npc.def.name ?? "Talk" };
  }

  private setNearby(item: Interactable | null) {
    if (item?.id === this.nearby?.id) return;
    this.nearby = item;
    this.events.emit("nearby", item);
  }

  /** The nearest thing within reach: a character, the signpost, or an activity that can be done now. */
  private nearestInteractable(): Interactable | null {
    if (this.player.activity) return null;
    const p = this.player.pos;
    let best: Interactable | null = null;
    let bestD = INTERACT_RADIUS;
    for (const n of this.npcs) {
      if (!n.visible || !n.def.characterId) continue;
      const d = this.distance(p, n.pos);
      if (d < bestD) {
        bestD = d;
        best = this.describe(n.def.id);
      }
    }
    const sign = this.map.spots.signpost;
    if (sign && this.distance(p, sign) < bestD) {
      bestD = this.distance(p, sign);
      best = this.describe("signpost");
    }
    // Activities reach a little further than people, but someone closer still wins.
    for (const spot of this.map.activitySpots) {
      const d = this.distance(p, spot);
      if (d > spot.radius || (best && d >= bestD)) continue;
      const def = getActivity(spot.activity);
      if (!def || this.reasonFor(spot, def) !== null) continue;
      bestD = d;
      best = { id: spot.id, kind: "activity", label: def.action, activity: def.id };
    }
    return best;
  }

  /** Keep walking up to whoever `approach` is heading for; talk once in reach. */
  private followApproach(dt: number) {
    const id = this.pendingInteract!;
    const p = this.player;
    const target = this.interactablePosition(id);
    if (!target) {
      // They went indoors: stop where we are.
      this.pendingInteract = null;
      return;
    }
    const d = this.distance(p.pos, target);
    const onTheMove = this.npc(id)?.moving ?? false;
    if ((p.path.length === 0 && d <= this.reachOf(id) + 0.6) || (onTheMove && d <= INTERACT_RADIUS)) {
      this.pendingInteract = null;
      p.path = [];
      p.moving = false;
      this.interact(id);
      return;
    }
    // They've moved on since the route was planned, or it ended short of them: head for where they are now.
    this.approachTimer -= dt;
    const drifted = this.distance(target, this.approachGoal) > REPATH_DISTANCE && this.approachTimer <= 0;
    if (p.path.length === 0 || drifted) {
      this.approachTimer = REPATH_SECONDS;
      if (this.approachRoutes >= MAX_APPROACH_ROUTES || !this.routeTo(id, target)) this.pendingInteract = null;
    }
  }

  private checkSurroundings(dt: number) {
    const p = this.player.pos;
    this.setNearby(this.nearestInteractable());

    if (this.pendingInteract && this.canMove()) this.followApproach(dt);

    const region = this.regionAt(p);
    if (region !== this.region) {
      this.region = region;
      this.events.emit("region", region);
    }

    const quest = this.story.quest;
    // Leaving the spot re-arms it, so a failed save can be retried by stepping away and back.
    if (this.arrivedAt) {
      const spot = this.map.spots[this.arrivedAt];
      if (!spot || this.distance(p, spot) > ARRIVE_RADIUS + 1) this.arrivedAt = null;
    }
    if (quest && this.arrivedAt !== quest.target) {
      const spot = this.map.spots[quest.target];
      if (spot && this.distance(p, spot) <= ARRIVE_RADIUS) {
        this.arrivedAt = quest.target;
        this.events.emit("arrive", quest.target);
      }
    }
  }

  private walkableNear(v: Vec): Vec {
    const t = this.grid.nearestWalkable(v.x - 0.5, v.y - 0.5, 20);
    return t ? { x: t.x + 0.5, y: t.y + 0.5 } : v;
  }

  private distance(a: Vec, b: Vec) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }
}
