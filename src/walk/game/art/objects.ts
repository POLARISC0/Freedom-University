import { hash2, rng } from "@/walk/world/noise";
import type { WorldObject } from "@/walk/world/types";
import { blob, makeCanvas, px, rect, shade } from "./color";
import { TILE } from "./terrain";

export interface ObjectArt {
  canvas: HTMLCanvasElement;
  /** Pixel offset of the canvas's top-left from the footprint's bottom-left corner. */
  offsetX: number;
  offsetY: number;
  /** Draw flat on the ground beneath everything else (flowers). */
  ground?: boolean;
}

type Ctx = CanvasRenderingContext2D;

const BASALT = ["#4a4643", "#55514d", "#403d3a", "#5e5954"];
const MORTAR = "#7a7268";
const ROOFS = ["#b49a6c", "#a88f62", "#c2a878", "#9f8a63"];
const WOOD = "#7a5233";
const WOOD_DARK = "#553821";
const AWNINGS = [
  ["#b8432f", "#e8dcc0"],
  ["#3f6a8f", "#e8dcc0"],
  ["#c48a2a", "#6b3f2a"],
  ["#5f7a4a", "#e8dcc0"],
  ["#8a3b5a", "#e8c070"],
  ["#2f5f5a", "#d9c8a0"],
];

function stoneWall(ctx: Ctx, x: number, y: number, w: number, h: number, seed: number, palette = BASALT) {
  rect(ctx, x, y, w, h, MORTAR);
  const r = rng(seed);
  for (let row = 0; row * 4 < h; row++) {
    let cx = x - (row % 2) * 3;
    while (cx < x + w) {
      const sw = 4 + Math.floor(r() * 4);
      const sx = Math.max(cx, x);
      const ex = Math.min(cx + sw - 1, x + w);
      if (ex > sx) rect(ctx, sx, y + row * 4, ex - sx, Math.min(3, y + h - (y + row * 4)), palette[Math.floor(r() * palette.length)]);
      cx += sw;
    }
  }
}

function house(o: WorldObject): ObjectArt {
  const w = o.w * TILE;
  const extra = 8;
  const h = o.h * TILE + extra;
  const { canvas, ctx } = makeCanvas(w, h);
  const wallH = 17;
  const roofH = h - wallH;
  const variant = o.variant ?? 0;
  const roof = ROOFS[variant % ROOFS.length];

  // Flat roof of plastered reeds and mud, with a raised parapet.
  rect(ctx, 0, 0, w, roofH, shade(roof, -0.25));
  rect(ctx, 1, 1, w - 2, roofH - 2, roof);
  const r = rng(o.x * 31 + o.y);
  for (let i = 0; i < (w * roofH) / 18; i++) px(ctx, 2 + r() * (w - 4), 2 + r() * (roofH - 4), shade(roof, r() < 0.5 ? -0.1 : 0.12));
  rect(ctx, 1, 1, w - 2, 1, shade(roof, 0.25));
  rect(ctx, 0, roofH - 2, w, 2, shade(roof, -0.35));

  // Things people kept on their roofs.
  if (variant === 0) {
    // Flax drying (Joshua 2:6 shows the custom) as golden bundles.
    for (let i = 0; i < 4; i++) rect(ctx, 4 + i * 4, 4, 2, 6, i % 2 ? "#d9c27a" : "#c9ac5a");
  } else if (variant === 1) {
    blob(ctx, w - 9, 8, 3, 3, "#a65d3a");
    blob(ctx, w - 15, 9, 2, 2, "#b86b45");
  } else if (variant === 2) {
    rect(ctx, w - 12, 3, 9, 8, "#c8b48c");
    rect(ctx, w - 12, 3, 9, 1, "#e3d3ad");
  }

  // Front wall of black basalt with a doorway and a small window.
  stoneWall(ctx, 0, roofH, w, wallH, o.x * 7 + o.y * 13);
  const doorX = Math.floor(w / 2) - 3;
  rect(ctx, doorX - 1, roofH + 3, 8, 1, WOOD);
  rect(ctx, doorX, roofH + 4, 6, wallH - 4, "#21180f");
  rect(ctx, doorX + 1, roofH + 5, 4, wallH - 5, "#2d2116");
  if (w >= 48) {
    rect(ctx, 6, roofH + 6, 4, 3, "#1b1510");
    rect(ctx, 5, roofH + 5, 6, 1, WOOD_DARK);
  }
  // A step and a jar by the door.
  rect(ctx, doorX - 1, h - 1, 8, 1, "#6a645c");
  if (variant !== 3) blob(ctx, doorX + 10, h - 4, 2, 3, "#b0643b");
  return { canvas, offsetX: 0, offsetY: -h };
}

function synagogue(o: WorldObject): ObjectArt {
  const w = o.w * TILE;
  const extra = 10;
  const h = o.h * TILE + extra;
  const { canvas, ctx } = makeCanvas(w, h);
  const wallH = 24;
  const roofH = h - wallH;
  rect(ctx, 0, 0, w, roofH, "#7f776c");
  rect(ctx, 2, 2, w - 4, roofH - 4, "#a39886");
  for (let y = 4; y < roofH - 4; y += 4) rect(ctx, 3, y, w - 6, 1, "#968b79");
  rect(ctx, 0, roofH - 3, w, 3, "#5d564c");
  stoneWall(ctx, 0, roofH, w, wallH, 99, ["#6e675e", "#7b746a", "#655e55", "#857d72"]);
  // Columns and a wide doorway.
  for (let i = 0; i < 5; i++) {
    const cx = 10 + i * 22;
    if (Math.abs(cx - w / 2) < 14) continue;
    rect(ctx, cx, roofH + 1, 5, wallH - 2, "#b9b0a1");
    rect(ctx, cx + 4, roofH + 1, 1, wallH - 2, "#8f8676");
    rect(ctx, cx - 1, roofH, 7, 2, "#cfc6b5");
  }
  rect(ctx, w / 2 - 7, roofH + 5, 14, wallH - 5, "#241b12");
  rect(ctx, w / 2 - 8, roofH + 4, 16, 1, WOOD);
  rect(ctx, w / 2 - 10, h - 2, 20, 2, "#8c8478");
  return { canvas, offsetX: 0, offsetY: -h };
}

function stall(o: WorldObject, closed: boolean): ObjectArt {
  const w = o.w * TILE;
  const h = 30;
  const { canvas, ctx } = makeCanvas(w, h);
  const [a, b] = AWNINGS[(o.variant ?? 0) % AWNINGS.length];
  // Poles.
  rect(ctx, 1, 6, 2, h - 6, WOOD_DARK);
  rect(ctx, w - 3, 6, 2, h - 6, WOOD_DARK);
  // Table.
  rect(ctx, 0, h - 12, w, 7, WOOD);
  rect(ctx, 0, h - 12, w, 1, shade(WOOD, 0.3));
  rect(ctx, 2, h - 5, 2, 5, WOOD_DARK);
  rect(ctx, w - 4, h - 5, 2, 5, WOOD_DARK);
  if (closed) {
    rect(ctx, 1, h - 16, w - 2, 8, b === "#e8dcc0" ? "#cfc2a2" : shade(b, -0.1));
    for (let x = 3; x < w - 3; x += 5) rect(ctx, x, h - 15, 1, 6, shade("#cfc2a2", -0.15));
  } else {
    const goods = (o.variant ?? 0) % 6;
    const r = rng(o.x * 17 + o.y);
    for (let i = 0; i < 9; i++) {
      const gx = 3 + (i % 5) * 6 + r() * 2;
      const gy = h - 15 + Math.floor(i / 5) * 3;
      const colors = [
        ["#b0242a", "#d8433c"], // pomegranates
        ["#5b7a3a", "#7c9a4a"], // olives and herbs
        ["#9fb3bf", "#c9d6dc"], // fish
        ["#b0643b", "#c47a4a"], // pottery
        ["#d9b36a", "#c9973f"], // bread
        ["#c0582a", "#e0a03a"], // spices
      ][goods];
      blob(ctx, gx, gy, goods === 2 ? 2 : 1, 1, colors[i % 2]);
    }
  }
  // Striped awning.
  for (let x = 0; x < w; x++) rect(ctx, x, 1, 1, 7, Math.floor(x / 4) % 2 ? a : b);
  rect(ctx, 0, 8, w, 1, shade(a, -0.35));
  for (let x = 0; x < w; x += 4) rect(ctx, x, 9, 2, 1, Math.floor(x / 4) % 2 ? a : b);
  return { canvas, offsetX: 0, offsetY: -h };
}

function well(): ObjectArt {
  const w = 32;
  const h = 30;
  const { canvas, ctx } = makeCanvas(w, h);
  // Frame and beam with a rope and bucket.
  rect(ctx, 4, 2, 2, 20, WOOD_DARK);
  rect(ctx, w - 6, 2, 2, 20, WOOD_DARK);
  rect(ctx, 3, 2, w - 6, 2, WOOD);
  rect(ctx, w / 2, 4, 1, 8, "#c9b48a");
  rect(ctx, w / 2 - 2, 12, 5, 4, "#8a6038");
  // Stone ring with dark water.
  blob(ctx, w / 2, h - 8, 13, 6, "#6e675f");
  blob(ctx, w / 2, h - 9, 13, 5, "#8c847a");
  blob(ctx, w / 2, h - 9, 9, 3, "#1d2c33");
  blob(ctx, w / 2 - 2, h - 10, 3, 1, "#2d4652");
  rect(ctx, w / 2 - 13, h - 7, 26, 4, "#5f5850");
  for (let x = w / 2 - 12; x < w / 2 + 12; x += 5) rect(ctx, x, h - 7, 1, 4, "#4c4640");
  return { canvas, offsetX: 0, offsetY: -h };
}

function taxBooth(): ObjectArt {
  const w = 32;
  const h = 32;
  const { canvas, ctx } = makeCanvas(w, h);
  // Canopy.
  rect(ctx, 2, 4, 2, h - 4, WOOD_DARK);
  rect(ctx, w - 4, 4, 2, h - 4, WOOD_DARK);
  rect(ctx, 0, 1, w, 6, "#7a2e2a");
  rect(ctx, 0, 7, w, 1, "#4f1d1a");
  for (let x = 1; x < w; x += 3) px(ctx, x, 3, "#9a4a3a");
  // Table with coin stacks, a balance and a wax tablet ledger.
  rect(ctx, 0, h - 14, w, 8, WOOD);
  rect(ctx, 0, h - 14, w, 1, shade(WOOD, 0.3));
  rect(ctx, 3, h - 6, 2, 6, WOOD_DARK);
  rect(ctx, w - 5, h - 6, 2, 6, WOOD_DARK);
  for (const [x, c] of [
    [5, "#d9b43c"],
    [8, "#c9c9c9"],
    [11, "#b87333"],
  ] as const) {
    rect(ctx, x, h - 17, 2, 3, c);
    px(ctx, x, h - 17, shade(c, 0.4));
  }
  rect(ctx, 16, h - 22, 1, 7, "#3a3a3a");
  rect(ctx, 13, h - 22, 7, 1, "#3a3a3a");
  rect(ctx, 12, h - 19, 3, 1, "#b87333");
  rect(ctx, 18, h - 19, 3, 1, "#b87333");
  rect(ctx, 23, h - 17, 7, 4, "#8a6a3a");
  rect(ctx, 24, h - 16, 5, 2, "#c9a66a");
  return { canvas, offsetX: 0, offsetY: -h };
}

function boat(o: WorldObject): ObjectArt {
  const w = o.w * TILE + 4;
  const h = 24;
  const { canvas, ctx } = makeCanvas(w, h);
  const hulls = ["#7a5233", "#6b4a2f", "#8a5a36", "#5f4430"];
  const hull = hulls[(o.variant ?? 0) % hulls.length];
  const mid = h - 9;
  // Hull outline: pointed at both ends.
  for (let x = 0; x < w; x++) {
    const t = Math.min(x, w - 1 - x) / (w / 2);
    const half = Math.round(2 + Math.min(1, t * 3) * 5);
    rect(ctx, x, mid - half, 1, half * 2, shade(hull, -0.3));
    if (half > 2) rect(ctx, x, mid - half + 1, 1, half * 2 - 2, hull);
    if (half > 4) rect(ctx, x, mid - half + 3, 1, half * 2 - 6, shade(hull, -0.45));
  }
  // Planks, benches, the furled sail and oars.
  for (let x = 6; x < w - 6; x += 8) rect(ctx, x, mid - 3, 2, 6, shade(hull, 0.1));
  rect(ctx, w / 2 - 1, mid - 4, 3, 8, "#cbbd98");
  rect(ctx, w / 2 - 8, mid - 1, 16, 2, "#d8cba6");
  rect(ctx, 4, mid + 4, 10, 1, WOOD_DARK);
  rect(ctx, w - 14, mid + 4, 10, 1, WOOD_DARK);
  // A heap of net.
  for (let i = 0; i < 6; i++) px(ctx, w - 12 + (i % 3) * 2, mid - 2 + Math.floor(i / 3) * 2, "#a89a7a");
  if (o.flip) {
    const flipped = makeCanvas(w, h);
    flipped.ctx.translate(w, 0);
    flipped.ctx.scale(-1, 1);
    flipped.ctx.drawImage(canvas, 0, 0);
    return { canvas: flipped.canvas, offsetX: -2, offsetY: -h + 4 };
  }
  return { canvas, offsetX: -2, offsetY: -h + 4 };
}

function olive(variant: number): ObjectArt {
  const w = 36;
  const h = 38;
  const { canvas, ctx } = makeCanvas(w, h);
  blob(ctx, w / 2, h - 3, 11, 3, "rgba(30,40,20,0.28)");
  // Gnarled trunk.
  rect(ctx, w / 2 - 2, h - 16, 5, 13, "#6a5a48");
  rect(ctx, w / 2 - 3, h - 8, 2, 5, "#5a4a3a");
  rect(ctx, w / 2 + 1, h - 13, 1, 6, "#857360");
  // Silver-green canopy in clumps.
  const r = rng(variant * 13 + 5);
  const leaf = ["#6f7f55", "#7d8e60", "#8fa070", "#5f6f48"];
  for (let i = 0; i < 9; i++) blob(ctx, 8 + r() * 20, 6 + r() * 14, 5 + r() * 3, 4 + r() * 2, leaf[i % 4]);
  for (let i = 0; i < 40; i++) px(ctx, 5 + r() * 26, 3 + r() * 20, r() < 0.5 ? "#a9b88a" : "#55653f");
  return { canvas, offsetX: -w / 2 + 8, offsetY: -h };
}

function palm(): ObjectArt {
  const w = 34;
  const h = 46;
  const { canvas, ctx } = makeCanvas(w, h);
  blob(ctx, w / 2, h - 3, 8, 2, "rgba(30,40,20,0.25)");
  for (let y = 10; y < h - 3; y++) {
    const x = w / 2 - 1 + Math.round(Math.sin(y / 9) * 2);
    rect(ctx, x, y, 3, 1, y % 3 === 0 ? "#6b5636" : "#8a7048");
  }
  const fronds = [
    [-14, 4],
    [14, 4],
    [-11, -2],
    [11, -2],
    [-6, 9],
    [6, 9],
    [0, -6],
  ];
  for (const [dx, dy] of fronds) {
    const steps = 12;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = w / 2 + dx * t;
      const y = 11 + dy * t + Math.abs(dx) * t * t * 0.4;
      rect(ctx, x, y, 2, 1, t > 0.7 ? "#5d8a3a" : "#4a7a32");
      if (i % 2 === 0) px(ctx, x, y + 1, "#6fa048");
    }
  }
  blob(ctx, w / 2, 11, 2, 2, "#7a5a2a");
  return { canvas, offsetX: -w / 2 + 8, offsetY: -h };
}

function fig(): ObjectArt {
  const w = 36;
  const h = 34;
  const { canvas, ctx } = makeCanvas(w, h);
  blob(ctx, w / 2, h - 3, 12, 3, "rgba(30,40,20,0.3)");
  rect(ctx, w / 2 - 2, h - 13, 4, 10, "#7a6650");
  const leaf = ["#3f6a2f", "#4f7d38", "#5f8f40", "#365e29"];
  const r = rng(77);
  for (let i = 0; i < 8; i++) blob(ctx, 7 + r() * 22, 6 + r() * 12, 6, 5, leaf[i % 4]);
  for (let i = 0; i < 6; i++) px(ctx, 7 + r() * 22, 6 + r() * 14, "#6a4a5a");
  return { canvas, offsetX: -w / 2 + 8, offsetY: -h };
}

function rock(variant: number, big = false): ObjectArt {
  const w = big ? 34 : 18;
  const h = big ? 18 : 14;
  const { canvas, ctx } = makeCanvas(w, h);
  const base = big ? "#b9b1a0" : ["#8a8580", "#7d7872", "#96908a"][variant % 3];
  blob(ctx, w / 2, h - 5, w / 2 - 1, h / 2 - 2, shade(base, -0.35));
  blob(ctx, w / 2, h - 6, w / 2 - 2, h / 2 - 3, base);
  blob(ctx, w / 2 - 2, h - 8, w / 4, h / 5, shade(base, 0.2));
  if (big) {
    for (let i = 0; i < 8; i++) px(ctx, 6 + i * 3, h - 10 + (i % 3), "#7f9a5a");
  }
  return { canvas, offsetX: big ? -1 : -1, offsetY: -h + 2 };
}

function bush(variant: number): ObjectArt {
  const { canvas, ctx } = makeCanvas(16, 12);
  const greens = ["#4f7d3a", "#5c8a42", "#46703a"];
  blob(ctx, 8, 7, 6, 4, greens[variant % 3]);
  blob(ctx, 6, 6, 3, 2, shade(greens[variant % 3], 0.18));
  // Oleander blooms by the water.
  if (variant === 1) for (let i = 0; i < 5; i++) px(ctx, 4 + i * 2, 4 + (i % 2) * 3, "#e07a9a");
  return { canvas, offsetX: 0, offsetY: -12 };
}

function reeds(variant: number): ObjectArt {
  const { canvas, ctx } = makeCanvas(16, 20);
  for (let i = 0; i < 7; i++) {
    const x = 1 + i * 2 + (variant % 2);
    const top = 2 + ((i * 5 + variant) % 7);
    rect(ctx, x, top, 1, 20 - top, i % 2 ? "#6f8a3a" : "#8a9a4a");
    if (i % 3 === 0) rect(ctx, x, top - 2, 1, 3, "#7a5a3a");
  }
  return { canvas, offsetX: 0, offsetY: -18 };
}

function flowers(variant: number, x: number, y: number): ObjectArt {
  const { canvas, ctx } = makeCanvas(16, 16);
  // Red anemones, yellow chrysanthemums, purple irises: "the lilies of the field" (Matthew 6:28).
  const colors = [
    ["#d8433c", "#f05a4a"],
    ["#f0c93c", "#f7e08a"],
    ["#9a6ac0", "#c39ae0"],
  ][variant % 3];
  for (let i = 0; i < 7; i++) {
    const fx = 2 + hash2(x + i, y, 1) * 12;
    const fy = 2 + hash2(x, y + i, 2) * 12;
    px(ctx, fx, fy + 1, "#4a7a32");
    px(ctx, fx, fy, colors[i % 2]);
  }
  return { canvas, offsetX: 0, offsetY: -16, ground: true };
}

function nets(): ObjectArt {
  const { canvas, ctx } = makeCanvas(32, 22);
  rect(ctx, 2, 2, 2, 20, WOOD_DARK);
  rect(ctx, 28, 2, 2, 20, WOOD_DARK);
  rect(ctx, 2, 3, 28, 1, "#8a6a4a");
  for (let x = 4; x < 28; x += 3) rect(ctx, x, 4, 1, 12 - (x % 4), "#b8ab8a");
  for (let y = 6; y < 15; y += 3) rect(ctx, 4, y, 24, 1, "#a89a7a");
  for (let i = 0; i < 4; i++) blob(ctx, 8 + i * 5, 17, 1, 1, "#e0d0a0");
  return { canvas, offsetX: 0, offsetY: -22 };
}

function fire(frame: number): ObjectArt {
  const { canvas, ctx } = makeCanvas(18, 16);
  blob(ctx, 9, 11, 7, 3, "#3a2a20");
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    blob(ctx, 9 + Math.cos(a) * 6, 11 + Math.sin(a) * 3, 1, 1, i % 2 ? "#7a746c" : "#8f8880");
  }
  // Glowing coals with fish and bread on them (John 21:9).
  const hot = ["#ff9a3a", "#ffcf5a", "#e0502a"];
  for (let i = 0; i < 9; i++) px(ctx, 6 + (i % 4) * 2, 10 + Math.floor(i / 4), hot[(i + frame) % 3]);
  rect(ctx, 5, 8, 4, 1, "#9fb3bf");
  px(ctx, 4, 8, "#7f939f");
  rect(ctx, 10, 8, 3, 2, "#d9b36a");
  // Flames.
  const flame = frame % 3;
  rect(ctx, 8, 5 - flame, 2, 4 + flame, "#ffb347");
  px(ctx, 8 + (frame % 2), 3 - flame, "#ffe08a");
  return { canvas, offsetX: -1, offsetY: -16 };
}

function jars(): ObjectArt {
  const { canvas, ctx } = makeCanvas(16, 18);
  for (const [x, c] of [
    [5, "#b0643b"],
    [11, "#a85a35"],
  ] as const) {
    blob(ctx, x, 11, 3, 5, shade(c, -0.25));
    blob(ctx, x, 10, 3, 4, c);
    rect(ctx, x - 1, 3, 3, 3, c);
    px(ctx, x - 1, 8, shade(c, 0.3));
  }
  return { canvas, offsetX: 0, offsetY: -18 };
}

function baskets(): ObjectArt {
  const { canvas, ctx } = makeCanvas(16, 14);
  blob(ctx, 8, 9, 6, 4, "#8a6a3a");
  for (let x = 3; x < 14; x += 2) rect(ctx, x, 6, 1, 7, "#a8844a");
  blob(ctx, 8, 6, 5, 2, "#5a4a2a");
  for (let i = 0; i < 4; i++) rect(ctx, 5 + i * 2, 5 + (i % 2), 2, 1, "#a9bcc6");
  return { canvas, offsetX: 0, offsetY: -14 };
}

function signpost(): ObjectArt {
  const { canvas, ctx } = makeCanvas(20, 28);
  rect(ctx, 9, 4, 2, 24, WOOD_DARK);
  for (const [y, left] of [
    [5, true],
    [11, false],
    [17, true],
  ] as const) {
    const x = left ? 2 : 8;
    rect(ctx, x, y, 11, 4, "#a98a5a");
    rect(ctx, x, y, 11, 1, "#c9aa7a");
    px(ctx, left ? x - 1 : x + 11, y + 1, "#a98a5a");
    px(ctx, left ? x - 1 : x + 11, y + 2, "#a98a5a");
    rect(ctx, x + 2, y + 2, 7, 1, "#5a4022");
  }
  return { canvas, offsetX: -2, offsetY: -28 };
}

function lantern(): ObjectArt {
  const { canvas, ctx } = makeCanvas(8, 18);
  rect(ctx, 3, 6, 2, 12, WOOD_DARK);
  rect(ctx, 1, 2, 6, 5, "#3a2a1a");
  rect(ctx, 2, 3, 4, 3, "#ffd27a");
  return { canvas, offsetX: -4, offsetY: -18 };
}

/** Art for one placed object. Stalls also get a "closed" version for the night. */
export function objectArt(o: WorldObject, frame = 0, closed = false): ObjectArt {
  const v = o.variant ?? 0;
  switch (o.kind) {
    case "house":
      return house(o);
    case "synagogue":
      return synagogue(o);
    case "stall":
      return stall(o, closed);
    case "well":
      return well();
    case "taxBooth":
      return taxBooth();
    case "boat":
      return boat(o);
    case "olive":
      return olive(v + o.x);
    case "palm":
      return palm();
    case "fig":
      return fig();
    case "rock":
      return rock(v);
    case "prayerRock":
      return rock(0, true);
    case "bush":
      return bush(v);
    case "reeds":
      return reeds(v);
    case "flowers":
      return flowers(v, o.x, o.y);
    case "nets":
      return nets();
    case "fire":
      return fire(frame);
    case "jars":
      return jars();
    case "baskets":
      return baskets();
    case "signpost":
      return signpost();
    case "lantern":
      return lantern();
  }
}

/** Plank texture for the jetty, one tile. */
export function jettyTile(): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(TILE, TILE);
  for (let y = 0; y < TILE; y += 4) {
    rect(ctx, 0, y, TILE, 3, y % 8 ? "#9a7a50" : "#8a6c46");
    rect(ctx, 0, y + 3, TILE, 1, "#5a4428");
  }
  px(ctx, 2, 1, "#5a4428");
  px(ctx, 13, 5, "#5a4428");
  return canvas;
}

/** A soft round glow, tinted per light. */
export function glowTexture(): HTMLCanvasElement {
  const size = 64;
  const { canvas, ctx } = makeCanvas(size, size);
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,0.9)");
  g.addColorStop(0.35, "rgba(255,255,255,0.45)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return canvas;
}
