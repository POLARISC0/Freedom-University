// The ground: one voxel column per tile, with grass tufts, wheat and wildflowers on top, and the jetty's planks.
// Columns carry on past the map edge so the world never ends in a cliff into the void.

import { hash2 } from "@/walk/world/noise";
import { Tile, type WorldMap } from "@/walk/world/types";
import { FACE, VoxelBuilder, type Vec3 } from "./builder";
import { heightAt, JETTY_DECK, tileAt, WATER_LEVEL, type HeightField } from "./heights";

/** How far the ground carries on past the map edge, in tiles. */
export const EDGE = 24;

const TOP: Record<Tile, string> = {
  [Tile.Deep]: "sand",
  [Tile.Shallow]: "sand",
  [Tile.Sand]: "sand",
  [Tile.Grass]: "grass",
  [Tile.Road]: "road",
  [Tile.Plaza]: "plaza",
  [Tile.Field]: "field",
  [Tile.Hill]: "grass",
  [Tile.Jetty]: "sand",
  [Tile.Meadow]: "meadow",
};

const GRASSY = new Set([Tile.Grass, Tile.Hill, Tile.Meadow, Tile.Field]);
const WATERY = new Set([Tile.Deep, Tile.Shallow, Tile.Jetty]);

// Tints per tile type: hills a little drier and more golden than the well-watered town gardens.
const TINT: Partial<Record<Tile, number>> = {
  [Tile.Hill]: 0xf2f0d8,
  [Tile.Deep]: 0x9a9a8a,
  [Tile.Shallow]: 0xd6d2b8,
};

const DIRS: [number, number, number][] = [
  [1, 0, FACE.px],
  [-1, 0, FACE.nx],
  [0, 1, FACE.pz],
  [0, -1, FACE.nz],
];

/** Build the terrain into `b`: column tops with soft corner shading, stepped sides, and the jetty. */
export function buildTerrain(b: VoxelBuilder, map: WorldMap, field: HeightField, occupied: Uint8Array) {
  const bottom = -3;
  const c = { r: 1, g: 1, b: 1 };
  for (let ty = -EDGE; ty < map.height + EDGE; ty++) {
    for (let tx = -EDGE; tx < map.width + EDGE; tx++) {
      const tile = tileAt(field, tx, ty);
      // Under the jetty the lake bed carries on; the deck is added separately.
      const bed = tile === Tile.Jetty ? jettyBed(field, tx, ty) : tile;
      const h = tile === Tile.Jetty ? bedHeight(bed) : heightAt(field, tx, ty);
      const hAt = (x: number, y: number) => {
        const t = tileAt(field, x, y);
        return t === Tile.Jetty ? bedHeight(jettyBed(field, x, y)) : heightAt(field, x, y);
      };

      // Tiny per-tile variation in brightness breaks up the repeating texture.
      const vary = 0.94 + hash2(tx, ty, 5) * 0.1;
      const tint = TINT[bed] ?? 0xffffff;
      const wet = bed === Tile.Sand && nearWater(field, tx, ty) ? 0.86 : 1;
      c.r = (((tint >> 16) & 255) / 255) * vary * wet;
      c.g = (((tint >> 8) & 255) / 255) * vary * wet;
      c.b = ((tint & 255) / 255) * vary * wet * (wet < 1 ? 0.95 : 1);
      const color = (c.r * 255) << 16 | (c.g * 255) << 8 | (c.b * 255);

      // Corner shading: a top corner tucked against higher columns is a little darker, like Minecraft's smooth light.
      const ao = (dx: number, dy: number) => {
        const s1 = hAt(tx + dx, ty) > h ? 1 : 0;
        const s2 = hAt(tx, ty + dy) > h ? 1 : 0;
        const corner = hAt(tx + dx, ty + dy) > h ? 1 : 0;
        const n = s1 && s2 ? 3 : s1 + s2 + corner;
        return [1, 0.86, 0.76, 0.66][n];
      };
      // Corners in face order: origin (x0, z1), +right (x1, z1), +right+up (x1, z0), +up (x0, z0).
      const corners: [number, number, number, number] = [ao(-1, 1), ao(1, 1), ao(1, -1), ao(-1, -1)];
      // Turn each tile's texture a random quarter so the ground doesn't look stamped.
      const turn = Math.floor(hash2(tx, ty, 9) * 4);
      topFace(b, TOP[bed], tx, ty, h, color, corners, turn);

      for (const [dx, dy, bit] of DIRS) {
        const nh = hAt(tx + dx, ty + dy);
        if (nh >= h) continue;
        const from = Math.max(nh, bottom);
        sideFaces(b, bed, tx, ty, dx, dy, bit, from, h, color);
      }
    }
  }
  buildJetty(b, map, field);
  buildGroundCover(b, map, field, occupied);
}

function topFace(b: VoxelBuilder, material: string, tx: number, ty: number, h: number, color: number, corners: [number, number, number, number], turn: number) {
  // Rotating the quad's edges rotates its texture; the corner shading turns with it.
  const x0 = tx;
  const x1 = tx + 1;
  const z0 = ty;
  const z1 = ty + 1;
  const quads: { o: Vec3; r: Vec3; u: Vec3 }[] = [
    { o: [x0, h, z1], r: [1, 0, 0], u: [0, 0, -1] },
    { o: [x1, h, z1], r: [0, 0, -1], u: [-1, 0, 0] },
    { o: [x1, h, z0], r: [-1, 0, 0], u: [0, 0, 1] },
    { o: [x0, h, z0], r: [0, 0, 1], u: [1, 0, 0] },
  ];
  const q = quads[turn];
  const rot = [corners[turn % 4], corners[(turn + 1) % 4], corners[(turn + 2) % 4], corners[(turn + 3) % 4]] as [number, number, number, number];
  b.face(material, q.o, q.r, q.u, color, { normal: [0, 1, 0], corners: rot, uvOffset: [-dotUv(q.o, q.r), -dotUv(q.o, q.u)] });
}

const dotUv = (p: Vec3, d: Vec3) => p[0] * d[0] + p[1] * d[1] + p[2] * d[2];

function sideFaces(b: VoxelBuilder, tile: Tile, tx: number, ty: number, dx: number, dy: number, bit: number, from: number, to: number, color: number) {
  const box = (material: string, y0: number, y1: number, uvOffset: [number, number]) =>
    b.box(material, [tx, y0, ty], [tx + 1, y1, ty + 1], color, { skip: 63 & ~bit, uvOffset });
  if (GRASSY.has(tile)) {
    // Grass hangs over the top half-block; earth below. The fringe lines up with the top of the step.
    const split = Math.max(from, to - 0.5);
    box(tile === Tile.Field ? "grassSide" : "grassSide", split, to, [0, 1 - to]);
    if (split > from) box("dirt", from, split, [0, 0]);
  } else if (tile === Tile.Plaza) {
    box("stone", from, to, [0, 0]);
  } else if (tile === Tile.Road) {
    box("dirt", from, to, [0, 0]);
  } else {
    box("sand", from, to, [0, 0]);
  }
  void dx;
  void dy;
}

function bedHeight(tile: Tile): number {
  return tile === Tile.Deep ? -1 : tile === Tile.Shallow ? 0 : 0.5;
}

/** What the ground under a stretch of jetty would be: water if it reaches out over the lake, else sand. */
function jettyBed(field: HeightField, tx: number, ty: number): Tile {
  for (const [dx, dy] of [
    [-1, 0],
    [1, 0],
    [-2, 0],
    [2, 0],
  ]) {
    const t = tileAt(field, tx + dx, ty + dy);
    if (t === Tile.Deep || t === Tile.Shallow) return t;
    if (t === Tile.Sand) return Tile.Sand;
  }
  return Tile.Shallow;
}

function nearWater(field: HeightField, tx: number, ty: number): boolean {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const t = tileAt(field, tx + dx, ty + dy);
      if (t === Tile.Deep || t === Tile.Shallow) return true;
    }
  }
  return false;
}

/** Planks on posts, from the beach out over the water. */
function buildJetty(b: VoxelBuilder, map: WorldMap, field: HeightField) {
  for (let ty = 0; ty < map.height; ty++) {
    for (let tx = 0; tx < map.width; tx++) {
      if (tileAt(field, tx, ty) !== Tile.Jetty) continue;
      const tone = 0.92 + hash2(tx, ty, 3) * 0.12;
      const plank = new ColorScale(0xffffff, tone);
      b.box("planks", [tx, JETTY_DECK - 0.16, ty], [tx + 1, JETTY_DECK, ty + 1], plank.hex, { skip: sideSkip(field, tx, ty) });
      // Posts at the corners of every other row, down into the lake bed.
      if (ty % 2 === 0) {
        const left = tileAt(field, tx - 1, ty) !== Tile.Jetty;
        const right = tileAt(field, tx + 1, ty) !== Tile.Jetty;
        const bed = bedHeight(jettyBed(field, tx, ty));
        if (left) b.box("bark", [tx - 0.06, bed - 0.2, ty + 0.4], [tx + 0.14, JETTY_DECK + 0.12, ty + 0.6], 0xcdbca8);
        if (right) b.box("bark", [tx + 0.86, bed - 0.2, ty + 0.4], [tx + 1.06, JETTY_DECK + 0.12, ty + 0.6], 0xcdbca8);
      }
    }
  }
}

function sideSkip(field: HeightField, tx: number, ty: number): number {
  let skip = 0;
  if (tileAt(field, tx + 1, ty) === Tile.Jetty) skip |= FACE.px;
  if (tileAt(field, tx - 1, ty) === Tile.Jetty) skip |= FACE.nx;
  if (tileAt(field, tx, ty + 1) === Tile.Jetty) skip |= FACE.pz;
  if (tileAt(field, tx, ty - 1) === Tile.Jetty) skip |= FACE.nz;
  return skip;
}

class ColorScale {
  readonly hex: number;
  constructor(color: number, k: number) {
    const ch = (s: number) => Math.min(255, Math.round(((color >> s) & 255) * k));
    this.hex = (ch(16) << 16) | (ch(8) << 8) | ch(0);
  }
}

const FLOWER_COLORS = [0xe0483e, 0xf6f2e4, 0xa678cc, 0xf2cc40, 0xe86aa0];

/** Grass tufts, standing wheat and wildflowers, so the ground has some depth. All of it sways in the wind. */
function buildGroundCover(b: VoxelBuilder, map: WorldMap, field: HeightField, occupied: Uint8Array) {
  for (let ty = 0; ty < map.height; ty++) {
    for (let tx = 0; tx < map.width; tx++) {
      if (occupied[ty * map.width + tx]) continue;
      const tile = tileAt(field, tx, ty);
      const h = heightAt(field, tx, ty);
      const r = (k: number) => hash2(tx, ty, 40 + k);
      if (tile === Tile.Field) {
        // Rows of wheat, each stalk a thin block with a golden ear.
        for (let k = 0; k < 6; k++) {
          const x = tx + 0.12 + (k % 3) * 0.33 + (r(k) - 0.5) * 0.12;
          const z = ty + 0.2 + Math.floor(k / 3) * 0.5 + (r(k + 7) - 0.5) * 0.15;
          const top = h + 0.42 + r(k + 13) * 0.18;
          b.box("plain", [x, h, z], [x + 0.06, top - 0.12, z + 0.06], 0xc8a650, { sway: [0, 0.6] });
          b.box("plain", [x - 0.02, top - 0.14, z - 0.02], [x + 0.08, top, z + 0.08], 0xe8c860, { sway: 0.7 });
        }
      } else if (tile === Tile.Grass || tile === Tile.Hill || tile === Tile.Meadow) {
        if (r(0) < 0.32) {
          const x = tx + 0.15 + r(1) * 0.6;
          const z = ty + 0.15 + r(2) * 0.6;
          const green = tile === Tile.Hill ? 0x8fae55 : 0x6f9e44;
          b.box("plain", [x, h, z], [x + 0.06, h + 0.2, z + 0.06], green, { sway: [0, 0.4] });
          b.box("plain", [x + 0.08, h, z + 0.04], [x + 0.14, h + 0.14, z + 0.1], green, { sway: [0, 0.3] });
          b.box("plain", [x - 0.06, h, z + 0.06], [x, h + 0.12, z + 0.12], green, { sway: [0, 0.3] });
        }
        if (tile === Tile.Meadow && r(3) < 0.5) {
          const x = tx + 0.2 + r(4) * 0.6;
          const z = ty + 0.2 + r(5) * 0.6;
          const color = FLOWER_COLORS[Math.floor(r(6) * FLOWER_COLORS.length)];
          b.box("plain", [x, h, z], [x + 0.04, h + 0.16, z + 0.04], 0x5f8a3b, { sway: [0, 0.4] });
          b.box("plain", [x - 0.04, h + 0.14, z - 0.04], [x + 0.08, h + 0.22, z + 0.08], color, { sway: 0.45 });
        }
      }
    }
  }
}

/** Tiles covered by objects, where no grass tufts should poke through. */
export function occupiedTiles(map: WorldMap): Uint8Array {
  const out = new Uint8Array(map.width * map.height);
  for (const o of map.objects) {
    for (let y = Math.floor(o.y); y < Math.max(Math.floor(o.y) + 1, Math.ceil(o.y + o.h)); y++) {
      for (let x = Math.floor(o.x); x < Math.max(Math.floor(o.x) + 1, Math.ceil(o.x + o.w)); x++) {
        if (x >= 0 && y >= 0 && x < map.width && y < map.height) out[y * map.width + x] = 1;
      }
    }
  }
  return out;
}

export { WATER_LEVEL, WATERY };
