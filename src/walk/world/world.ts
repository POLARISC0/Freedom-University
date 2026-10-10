import { WorldClock } from "./clock";
import { Emitter } from "./events";
import { collides, moveWithCollision, WalkGrid } from "./grid";
import { rng } from "./noise";
import { findPath } from "./pathfind";
import type { StoryState } from "./story";
import type { Facing, NpcDef, ScheduleEntry, Vec, WorldMap } from "./types";

export const PLAYER_SPEED = 4.2; // tiles per second
export const INTERACT_RADIUS = 1.7;
export const ARRIVE_RADIUS = 1.8;

export interface Walker {
  pos: Vec;
  facing: Facing;
  moving: boolean;
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
}

export interface Interactable {
  id: string;
  kind: "character" | "signpost";
  label: string;
}

export interface WorldEvents extends Record<string, unknown> {
  nearby: Interactable | null;
  interact: Interactable;
  region: string;
  arrive: string;
  clock: number;
}

export interface SavedState {
  x: number;
  y: number;
  facing: Facing;
  minutes: number;
}

function facingFor(dx: number, dy: number, fallback: Facing): Facing {
  if (Math.abs(dx) < 1e-4 && Math.abs(dy) < 1e-4) return fallback;
  return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
}

function scheduleAt(schedule: ScheduleEntry[], hour: number): ScheduleEntry | null {
  return schedule.find((e) => (e.from <= e.to ? hour >= e.from && hour < e.to : hour >= e.from || hour < e.to)) ?? null;
}

/**
 * The simulation: player, people, animals and time of day. Renderers read `player`, `npcs` and `clock` every
 * frame; the UI listens to `events` and calls the control methods.
 */
export class World {
  readonly map: WorldMap;
  readonly grid: WalkGrid;
  readonly clock: WorldClock;
  readonly events = new Emitter<WorldEvents>();
  readonly player: Walker & { path: Vec[] };
  readonly npcs: NpcState[];

  private input: Vec = { x: 0, y: 0 };
  private inputEnabled = true;
  private pendingInteract: string | null = null;
  private story: StoryState = { mentorSpots: {}, quest: null, mentorsWithLessons: [] };
  private talkingTo: string | null = null;
  private nearby: Interactable | null = null;
  private region = "";
  private arrivedAt: string | null = null;
  private clockAccumulator = 0;
  private random = rng(2026);

  constructor(map: WorldMap, saved?: Partial<SavedState>) {
    this.map = map;
    this.grid = new WalkGrid(map);
    this.clock = new WorldClock(saved?.minutes ?? 7 * 60);
    const start = saved && typeof saved.x === "number" && typeof saved.y === "number" ? { x: saved.x, y: saved.y } : map.spawn;
    const pos = collides(this.grid, start.x, start.y) ? this.walkableNear(map.spawn) : start;
    this.player = { pos, facing: saved?.facing ?? "down", moving: false, path: [] };
    this.npcs = map.npcs.map((def) => this.createNpc(def));
  }

  // ---- Controls ------------------------------------------------------------------------------------------------

  /** Keyboard or joystick direction, each axis -1..1. Cancels any tap-to-move path. */
  setInput(x: number, y: number) {
    this.input = { x, y };
    if (x !== 0 || y !== 0) {
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
    }
  }

  /** Tap-to-move: walk to a tile (or as close as possible). */
  walkTo(target: Vec) {
    if (!this.inputEnabled) return;
    this.pendingInteract = null;
    const goal = this.grid.nearestWalkable(target.x - 0.5, target.y - 0.5, 6);
    if (!goal) return;
    this.player.path = findPath(this.grid, this.player.pos, goal) ?? [];
  }

  /** Walk up to a character (or the signpost) and talk to them on arrival. */
  approach(id: string) {
    if (!this.inputEnabled) return;
    const target = this.interactablePosition(id);
    if (!target) return;
    if (this.distance(this.player.pos, target) <= INTERACT_RADIUS) {
      this.interact(id);
      return;
    }
    const goal = this.grid.nearestWalkable(target.x - 0.5, target.y + 0.5, 4);
    if (!goal) return;
    this.player.path = findPath(this.grid, this.player.pos, goal) ?? [];
    this.pendingInteract = id;
  }

  /** Walk to a named spot, e.g. a mentor's place when the player picks "take me there". */
  walkToSpot(spotId: string) {
    const spot = this.map.spots[spotId];
    if (spot) this.walkTo(spot);
  }

  /** Talk to whatever is nearby. */
  interactNearby() {
    if (this.inputEnabled && this.nearby) this.interact(this.nearby.id);
  }

  setStory(story: StoryState) {
    this.story = story;
    if (this.arrivedAt && this.arrivedAt !== story.quest?.target) this.arrivedAt = null;
  }

  get storyState(): StoryState {
    return this.story;
  }

  /**
   * Bring a character straight to where the story needs them (beside a quest spot) if they're still far away,
   * so a scene never starts without them. Close by, they keep walking the last few steps.
   */
  settle(id: string) {
    const npc = this.npc(id);
    if (!npc || !npc.goal) return;
    if (this.distance(npc.pos, npc.anchor) > 5) {
      npc.pos = { ...npc.anchor };
      npc.path = [];
      npc.visible = true;
    }
  }

  /** The character the player is talking to stops and faces them. */
  setTalkingTo(id: string | null) {
    this.talkingTo = id;
  }

  save(): SavedState {
    return { x: this.player.pos.x, y: this.player.pos.y, facing: this.player.facing, minutes: Math.round(this.clock.minutes) };
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

  // ---- Simulation ----------------------------------------------------------------------------------------------

  update(dt: number) {
    dt = Math.min(dt, 0.1);
    this.clock.tick(dt);
    this.clockAccumulator += dt;
    if (this.clockAccumulator > 0.5) {
      this.clockAccumulator = 0;
      this.events.emit("clock", this.clock.minutes);
    }
    this.updatePlayer(dt);
    for (const npc of this.npcs) this.updateNpc(npc, dt);
    this.checkSurroundings();
  }

  private updatePlayer(dt: number) {
    const p = this.player;
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
      visible: true,
      path: [],
      goal: null,
      wanderRadius: def.wander ?? 0,
      anchor: { x: 0, y: 0 },
      idle: this.random() * 4,
      face: def.facing ?? null,
      speed: def.speed,
    };
    // Start everyone where they should be right now, so the world looks settled on load.
    const plan = this.planFor(npc);
    const at = this.standPoint(plan.spot ?? def.home, plan.offsetForMentor);
    npc.pos = at;
    npc.anchor = at;
    npc.goal = plan.spot;
    npc.visible = plan.spot !== null;
    npc.wanderRadius = plan.wander;
    npc.face = plan.face;
    if (plan.face) npc.facing = plan.face;
    return npc;
  }

  /** Where an NPC wants to be right now. */
  private planFor(npc: NpcState): { spot: string | null; wander: number; face: Facing | null; offsetForMentor: boolean } {
    const def = npc.def;
    const override = def.characterId ? this.story.mentorSpots[def.characterId] : undefined;
    if (override) return { spot: override, wander: 0, face: null, offsetForMentor: true };
    // The widow stays by the well while Matthew's quest sends the player to find her.
    if (def.id === "widow") return { spot: def.home, wander: 0, face: def.facing ?? null, offsetForMentor: false };
    if (def.schedule) {
      const entry = scheduleAt(def.schedule, this.clock.hour);
      if (!entry || !entry.spot) return { spot: null, wander: 0, face: null, offsetForMentor: false };
      return { spot: entry.spot, wander: entry.wander, face: entry.face ?? null, offsetForMentor: false };
    }
    return { spot: def.home, wander: def.wander ?? 0, face: def.facing ?? null, offsetForMentor: false };
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

    // Someone in conversation with the player pauses and turns to them, but keeps their route for afterwards.
    if (this.talkingTo === npc.def.id && this.distance(npc.pos, this.player.pos) < 4) {
      npc.moving = false;
      npc.facing = facingFor(this.player.pos.x - npc.pos.x, this.player.pos.y - npc.pos.y, npc.facing);
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
      return;
    }
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

  private interactablePosition(id: string): Vec | null {
    if (id === "signpost") return this.map.spots.signpost ?? null;
    const npc = this.npc(id);
    return npc?.visible ? npc.pos : null;
  }

  private interact(id: string) {
    const item = this.describe(id);
    if (item) this.events.emit("interact", item);
  }

  private describe(id: string): Interactable | null {
    if (id === "signpost") return { id, kind: "signpost", label: "Read the signpost" };
    const npc = this.npc(id);
    if (!npc?.def.characterId) return null;
    return { id, kind: "character", label: npc.def.name ?? "Talk" };
  }

  private checkSurroundings() {
    const p = this.player.pos;

    // Nearest character or sign within reach.
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
    if (sign && this.distance(p, sign) < bestD) best = this.describe("signpost");
    if (best?.id !== this.nearby?.id) {
      this.nearby = best;
      this.events.emit("nearby", best);
    }

    if (this.pendingInteract && this.player.path.length === 0) {
      const target = this.interactablePosition(this.pendingInteract);
      const id = this.pendingInteract;
      this.pendingInteract = null;
      if (target && this.distance(p, target) <= INTERACT_RADIUS + 0.6) this.interact(id);
    }

    const region = this.regionAt(p);
    if (region !== this.region) {
      this.region = region;
      this.events.emit("region", region);
    }

    const quest = this.story.quest;
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
