import { Tile, WATER_TILES, type Vec, type WorldMap } from "./types";

/** Which tiles can be walked on, combining terrain and solid objects. */
export class WalkGrid {
  readonly width: number;
  readonly height: number;
  private readonly blocked: Uint8Array;

  constructor(map: WorldMap) {
    this.width = map.width;
    this.height = map.height;
    this.blocked = new Uint8Array(map.width * map.height);
    for (let i = 0; i < map.tiles.length; i++) {
      if (WATER_TILES.has(map.tiles[i] as Tile)) this.blocked[i] = 1;
    }
    for (const o of map.objects) {
      if (!o.solid) continue;
      for (let y = o.y; y < o.y + o.h; y++) {
        for (let x = o.x; x < o.x + o.w; x++) this.setBlocked(x, y, true);
      }
    }
    // The jetty is planks over water: walkable even though the water under it isn't.
    for (let i = 0; i < map.tiles.length; i++) if (map.tiles[i] === Tile.Jetty) this.blocked[i] = 0;
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  isWalkable(x: number, y: number): boolean {
    return this.inBounds(x, y) && this.blocked[y * this.width + x] === 0;
  }

  setBlocked(x: number, y: number, blocked: boolean) {
    if (this.inBounds(x, y)) this.blocked[y * this.width + x] = blocked ? 1 : 0;
  }

  /** The walkable tile closest to (x, y), searching outward in rings. */
  nearestWalkable(x: number, y: number, maxRadius = 12): Vec | null {
    const cx = Math.round(x);
    const cy = Math.round(y);
    if (this.isWalkable(cx, cy)) return { x: cx, y: cy };
    for (let r = 1; r <= maxRadius; r++) {
      let best: Vec | null = null;
      let bestD = Infinity;
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const tx = cx + dx;
          const ty = cy + dy;
          if (!this.isWalkable(tx, ty)) continue;
          const d = (tx - x) ** 2 + (ty - y) ** 2;
          if (d < bestD) {
            bestD = d;
            best = { x: tx, y: ty };
          }
        }
      }
      if (best) return best;
    }
    return null;
  }
}

/** Half-size of a walker's foot box, in tiles. Kept small so people can walk between market stalls. */
export const FOOT_HALF_W = 0.28;
export const FOOT_HALF_H = 0.18;

/** Whether a walker standing at (x, y) (feet position, in tiles) overlaps a blocked tile. */
export function collides(grid: WalkGrid, x: number, y: number): boolean {
  const minX = Math.floor(x - FOOT_HALF_W);
  const maxX = Math.floor(x + FOOT_HALF_W);
  const minY = Math.floor(y - FOOT_HALF_H);
  const maxY = Math.floor(y + FOOT_HALF_H);
  for (let ty = minY; ty <= maxY; ty++) {
    for (let tx = minX; tx <= maxX; tx++) if (!grid.isWalkable(tx, ty)) return true;
  }
  return false;
}

/** Move with axis-separated collision so walkers slide along walls instead of sticking. */
export function moveWithCollision(grid: WalkGrid, pos: Vec, dx: number, dy: number): Vec {
  let { x, y } = pos;
  if (dx !== 0 && !collides(grid, x + dx, y)) x += dx;
  if (dy !== 0 && !collides(grid, x, y + dy)) y += dy;
  return { x, y };
}
