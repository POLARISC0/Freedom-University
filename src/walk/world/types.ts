// The world model is independent of any renderer. Positions are in tiles (floating point for moving things): x runs
// east, y runs south. The 3D renderer reads exactly this data; nothing here knows how it is drawn.

import type { Appearance } from "@/walk/content";

export interface Vec {
  x: number;
  y: number;
}

export enum Tile {
  Deep = 0,
  Shallow = 1,
  Sand = 2,
  Grass = 3,
  Road = 4,
  Plaza = 5,
  Field = 6,
  Hill = 7,
  Jetty = 8,
  Meadow = 9,
}

export const WATER_TILES = new Set([Tile.Deep, Tile.Shallow]);

export type ObjectKind =
  | "house"
  | "synagogue"
  | "stall"
  | "well"
  | "taxBooth"
  | "boat"
  | "olive"
  | "palm"
  | "fig"
  | "rock"
  | "prayerRock"
  | "bush"
  | "reeds"
  | "flowers"
  | "nets"
  | "fire"
  | "jars"
  | "baskets"
  | "signpost"
  | "lantern"
  /** A low table with a mat, bread and fish, where people share a meal. */
  | "table"
  /** A small cooking fire in a courtyard. */
  | "cookfire";

export interface WorldObject {
  id: string;
  kind: ObjectKind;
  /** Top-left tile of the footprint. */
  x: number;
  y: number;
  /** Footprint in tiles. */
  w: number;
  h: number;
  /** Whether the footprint blocks movement. */
  solid: boolean;
  /** Visual variant (colour scheme, shape). */
  variant?: number;
  /** Boats on the water bob; flipped boats face the other way. */
  flip?: boolean;
  floating?: boolean;
  /** Emits light at night (windows, fire, lanterns). */
  light?: { x: number; y: number; radius: number; color: number; always?: boolean };
}

export interface Spot {
  id: string;
  x: number;
  y: number;
  label: string;
}

export interface Region {
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** How a person holds themselves while not walking. Renderers pick an animation from it. */
export type Pose = "stand" | "kneel" | "sit" | "work" | "sleep";

/** One entry in an NPC's day. Hours are 0-24 in game time; `spot` null means indoors (hidden). */
export interface ScheduleEntry {
  from: number;
  to: number;
  spot: string | null;
  /** How far they wander around the spot, in tiles. 0 stands still. */
  wander: number;
  /** Which way to face while standing there. */
  face?: Facing;
  /** What they are doing there once arrived (kneeling in prayer, working at the nets...). Default "stand". */
  pose?: Pose;
  /** Shown when the player looks at them, e.g. "Praying alone before dawn (Mark 1:35)". */
  doing?: string;
}

/** A place where the player can do something that feeds a spiritual need (pray, read, rest, help...). */
export interface ActivitySpot {
  id: string;
  /** An activity id from `@/walk/life/activities`. */
  activity: string;
  x: number;
  y: number;
  /** How close the player must be, in tiles. */
  radius: number;
}

export type WeatherKind = "clear" | "cloudy" | "mist" | "rain" | "windy";

/** The weather right now. Every level is 0..1 so renderers can blend smoothly between kinds. */
export interface Weather {
  kind: WeatherKind;
  /** Cloud cover: dims the sun. */
  cloud: number;
  /** Rainfall. */
  rain: number;
  /** Mist or haze: shortens how far you can see. */
  fog: number;
  /** Wind: waves on the lake, swaying trees and boats. */
  wind: number;
  /** For the HUD, e.g. "Morning mist over the lake". */
  label: string;
}

export interface NpcDef {
  id: string;
  /** A Character id for mentors and disciples, a townsfolk id, or "" for anonymous townsfolk. */
  characterId?: string;
  name?: string;
  role: "mentor" | "disciple" | "townsfolk" | "animal";
  appearance: Appearance;
  /** Animals use a different sprite. */
  species?: "sheep";
  home: string;
  /** Without a schedule the NPC stays near home all day. */
  schedule?: ScheduleEntry[];
  wander?: number;
  /** Tiles per second. */
  speed: number;
  /** Initial facing. */
  facing?: Facing;
}

export type Facing = "down" | "up" | "left" | "right";

export interface WorldMap {
  id: string;
  name: string;
  width: number;
  height: number;
  tiles: Uint8Array;
  objects: WorldObject[];
  spots: Record<string, Spot>;
  regions: Region[];
  npcs: NpcDef[];
  /** Places to pray, read, rest, help and share meals. */
  activitySpots: ActivitySpot[];
  spawn: Vec;
}
