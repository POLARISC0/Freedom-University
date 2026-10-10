import { hash2, valueNoise } from "@/walk/world/noise";
import { Tile, WATER_TILES, type WorldMap } from "@/walk/world/types";
import { hex, makeCanvas, mix, type RGB } from "./color";

export const TILE = 16;

const BASE: Record<number, RGB> = {
  [Tile.Grass]: hex("#6f9a47"),
  [Tile.Hill]: hex("#86a552"),
  [Tile.Meadow]: hex("#8aa856"),
  [Tile.Sand]: hex("#e2cd99"),
  [Tile.Road]: hex("#bb9d6c"),
  [Tile.Plaza]: hex("#6a655f"),
  [Tile.Field]: hex("#d4b768"),
  [Tile.Jetty]: hex("#e2cd99"),
};

const SHALLOW = hex("#5fb0b9");
const MID = hex("#3a8aa3");
const DEEP = hex("#22607f");
const WET_SAND = hex("#c2ab78");
const FOAM = hex("#eef6f2");
const FLOWERS = ["#d8433c", "#f2f0e6", "#9a6ac0", "#f0c93c"].map(hex);

/** Signed distance from the waterline per tile: positive in water, negative on land. */
function shoreField(map: WorldMap): Float32Array {
  const { width: w, height: h, tiles } = map;
  const isWater = (i: number) => WATER_TILES.has(tiles[i] as Tile) || tiles[i] === Tile.Jetty;
  const dist = new Float32Array(w * h).fill(Infinity);
  const queue: number[] = [];
  // Multi-source BFS from every tile that touches the other medium.
  for (let i = 0; i < w * h; i++) {
    const x = i % w;
    const y = (i - x) / w;
    const water = isWater(i);
    const edge = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ].some(([dx, dy]) => {
      const nx = x + dx;
      const ny = y + dy;
      return nx >= 0 && ny >= 0 && nx < w && ny < h && isWater(ny * w + nx) !== water;
    });
    if (edge) {
      dist[i] = 0.5;
      queue.push(i);
    }
  }
  for (let head = 0; head < queue.length; head++) {
    const i = queue[head];
    const x = i % w;
    const y = (i - x) / w;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const j = ny * w + nx;
      if (isWater(j) !== isWater(i) || dist[j] <= dist[i] + 1) continue;
      dist[j] = dist[i] + 1;
      queue.push(j);
    }
  }
  const field = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) field[i] = (isWater(i) ? 1 : -1) * Math.min(dist[i], 8);
  return field;
}

/**
 * Paint the whole map's ground into one canvas. Shorelines come from a smoothed distance field and land types
 * blend at noisy borders, so the world looks hand-drawn rather than tiled.
 */
export function paintTerrain(map: WorldMap): HTMLCanvasElement {
  const { width: w, height: h, tiles } = map;
  const W = w * TILE;
  const H = h * TILE;
  const { canvas, ctx } = makeCanvas(W, H);
  const image = ctx.createImageData(W, H);
  const data = image.data;
  const field = shoreField(map);
  const fieldAt = (tx: number, ty: number) => field[Math.min(h - 1, Math.max(0, ty)) * w + Math.min(w - 1, Math.max(0, tx))];

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      // Bilinear sample of the shore field between tile centres, plus a little noise for an irregular coast.
      const fx = x / TILE - 0.5;
      const fy = y / TILE - 0.5;
      const x0 = Math.floor(fx);
      const y0 = Math.floor(fy);
      const tx = fx - x0;
      const ty = fy - y0;
      const s =
        fieldAt(x0, y0) * (1 - tx) * (1 - ty) +
        fieldAt(x0 + 1, y0) * tx * (1 - ty) +
        fieldAt(x0, y0 + 1) * (1 - tx) * ty +
        fieldAt(x0 + 1, y0 + 1) * tx * ty +
        (valueNoise(x / 9, y / 9, 3) - 0.5) * 0.7;
      // Broad patches plus fine texture; grain uses 2x2 pixel cells so speckles read as pixel art, not static.
      const n = valueNoise(x / 6, y / 6, 5) * 0.55 + valueNoise(x / 40, y / 40, 6) * 0.45;
      const grain = hash2(x >> 1, y >> 1, 17);
      let c: RGB;

      if (s > 0) {
        // Water: lighter near the shore, deep blue further out, with soft ripples.
        const depth = Math.min(1, s / 5);
        c = depth < 0.35 ? mix(SHALLOW, MID, depth / 0.35) : mix(MID, DEEP, (depth - 0.35) / 0.65);
        const ripple = Math.sin(x * 0.35 + valueNoise(x / 20, y / 5, 9) * 8) * Math.sin(y * 0.9);
        if (ripple > 0.85) c = mix(c, FOAM, 0.18);
        if (s < 0.22) c = mix(c, FOAM, 0.75 - s * 2);
      } else {
        // Land: pick the tile type at a jittered position so borders between types are organic.
        const jx = Math.floor((x + (valueNoise(x / 7, y / 7, 21) - 0.5) * 12) / TILE);
        const jy = Math.floor((y + (valueNoise(x / 7, y / 7, 23) - 0.5) * 12) / TILE);
        let t = tiles[Math.min(h - 1, Math.max(0, jy)) * w + Math.min(w - 1, Math.max(0, jx))] as Tile;
        if (WATER_TILES.has(t) || t === Tile.Jetty) t = Tile.Sand;
        // Plaza paving and fields keep crisp edges.
        const exact = tiles[Math.floor(y / TILE) * w + Math.floor(x / TILE)] as Tile;
        if (exact === Tile.Plaza || exact === Tile.Field) t = exact;
        c = landColor(t, x, y, n, grain);
        // Wet sand and a thin foam line at the water's edge.
        if (s > -0.9) c = mix(c, WET_SAND, Math.min(1, (s + 0.9) / 0.9) * 0.8);
      }

      const k = (y * W + x) * 4;
      data[k] = c[0];
      data[k + 1] = c[1];
      data[k + 2] = c[2];
      data[k + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

function landColor(t: Tile, x: number, y: number, n: number, grain: number): RGB {
  const base = BASE[t] ?? BASE[Tile.Grass];
  const vary = (amount: number) => base.map((v) => Math.max(0, Math.min(255, v + (n - 0.5) * amount))) as RGB;
  switch (t) {
    case Tile.Grass:
    case Tile.Hill:
    case Tile.Meadow: {
      let c = vary(30);
      if (grain > 0.965) c = mix(c, [60, 96, 44], 0.5);
      else if (grain < 0.02) c = mix(c, [170, 196, 110], 0.45);
      if (t === Tile.Meadow && grain > 0.985) c = FLOWERS[Math.floor(hash2(x, y, 4) * FLOWERS.length)];
      return c;
    }
    case Tile.Sand: {
      let c = vary(18);
      if (grain > 0.985) c = mix(c, [140, 130, 120], 0.6);
      return c;
    }
    case Tile.Road: {
      let c = vary(26);
      if (grain > 0.95) c = mix(c, [150, 125, 90], 0.6);
      if (grain < 0.02) c = mix(c, [210, 195, 165], 0.6);
      return c;
    }
    case Tile.Plaza: {
      // Basalt cobbles: irregular stones with darker joints.
      const cx = Math.floor((x + Math.floor(y / 6) * 3) / 6);
      const cy = Math.floor(y / 6);
      const joint = (x + Math.floor(y / 6) * 3) % 6 === 0 || y % 6 === 0;
      const tone = hash2(cx, cy, 31);
      const c: RGB = [94 + tone * 30, 89 + tone * 26, 84 + tone * 22];
      return joint ? mix(c, [58, 54, 50], 0.7) : c;
    }
    case Tile.Field: {
      // Rows of ripening wheat.
      const row = Math.floor(y / 3) % 2 === 0;
      const c = vary(28);
      return row ? mix(c, [180, 150, 70], 0.35) : grain > 0.9 ? mix(c, [240, 220, 140], 0.5) : c;
    }
    default:
      return vary(20);
  }
}
