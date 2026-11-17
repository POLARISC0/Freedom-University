// Terrain heights for the 3D world, in blocks (one block is one tile wide). Pure functions over the map, so the
// renderer, tap picking and the tests all agree on where the ground is.

import { fbm } from "@/walk/world/noise";
import { Tile, type WorldMap } from "@/walk/world/types";

/** The surface of the Sea of Galilee. */
export const WATER_LEVEL = 0.3;
/** The jetty's planks stand a little above the beach. */
export const JETTY_DECK = 0.75;
/** Heights step in half blocks, like slabs. */
export const STEP = 0.5;

const BASE: Record<Tile, number> = {
  [Tile.Deep]: -1,
  [Tile.Shallow]: 0,
  [Tile.Sand]: 0.5,
  [Tile.Grass]: 1,
  [Tile.Road]: 1,
  [Tile.Plaza]: 1,
  [Tile.Field]: 1,
  [Tile.Hill]: 1,
  [Tile.Jetty]: JETTY_DECK,
  [Tile.Meadow]: 1,
};

const isHill = (t: Tile) => t === Tile.Hill || t === Tile.Meadow;
const isWater = (t: Tile) => t === Tile.Deep || t === Tile.Shallow;

export interface HeightField {
  width: number;
  height: number;
  /** Top of each tile's column, row by row. */
  heights: Float32Array;
  tiles: Uint8Array;
  /** The highest column top. */
  max: number;
}

/**
 * Work out every tile's height. Water and the beach sit low, the town a block up, and the hills to the north-west
 * rise in half-block terraces: higher the further they are from the lowland and the closer to the north-west corner,
 * with broad noise so the slopes roll naturally. Paths through the hills are smoothed so they climb gently, and no
 * two neighbouring land tiles differ by more than one half-block step.
 */
export function buildHeights(map: Pick<WorldMap, "width" | "height" | "tiles">): HeightField {
  const { width: w, height: h, tiles } = map;
  const n = w * h;
  const at = (x: number, y: number) => tiles[y * w + x] as Tile;

  // The hill zone: hill and meadow tiles, and paths that run through them.
  const zone = new Uint8Array(n);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const t = at(x, y);
      if (isHill(t)) zone[y * w + x] = 1;
      else if (t === Tile.Road) {
        let hills = 0;
        for (let j = -2; j <= 2; j++) {
          for (let i = -2; i <= 2; i++) {
            const nx = x + i;
            const ny = y + j;
            if (nx >= 0 && ny >= 0 && nx < w && ny < h && isHill(at(nx, ny))) hills++;
          }
        }
        if (hills >= 6) zone[y * w + x] = 1;
      }
    }
  }

  // Distance from the lowland (chamfer distance transform). The map edge is not lowland: the hills carry on past it.
  const dist = new Float32Array(n);
  for (let i = 0; i < n; i++) dist[i] = zone[i] ? Infinity : 0;
  const D = 1;
  const DD = Math.SQRT2;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (dist[i] === 0) continue;
      let d = dist[i];
      if (x > 0) d = Math.min(d, dist[i - 1] + D);
      if (y > 0) d = Math.min(d, dist[i - w] + D);
      if (x > 0 && y > 0) d = Math.min(d, dist[i - w - 1] + DD);
      if (x < w - 1 && y > 0) d = Math.min(d, dist[i - w + 1] + DD);
      dist[i] = d;
    }
  }
  for (let y = h - 1; y >= 0; y--) {
    for (let x = w - 1; x >= 0; x--) {
      const i = y * w + x;
      if (dist[i] === 0) continue;
      let d = dist[i];
      if (x < w - 1) d = Math.min(d, dist[i + 1] + D);
      if (y < h - 1) d = Math.min(d, dist[i + w] + D);
      if (x < w - 1 && y < h - 1) d = Math.min(d, dist[i + w + 1] + DD);
      if (x > 0 && y < h - 1) d = Math.min(d, dist[i + w - 1] + DD);
      dist[i] = d;
    }
  }

  // How high each hill tile wants to be, before terracing.
  const raw = new Float32Array(n);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!zone[i]) continue;
      const fromEdge = Math.min(Number.isFinite(dist[i]) ? dist[i] : 12, 12);
      const northWest = Math.max(0, Math.min(1, 1 - (x + y) / 45));
      // Broad swells and hollows so the hilltops roll in terraces rather than sitting flat.
      raw[i] = Math.max(0, fromEdge * 0.25 + northWest * 2 + (fbm(x * 0.08, y * 0.08, 31, 2) - 0.5) * 5);
    }
  }
  // Paths take the average of the hillside around them, so they climb steadily instead of following every bump.
  const smoothed = raw.slice();
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!zone[i] || at(x, y) !== Tile.Road) continue;
      let sum = 0;
      let count = 0;
      for (let j = -2; j <= 2; j++) {
        for (let k = -2; k <= 2; k++) {
          const nx = x + k;
          const ny = y + j;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h || !zone[ny * w + nx]) continue;
          sum += raw[ny * w + nx];
          count++;
        }
      }
      smoothed[i] = count ? sum / count : raw[i];
    }
  }

  const heights = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = tiles[i] as Tile;
    heights[i] = BASE[t] ?? 1;
    if (zone[i]) heights[i] += Math.round(smoothed[i] / STEP) * STEP;
  }

  const land = (i: number) => !isWater(tiles[i] as Tile) && tiles[i] !== Tile.Jetty;

  // Fill narrow hollows and level narrow bumps on the hills (a tile with three of its four neighbours higher, or
  // lower): they read as holes and posts, not as a hillside.
  for (let pass = 0; pass < 3; pass++) {
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        if (!zone[i]) continue;
        const around = [i - 1, i + 1, i - w, i + w].filter(land).map((k) => heights[k]);
        if (around.length < 4) continue;
        const higher = around.filter((v) => v > heights[i]);
        const lower = around.filter((v) => v < heights[i]);
        if (higher.length >= 3) heights[i] = Math.min(...higher);
        else if (lower.length >= 3) heights[i] = Math.max(...lower);
      }
    }
  }

  // Limit every land step to half a block, by lowering the higher side until nothing changes.
  for (let changed = true, guard = 0; changed && guard < 64; guard++) {
    changed = false;
    for (let pass = 0; pass < 2; pass++) {
      for (let k = 0; k < n; k++) {
        const i = pass === 0 ? k : n - 1 - k;
        if (!land(i)) continue;
        const x = i % w;
        let limit = heights[i];
        if (x > 0 && land(i - 1)) limit = Math.min(limit, heights[i - 1] + STEP);
        if (x < w - 1 && land(i + 1)) limit = Math.min(limit, heights[i + 1] + STEP);
        if (i >= w && land(i - w)) limit = Math.min(limit, heights[i - w] + STEP);
        if (i + w < n && land(i + w)) limit = Math.min(limit, heights[i + w] + STEP);
        if (limit < heights[i]) {
          heights[i] = limit;
          changed = true;
        }
      }
    }
  }

  let max = -Infinity;
  for (let i = 0; i < n; i++) max = Math.max(max, heights[i]);
  return { width: w, height: h, heights, tiles, max };
}

/** Height of the top of a tile's column. Tiles past the map edge repeat the nearest edge tile. */
export function heightAt(field: HeightField, tileX: number, tileY: number): number {
  const x = Math.max(0, Math.min(field.width - 1, Math.floor(tileX)));
  const y = Math.max(0, Math.min(field.height - 1, Math.floor(tileY)));
  return field.heights[y * field.width + x];
}

/** The tile type at a tile, clamped to the map like `heightAt`. */
export function tileAt(field: HeightField, tileX: number, tileY: number): Tile {
  const x = Math.max(0, Math.min(field.width - 1, Math.floor(tileX)));
  const y = Math.max(0, Math.min(field.height - 1, Math.floor(tileY)));
  return field.tiles[y * field.width + x] as Tile;
}

const RAMP = 0.25;

/**
 * Where a person's feet go at a point (in tiles). Inside a tile it is that tile's height; within a quarter tile of a
 * step it ramps to halfway, so walking up or down a terrace is smooth instead of a jump. Water doesn't pull the
 * ground down: the jetty's edge stays level.
 */
export function groundHeight(field: HeightField, x: number, y: number): number {
  const tx = Math.floor(x);
  const ty = Math.floor(y);
  const h0 = heightAt(field, tx, ty);
  const fx = x - tx;
  const fy = y - ty;
  const towards = (nx: number, ny: number, f: number) => {
    if (isWater(tileAt(field, nx, ny))) return 0;
    const t = Math.max(0, (f - (1 - RAMP)) / RAMP) * 0.5;
    return (heightAt(field, nx, ny) - h0) * t;
  };
  let dh = 0;
  if (fx > 1 - RAMP) dh += towards(tx + 1, ty, fx);
  else if (fx < RAMP) dh += towards(tx - 1, ty, 1 - fx);
  if (fy > 1 - RAMP) dh += towards(tx, ty + 1, fy);
  else if (fy < RAMP) dh += towards(tx, ty - 1, 1 - fy);
  return h0 + dh;
}

/** The lowest column top under a footprint, so objects sit down into higher ground rather than float. */
export function footprintBase(field: HeightField, x: number, y: number, w: number, h: number): number {
  let low = Infinity;
  for (let j = Math.floor(y); j < Math.max(Math.floor(y) + 1, Math.ceil(y + h)); j++) {
    for (let i = Math.floor(x); i < Math.max(Math.floor(x) + 1, Math.ceil(x + w)); i++) low = Math.min(low, heightAt(field, i, j));
  }
  return low;
}

/**
 * The first point where a ray (in world units, y up, x east, z south) meets the ground or the water surface, by
 * marching through the height field. Null when it never does within `maxDistance`.
 */
export function raycastGround(
  field: HeightField,
  origin: { x: number; y: number; z: number },
  dir: { x: number; y: number; z: number },
  maxDistance = 400,
): { x: number; z: number } | null {
  const step = 0.05;
  const top = Math.max(field.max, WATER_LEVEL);
  // Start where the ray comes down to the highest hilltop; nothing above that can be hit.
  let t = origin.y > top && dir.y < 0 ? (origin.y - top) / -dir.y : 0;
  for (; t < maxDistance; t += step) {
    const px = origin.x + dir.x * t;
    const py = origin.y + dir.y * t;
    const pz = origin.z + dir.z * t;
    if (py <= Math.max(heightAt(field, px, pz), WATER_LEVEL)) return { x: px, z: pz };
    if (py > top && dir.y >= 0) return null;
  }
  return null;
}
