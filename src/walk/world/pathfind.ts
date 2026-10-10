import type { WalkGrid } from "./grid";
import type { Vec } from "./types";

const DIRS = [
  [1, 0, 1],
  [-1, 0, 1],
  [0, 1, 1],
  [0, -1, 1],
  [1, 1, Math.SQRT2],
  [1, -1, Math.SQRT2],
  [-1, 1, Math.SQRT2],
  [-1, -1, Math.SQRT2],
] as const;

/** A binary min-heap keyed by f-score. */
class Heap {
  private items: { node: number; f: number }[] = [];
  get size() {
    return this.items.length;
  }
  push(node: number, f: number) {
    const items = this.items;
    items.push({ node, f });
    let i = items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (items[parent].f <= items[i].f) break;
      [items[parent], items[i]] = [items[i], items[parent]];
      i = parent;
    }
  }
  pop(): number {
    const items = this.items;
    const top = items[0];
    const last = items.pop()!;
    if (items.length > 0) {
      items[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < items.length && items[l].f < items[m].f) m = l;
        if (r < items.length && items[r].f < items[m].f) m = r;
        if (m === i) break;
        [items[m], items[i]] = [items[i], items[m]];
        i = m;
      }
    }
    return top.node;
  }
}

/**
 * A* over walkable tiles with 8-way movement (no cutting corners). Returns tile centres from the first step after
 * `from` up to and including `to`, or null if there is no route.
 */
export function findPath(grid: WalkGrid, from: Vec, to: Vec, maxNodes = 20000): Vec[] | null {
  const sx = Math.floor(from.x);
  const sy = Math.floor(from.y);
  const tx = Math.floor(to.x);
  const ty = Math.floor(to.y);
  if (!grid.isWalkable(tx, ty)) return null;
  if (sx === tx && sy === ty) return [];
  const w = grid.width;
  const start = sy * w + sx;
  const goal = ty * w + tx;
  const g = new Map<number, number>([[start, 0]]);
  const came = new Map<number, number>();
  const closed = new Set<number>();
  const heap = new Heap();
  const h = (x: number, y: number) => {
    const dx = Math.abs(x - tx);
    const dy = Math.abs(y - ty);
    return Math.max(dx, dy) + (Math.SQRT2 - 1) * Math.min(dx, dy);
  };
  heap.push(start, h(sx, sy));
  let expanded = 0;
  while (heap.size > 0) {
    const node = heap.pop();
    if (node === goal) break;
    if (closed.has(node)) continue;
    closed.add(node);
    if (++expanded > maxNodes) return null;
    const x = node % w;
    const y = (node - x) / w;
    for (const [dx, dy, cost] of DIRS) {
      const nx = x + dx;
      const ny = y + dy;
      if (!grid.isWalkable(nx, ny)) continue;
      // No squeezing diagonally between two blocked tiles.
      if (dx !== 0 && dy !== 0 && (!grid.isWalkable(x + dx, y) || !grid.isWalkable(x, y + dy))) continue;
      const next = ny * w + nx;
      const score = (g.get(node) ?? Infinity) + cost;
      if (score < (g.get(next) ?? Infinity)) {
        g.set(next, score);
        came.set(next, node);
        heap.push(next, score + h(nx, ny));
      }
    }
  }
  if (!came.has(goal)) return null;
  const path: Vec[] = [];
  for (let node = goal; node !== start; node = came.get(node)!) {
    const x = node % w;
    path.push({ x: x + 0.5, y: (node - x) / w + 0.5 });
  }
  return path.reverse();
}
