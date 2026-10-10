// Voxel models for everything placed in the world: basalt houses with flat roofs, the limestone synagogue, market
// stalls, boats, trees, nets, fires and the rest. Static pieces go into one shared builder (merged by material);
// pieces that move (floating boats, flames) or change (stall awnings by day and night) get their own builders.

import * as THREE from "three";
import { hash2 } from "@/walk/world/noise";
import type { WorldObject } from "@/walk/world/types";
import { FACE, VoxelBuilder, type Vec3 } from "./builder";
import { footprintBase, heightAt, WATER_LEVEL, type HeightField } from "./heights";

export interface FloatingPiece {
  object: WorldObject;
  builder: VoxelBuilder;
  /** Where the piece's local origin sits in the world. */
  position: Vec3;
  yaw: number;
  phase: number;
}

export interface FlamePiece {
  builder: VoxelBuilder;
  position: Vec3;
  size: number;
  phase: number;
}

export interface LightSource {
  x: number;
  y: number;
  z: number;
  color: number;
  radius: number;
  always: boolean;
  flicker: boolean;
}

export interface ObjectLayers {
  /** Everything that never moves. */
  still: VoxelBuilder;
  /** Market stalls by day (awnings out, goods on show) and by night (awnings rolled, goods covered). */
  open: VoxelBuilder;
  closed: VoxelBuilder;
  floating: FloatingPiece[];
  flames: FlamePiece[];
  lights: LightSource[];
}

const WOOD = 0xffffff;
const DARK_WOOD = 0xb89a80;
const TERRACOTTA = 0xb8693e;
const LEAF_OLIVE = 0x93a86a;
const LEAF_FIG = 0x5c8a3e;
const LEAF_PALM = 0x6a9c42;
const BREAD = 0xc8965a;
const FISH = 0xa8b8c0;
const AWNINGS = [0xc0503a, 0x3d78a2, 0xe0b04a, 0x5f8a4a, 0x8e4f7f, 0xd8cbb0];

/** Build every object in the map. */
export function buildObjects(objects: WorldObject[], field: HeightField): ObjectLayers {
  const layers: ObjectLayers = {
    still: new VoxelBuilder(),
    open: new VoxelBuilder(),
    closed: new VoxelBuilder(),
    floating: [],
    flames: [],
    lights: [],
  };
  for (const o of objects) {
    const base = footprintBase(field, o.x, o.y, Math.max(o.w, 1), Math.max(o.h, 1));
    const b = layers.still;
    const v = o.variant ?? 0;
    const cx = o.x + o.w / 2;
    const cz = o.y + o.h / 2;
    switch (o.kind) {
      case "house":
        house(b, o, base);
        break;
      case "synagogue":
        synagogue(b, o, base);
        break;
      case "stall":
        stall(layers, o, base);
        break;
      case "well":
        well(b, o, base);
        break;
      case "taxBooth":
        taxBooth(b, o, base);
        break;
      case "boat": {
        const floating = Boolean(o.floating);
        const piece = new VoxelBuilder();
        boat(piece, v);
        const y = floating ? WATER_LEVEL - 0.18 : Math.max(base, WATER_LEVEL - 0.1);
        layers.floating.push({ object: o, builder: piece, position: [o.x + o.w / 2, y, o.y + o.h / 2], yaw: o.flip ? Math.PI : 0, phase: hash2(o.x, o.y, 8) * 6 });
        break;
      }
      case "olive":
        b.pushAt(cx, heightAt(field, o.x, o.y), cz, hash2(o.x, o.y, 1) * Math.PI);
        olive(b, v);
        b.pop();
        break;
      case "palm":
        b.pushAt(cx, heightAt(field, o.x, o.y), cz, hash2(o.x, o.y, 1) * Math.PI);
        palm(b, v);
        b.pop();
        break;
      case "fig":
        b.pushAt(cx, heightAt(field, o.x, o.y), cz, hash2(o.x, o.y, 1) * Math.PI);
        fig(b, v);
        b.pop();
        break;
      case "rock":
        b.pushAt(cx, heightAt(field, o.x, o.y), cz, hash2(o.x, o.y, 1) * Math.PI);
        rock(b, v);
        b.pop();
        break;
      case "prayerRock":
        prayerRock(b, o, base);
        break;
      case "bush":
        b.pushAt(cx, heightAt(field, o.x, o.y), cz, hash2(o.x, o.y, 1) * Math.PI);
        bush(b, v);
        b.pop();
        break;
      case "reeds":
        reeds(b, o, field);
        break;
      case "flowers":
        b.pushAt(cx, heightAt(field, o.x, o.y), cz);
        flowers(b, v, o);
        b.pop();
        break;
      case "nets":
        nets(b, o, base);
        break;
      case "fire":
      case "cookfire": {
        const small = o.kind === "cookfire";
        b.pushAt(cx, base, cz);
        fire(b, small);
        b.pop();
        const flame = new VoxelBuilder();
        flames(flame, small);
        layers.flames.push({ builder: flame, position: [cx, base + (small ? 0.12 : 0.1), cz], size: small ? 0.7 : 1, phase: hash2(o.x, o.y, 2) * 6 });
        break;
      }
      case "jars":
        b.pushAt(cx, base, cz, hash2(o.x, o.y, 1) * Math.PI);
        jars(b, v);
        b.pop();
        break;
      case "baskets":
        b.pushAt(cx, base, cz, hash2(o.x, o.y, 1) * Math.PI);
        baskets(b, v);
        b.pop();
        break;
      case "signpost":
        b.pushAt(cx, base, cz);
        signpost(b);
        b.pop();
        break;
      case "lantern":
        b.pushAt(o.x + 0.2, heightAt(field, o.x, o.y), o.y);
        lantern(b);
        b.pop();
        break;
      case "table":
        table(b, o, base);
        break;
    }
    if (o.light) {
      const lit = o.kind === "fire" || o.kind === "cookfire";
      const lift = lit ? 0.6 : o.kind === "lantern" ? 1.2 : 1.5;
      layers.lights.push({
        x: o.light.x,
        y: heightAt(field, o.light.x, o.light.y) + lift,
        z: o.light.y,
        color: o.light.color,
        radius: o.light.radius,
        always: Boolean(o.light.always),
        flicker: lit,
      });
    }
  }
  return layers;
}

// ---- Buildings ------------------------------------------------------------------------------------------------

/** A black basalt house with a flat clay roof, a parapet, small windows and an outside stair (or a ladder). */
function house(b: VoxelBuilder, o: WorldObject, base: number) {
  const v = o.variant ?? 0;
  const ladder = v === 3;
  const stairWest = v % 2 === 0;
  const x0 = o.x + 0.1;
  const x1 = o.x + o.w - 0.1;
  const z0 = o.y + 0.12;
  const z1 = o.y + o.h - 0.12;
  const bx0 = ladder || !stairWest ? x0 : o.x + 0.95;
  const bx1 = ladder ? o.x + o.w - 0.4 : stairWest ? x1 : o.x + o.w - 0.95;
  const top = base + 1.9 + (v === 1 ? 0.25 : 0);
  const tint = [0xffffff, 0xe8e4e0, 0xf6f0ea, 0xdedad6][v % 4];
  const lit = Boolean(o.light);

  // Walls on a foundation that runs down into the slope.
  b.box("stone", [bx0, base - 0.7, z0], [bx1, top, z1], tint);
  // A lime-washed band at the foot of the wall and a stone sill under the roof.
  b.box("limestone", [bx0 - 0.03, top - 0.18, z0 - 0.03], [bx1 + 0.03, top - 0.06, z1 + 0.03], 0xd8d0c0);

  // Roof: clay over beams, with the beam ends showing, and a low parapet around the edge (Deuteronomy 22:8).
  b.box("roof", [bx0 - 0.08, top - 0.06, z0 - 0.08], [bx1 + 0.08, top + 0.14, z1 + 0.08], 0xffffff, { bottom: true });
  for (let x = bx0 + 0.25; x < bx1 - 0.1; x += 0.55) {
    b.box("bark", [x, top - 0.2, z1 + 0.02], [x + 0.12, top - 0.06, z1 + 0.16], DARK_WOOD, { bottom: true });
    b.box("bark", [x, top - 0.2, z0 - 0.16], [x + 0.12, top - 0.06, z0 - 0.02], DARK_WOOD, { bottom: true });
  }
  const p = 0.12;
  const ph = top + 0.38;
  const stairGap = !ladder;
  b.box("stone", [bx0 - 0.08, top + 0.14, z0 - 0.08], [bx1 + 0.08, ph, z0 - 0.08 + p], tint);
  b.box("stone", [bx0 - 0.08, top + 0.14, z1 + 0.08 - p], [bx1 + 0.08, ph, z1 + 0.08], tint);
  // Leave a gap in the parapet where the stair arrives.
  const gapWest = stairGap && stairWest;
  const gapEast = stairGap && !stairWest;
  b.box("stone", [bx0 - 0.08, top + 0.14, z0 + p], [bx0 - 0.08 + p, ph, gapWest ? z0 + 0.6 : z1 - p], tint);
  b.box("stone", [bx1 + 0.08 - p, top + 0.14, z0 + p], [bx1 + 0.08, ph, gapEast ? z0 + 0.6 : z1 - p], tint);

  // Door in the middle of the south wall, under a pale stone lintel.
  const doorX = o.x + Math.floor(o.w / 2) + 0.5;
  b.box("planks", [doorX - 0.3, base, z1], [doorX + 0.3, base + 1.18, z1 + 0.05], 0x9a7458);
  b.box("bark", [doorX - 0.3, base + 0.55, z1 + 0.05], [doorX + 0.3, base + 0.62, z1 + 0.08], 0x8a7058);
  b.box("limestone", [doorX - 0.42, base + 1.18, z1], [doorX + 0.42, base + 1.34, z1 + 0.08], 0xe8e0d0);
  b.box("limestone", [doorX - 0.42, base - 0.02, z1], [doorX + 0.42, base + 0.05, z1 + 0.3], 0xd0c8b8);

  // Small windows high in the walls; they glow at night when someone is home.
  const glass = lit ? "glow" : "plain";
  const windowColor = lit ? 0x3a2a1c : 0x241c16;
  const wy0 = base + 1.22;
  const wy1 = base + 1.5;
  const southWindows = [doorX - 1, doorX + 1].filter((x) => x - 0.15 > bx0 + 0.15 && x + 0.15 < bx1 - 0.15);
  for (const x of southWindows) {
    b.box(glass, [x - 0.15, wy0, z1], [x + 0.15, wy1, z1 + 0.03], windowColor);
    b.box("limestone", [x - 0.2, wy0 - 0.07, z1], [x + 0.2, wy0, z1 + 0.08], 0xd8d0c0);
  }
  const midZ = (z0 + z1) / 2;
  b.box(glass, [bx1, wy0, midZ - 0.15], [bx1 + 0.03, wy1, midZ + 0.15], windowColor);
  b.box(glass, [bx0 - 0.03, wy0, midZ - 0.15], [bx0, wy1, midZ + 0.15], windowColor);
  b.box(glass, [(bx0 + bx1) / 2 - 0.15, wy0, z0 - 0.03], [(bx0 + bx1) / 2 + 0.15, wy1, z0], windowColor);

  // The way up to the roof.
  if (ladder) {
    const lx = bx1 + 0.12;
    const lz = z1 - 0.9;
    b.box("bark", [lx - 0.04, base, lz], [lx + 0.04, top + 0.55, lz + 0.07], DARK_WOOD);
    b.box("bark", [lx - 0.04, base, lz + 0.45], [lx + 0.04, top + 0.55, lz + 0.52], DARK_WOOD);
    for (let y = base + 0.3; y < top + 0.4; y += 0.32) b.box("bark", [lx - 0.03, y, lz + 0.07], [lx + 0.03, y + 0.05, lz + 0.45], DARK_WOOD);
  } else {
    const sx0 = stairWest ? x0 : bx1;
    const sx1 = stairWest ? bx0 : x1;
    const steps = 6;
    const depth = (z1 - z0 - 0.4) / steps;
    for (let i = 0; i < steps; i++) {
      const sz1 = z1 - i * depth;
      b.box("stone", [sx0, base - 0.5, sz1 - depth], [sx1, base + ((top + 0.14 - base) * (i + 1)) / steps, sz1], tint, { topColor: 0xd8d0c0 });
    }
    b.box("stone", [sx0, base - 0.5, z0], [sx1, top + 0.14, z0 + 0.4 + 0.02], tint);
  }

  // Life on the roof: jars, a mat with flax drying (Joshua 2:6), a little shelter of branches.
  const rx = (bx0 + bx1) / 2;
  const rz = (z0 + z1) / 2;
  const roofY = top + 0.14;
  if (v === 0 || v === 2) {
    b.box("cloth", [rx - 0.6, roofY, rz - 0.4], [rx + 0.3, roofY + 0.03, rz + 0.4], 0xc8b07a);
    for (let k = 0; k < 4; k++) b.box("plain", [rx - 0.55 + k * 0.2, roofY + 0.03, rz - 0.35], [rx - 0.45 + k * 0.2, roofY + 0.09, rz + 0.35], 0xd8c070);
  }
  if (v !== 2) jar(b, bx1 - 0.35, roofY, z0 + 0.35, 0.8);
  if (v === 1) {
    b.box("bark", [bx0 + 0.2, roofY, z1 - 0.4], [bx0 + 0.28, roofY + 0.7, z1 - 0.32], DARK_WOOD);
    b.box("bark", [bx0 + 1.0, roofY, z1 - 0.4], [bx0 + 1.08, roofY + 0.7, z1 - 0.32], DARK_WOOD);
    b.box("leaves", [bx0 + 0.12, roofY + 0.7, z1 - 1.1], [bx0 + 1.16, roofY + 0.82, z1 - 0.24], LEAF_PALM, { bottom: true, sway: 0.15 });
  }
}

/** The synagogue: pale limestone, a columned porch, high windows and a stepped tiled roof. */
function synagogue(b: VoxelBuilder, o: WorldObject, base: number) {
  const x0 = o.x + 0.1;
  const x1 = o.x + o.w - 0.1;
  const z0 = o.y + 0.1;
  const z1 = o.y + o.h - 0.1;
  const porch = z1 - 1.35;
  const top = base + 3;
  const cx = (x0 + x1) / 2;

  b.box("limestone", [x0 + 0.25, base - 0.7, z0], [x1 - 0.25, top, porch], 0xffffff);
  b.box("limestone", [x0 + 0.2, top - 0.25, z0 - 0.05], [x1 - 0.2, top, porch + 0.05], 0xe2d6bc);
  // Podium and steps.
  b.box("limestone", [x0, base - 0.7, porch], [x1, base + 0.22, z1 - 0.35], 0xf2ead8);
  b.box("limestone", [x0 + 0.3, base - 0.7, z1 - 0.35], [x1 - 0.3, base + 0.1, z1], 0xe6dcc8);
  // Columns with bases and capitals.
  const columns = 5;
  for (let i = 0; i < columns; i++) {
    const x = x0 + 0.35 + (i * (x1 - x0 - 0.7)) / (columns - 1);
    const z = z1 - 0.72;
    b.box("limestone", [x - 0.22, base + 0.22, z - 0.22], [x + 0.22, base + 0.36, z + 0.22], 0xe6dcc8);
    b.box("limestone", [x - 0.15, base + 0.36, z - 0.15], [x + 0.15, base + 2.5, z + 0.15], 0xfffaf0);
    b.box("limestone", [x - 0.24, base + 2.5, z - 0.24], [x + 0.24, base + 2.66, z + 0.24], 0xe6dcc8);
  }
  // Entablature over the porch.
  b.box("limestone", [x0, base + 2.66, porch - 0.05], [x1, base + 3, z1 - 0.3], 0xf2ead8, { bottom: true });
  b.box("limestone", [x0 - 0.04, base + 2.88, z1 - 0.34], [x1 + 0.04, base + 2.96, z1 - 0.26], 0xd8ccb0);

  // Doors, and windows high in the walls.
  b.box("planks", [cx - 0.55, base + 0.22, porch], [cx + 0.55, base + 1.95, porch + 0.05], 0x8a6448);
  b.box("bark", [cx - 0.03, base + 0.22, porch + 0.05], [cx + 0.03, base + 1.95, porch + 0.07], 0x6a5040);
  b.box("limestone", [cx - 0.7, base + 1.95, porch], [cx + 0.7, base + 2.15, porch + 0.1], 0xe6dcc8);
  for (const x of [cx - 1.9, cx - 1.1, cx + 1.1, cx + 1.9]) b.box("glow", [x - 0.15, base + 1.5, porch], [x + 0.15, base + 2.05, porch + 0.03], 0x3a2a1c);
  for (const z of [z0 + 0.8, z0 + 1.8]) {
    b.box("glow", [x1 - 0.25, base + 1.9, z - 0.15], [x1 - 0.22, base + 2.45, z + 0.15], 0x3a2a1c);
    b.box("glow", [x0 + 0.22, base + 1.9, z - 0.15], [x0 + 0.25, base + 2.45, z + 0.15], 0x3a2a1c);
  }

  // Tiled roof stepping up to a ridge that runs east to west.
  const roof = 0xe08c62;
  const layers = 4;
  for (let k = 0; k < layers; k++) {
    const inset = 0.42 * k;
    b.box("roof", [x0 + 0.15, top + k * 0.2, z0 - 0.12 + inset], [x1 - 0.15, top + (k + 1) * 0.2, porch + 0.12 - inset], roof, {
      topColor: 0xf0a070,
      bottom: k === 0,
    });
  }
}

/** A market stall: a counter, posts and a striped awning by day; awning rolled and goods covered at night. */
function stall(layers: ObjectLayers, o: WorldObject, base: number) {
  const v = o.variant ?? 0;
  const b = layers.still;
  const x0 = o.x + 0.1;
  const x1 = o.x + o.w - 0.1;
  const z0 = o.y + 0.08;
  const z1 = o.y + o.h - 0.05;
  const color = AWNINGS[v % AWNINGS.length];
  b.box("planks", [x0 + 0.05, base, z1 - 0.55], [x1 - 0.05, base + 0.78, z1 - 0.05], 0xe8d8c8, { topColor: 0xfff4e4 });
  for (const x of [x0, x1 - 0.1]) {
    b.box("bark", [x, base, z0], [x + 0.1, base + 1.75, z0 + 0.1], DARK_WOOD);
    b.box("bark", [x, base, z1 - 0.1], [x + 0.1, base + 1.5, z1], DARK_WOOD);
  }
  b.box("bark", [x0, base + 1.65, z0], [x1, base + 1.75, z0 + 0.1], DARK_WOOD);

  // By day: a sloping awning in stripes, and goods on the counter.
  const open = layers.open;
  const slope = Math.atan2(0.3, z1 + 0.3 - z0);
  const length = Math.hypot(0.3, z1 + 0.3 - z0);
  open.push(new THREE.Matrix4().makeRotationX(slope).setPosition(0, base + 1.78, z0));
  const stripes = Math.round((x1 - x0) / 0.24);
  for (let i = 0; i < stripes; i++) {
    const sx0 = x0 - 0.06 + (i * (x1 - x0 + 0.12)) / stripes;
    const sx1 = x0 - 0.06 + ((i + 1) * (x1 - x0 + 0.12)) / stripes;
    open.box("cloth", [sx0, 0, 0], [sx1, 0.05, length], i % 2 ? 0xf2ead8 : color, { bottom: true, sway: [0.05, 0.2] });
  }
  open.box("cloth", [x0 - 0.06, -0.16, length - 0.04], [x1 + 0.06, 0.05, length], color, { sway: 0.25 });
  open.pop();
  goods(open, v, x0 + 0.15, x1 - 0.15, base + 0.78, z1 - 0.48, z1 - 0.12);

  // By night: the awning rolled up along the back beam and a cloth over the counter.
  const closed = layers.closed;
  closed.box("cloth", [x0, base + 1.72, z0 + 0.02], [x1, base + 1.9, z0 + 0.22], color);
  closed.box("cloth", [x0 + 0.02, base + 0.5, z1 - 0.58], [x1 - 0.02, base + 0.86, z1 - 0.02], shadeHex(color, 0.82));
}

function goods(b: VoxelBuilder, v: number, x0: number, x1: number, y: number, z0: number, z1: number) {
  const kinds = [
    [0xb83a2e, 0xd04a36], // pomegranates
    [BREAD, 0xdcac6a], // loaves
    [FISH, 0x8a9ca6], // fish
    [TERRACOTTA, 0xc88050], // pottery
    [0x5a3a5c, 0x6f8a3c], // figs and olives
    [0x45607a, 0xa89a7a], // bolts of cloth
  ][v % 6];
  const n = Math.max(3, Math.round((x1 - x0) / 0.2));
  for (let i = 0; i < n; i++) {
    const x = x0 + (i * (x1 - x0)) / n;
    const w = (x1 - x0) / n - 0.04;
    for (let row = 0; row < 2; row++) {
      const z = z0 + row * ((z1 - z0) / 2);
      const h = v === 3 ? 0.18 : v === 5 ? 0.1 : 0.09;
      b.box("plain", [x, y, z], [x + w, y + h, z + (z1 - z0) / 2 - 0.04], kinds[(i + row) % 2]);
    }
  }
  // A basket at the end of the counter.
  b.box("plain", [x1 - 0.1, y, z0], [x1 + 0.1, y + 0.16, z0 + 0.2], 0xb8925a);
}

/** The town well: a stone ring, a wooden frame with a rope and bucket, and a trough. */
function well(b: VoxelBuilder, o: WorldObject, base: number) {
  const cx = o.x + o.w / 2;
  const cz = o.y + o.h / 2;
  const r = 0.5;
  const t = 0.16;
  const h = base + 0.62;
  b.box("stone", [cx - r, base - 0.4, cz - r + 0.05], [cx + r, h, cz - r + 0.05 + t], 0xffffff, { topColor: 0xd0c8b8 });
  b.box("stone", [cx - r, base - 0.4, cz + r - 0.05 - t], [cx + r, h, cz + r - 0.05], 0xffffff, { topColor: 0xd0c8b8 });
  b.box("stone", [cx - r, base - 0.4, cz - r + 0.05 + t], [cx - r + t, h, cz + r - 0.05 - t], 0xffffff, { topColor: 0xd0c8b8 });
  b.box("stone", [cx + r - t, base - 0.4, cz - r + 0.05 + t], [cx + r, h, cz + r - 0.05 - t], 0xffffff, { topColor: 0xd0c8b8 });
  b.box("plain", [cx - r + t, base, cz - r + 0.05 + t], [cx + r - t, base + 0.3, cz + r - 0.05 - t], 0x1e3a50);
  b.box("bark", [cx - r - 0.02, base, cz - 0.05], [cx - r + 0.1, base + 1.45, cz + 0.05], DARK_WOOD);
  b.box("bark", [cx + r - 0.1, base, cz - 0.05], [cx + r + 0.02, base + 1.45, cz + 0.05], DARK_WOOD);
  b.box("bark", [cx - r - 0.06, base + 1.35, cz - 0.07], [cx + r + 0.06, base + 1.47, cz + 0.07], DARK_WOOD, { bottom: true });
  b.box("plain", [cx - 0.015, base + 0.95, cz - 0.015], [cx + 0.015, base + 1.35, cz + 0.015], 0xc8b890);
  b.box("planks", [cx - 0.1, base + 0.78, cz - 0.1], [cx + 0.1, base + 0.98, cz + 0.1], 0xc8a888, { bottom: true });
  // A stone trough for the animals, beside the well.
  const tx = o.x + o.w - 0.35;
  b.box("stone", [tx - 0.22, base - 0.2, cz - 0.4], [tx + 0.22, base + 0.3, cz + 0.4], 0xe0d8d0, { topColor: 0xc8c0b0 });
  b.box("plain", [tx - 0.14, base + 0.3, cz - 0.32], [tx + 0.14, base + 0.31, cz + 0.32], 0x2e5a72);
  jar(b, o.x + 0.3, base, cz + 0.25, 1);
}

/** Matthew's tax booth: a table with coins and a scale under a cloth canopy. */
function taxBooth(b: VoxelBuilder, o: WorldObject, base: number) {
  const x0 = o.x + 0.12;
  const x1 = o.x + o.w - 0.12;
  const z0 = o.y + 0.1;
  const z1 = o.y + o.h - 0.1;
  b.box("planks", [x0 + 0.1, base, z0 + 0.15], [x1 - 0.1, base + 0.72, z1 - 0.1], 0xd8c0a8, { topColor: 0xf0dcc4 });
  for (const [x, z] of [
    [x0, z0],
    [x1 - 0.08, z0],
    [x0, z1 - 0.08],
    [x1 - 0.08, z1 - 0.08],
  ]) {
    b.box("bark", [x, base, z], [x + 0.08, base + 1.7, z + 0.08], DARK_WOOD);
  }
  b.box("cloth", [x0 - 0.1, base + 1.7, z0 - 0.15], [x1 + 0.1, base + 1.78, z1 + 0.15], 0x8a3b2e, { bottom: true });
  b.box("cloth", [x0 - 0.1, base + 1.55, z1 + 0.1], [x1 + 0.1, base + 1.7, z1 + 0.15], 0xa84a3a);
  const y = base + 0.72;
  // Stacks of coins, a balance and a strongbox.
  for (let i = 0; i < 4; i++) {
    const x = x0 + 0.3 + i * 0.16;
    b.box("plain", [x, y, z0 + 0.35], [x + 0.1, y + 0.04 + (i % 3) * 0.03, z0 + 0.45], 0xe0b84a);
  }
  b.box("plain", [x1 - 0.55, y, z0 + 0.4], [x1 - 0.5, y + 0.3, z0 + 0.45], 0xb08840);
  b.box("plain", [x1 - 0.72, y + 0.28, z0 + 0.4], [x1 - 0.33, y + 0.31, z0 + 0.45], 0xb08840);
  b.box("plain", [x1 - 0.76, y + 0.16, z0 + 0.36], [x1 - 0.64, y + 0.18, z0 + 0.49], 0xc89a48, { bottom: true });
  b.box("plain", [x1 - 0.41, y + 0.16, z0 + 0.36], [x1 - 0.29, y + 0.18, z0 + 0.49], 0xc89a48, { bottom: true });
  b.box("planks", [x0 + 0.2, y, z1 - 0.38], [x0 + 0.5, y + 0.18, z1 - 0.18], 0x8a6a50);
  b.box("plain", [x0 + 0.19, y + 0.07, z1 - 0.39], [x0 + 0.51, y + 0.1, z1 - 0.17], 0x9a9088);
  // A scroll for the accounts.
  b.box("cloth", [x1 - 0.5, y, z1 - 0.32], [x1 - 0.2, y + 0.06, z1 - 0.24], 0xf2ead8);
  // A stool behind the table.
  b.box("planks", [o.x + o.w / 2 - 0.15, base, z0 - 0.05], [o.x + o.w / 2 + 0.15, base + 0.42, z0 + 0.12], 0xb89878);
}

// ---- Boats ----------------------------------------------------------------------------------------------------

/** A Galilee fishing boat, about three tiles long, built around its own origin with the bow towards +x. */
function boat(b: VoxelBuilder, v: number) {
  const hull = [0xd8b090, 0xb89878, 0xe8c8a0, 0xa88c70][v % 4];
  const band = [0x3d6e8f, 0xa8442e, 0x4f7a4a, 0x2e4a6a][v % 4];
  const rail = 0x8a6a50;
  b.box("planks", [-1.1, 0, -0.26], [1.1, 0.12, 0.26], hull, { bottom: true });
  b.box("planks", [-1.05, 0.08, -0.36], [1.05, 0.16, 0.36], 0xf0dcc0, { bottom: true });
  for (const s of [1, -1]) {
    const zi = s * 0.36;
    const zo = s * 0.47;
    b.box("planks", [-1.15, 0.0, Math.min(zi, zo)], [1.15, 0.5, Math.max(zi, zo)], hull, { bottom: true });
    b.box("plain", [-1.15, 0.33, s > 0 ? 0.47 : -0.48], [1.15, 0.41, s > 0 ? 0.48 : -0.47], band);
    b.box("bark", [-1.2, 0.5, s > 0 ? 0.34 : -0.5], [1.2, 0.57, s > 0 ? 0.5 : -0.34], rail, { bottom: true });
  }
  // Bow, rising to a stem post, and stern.
  b.box("planks", [1.12, 0.02, -0.32], [1.34, 0.54, 0.32], hull, { bottom: true });
  b.box("planks", [1.34, 0.1, -0.18], [1.5, 0.62, 0.18], hull, { bottom: true });
  b.box("bark", [1.48, 0.2, -0.06], [1.6, 0.86, 0.06], rail, { bottom: true });
  b.box("planks", [-1.34, 0.02, -0.32], [-1.12, 0.54, 0.32], hull, { bottom: true });
  b.box("planks", [-1.48, 0.1, -0.18], [-1.34, 0.6, 0.18], hull, { bottom: true });
  b.box("bark", [-1.56, 0.2, -0.05], [-1.46, 0.72, 0.05], rail, { bottom: true });
  // Thwarts to sit on.
  for (const x of [-0.6, 0.65]) b.box("planks", [x - 0.09, 0.32, -0.38], [x + 0.09, 0.38, 0.38], 0xc8a888, { bottom: true });
  // Mast with the sail furled along its yard.
  b.box("bark", [0.2, 0.1, -0.05], [0.3, 2.35, 0.05], rail);
  b.box("bark", [0.21, 2.12, -0.75], [0.29, 2.2, 0.75], rail, { bottom: true });
  b.box("cloth", [0.17, 1.98, -0.68], [0.33, 2.14, 0.68], 0xf0e4c8, { bottom: true, sway: 0.15 });
  // Oars resting along the sides, and a heap of net at the stern.
  b.box("bark", [-1.3, 0.55, 0.28], [0.9, 0.6, 0.33], 0xa08870);
  b.box("bark", [-1.2, 0.55, -0.33], [1.0, 0.6, -0.28], 0xa08870);
  if (v % 2 === 0) b.box("plain", [-1.05, 0.16, -0.3], [-0.72, 0.3, 0.28], 0x7a6a58);
  else b.box("plain", [0.75, 0.16, -0.2], [1.0, 0.34, 0.2], 0xb8925a);
}

// ---- Plants and stones ----------------------------------------------------------------------------------------

function olive(b: VoxelBuilder, v: number) {
  const s = [0.92, 1, 1.12][v % 3];
  b.box("bark", [-0.13, -0.1, -0.12], [0.13, 0.62 * s, 0.13], 0xd0c0b0, { sway: [0, 0.05] });
  b.box("bark", [-0.02, 0.5 * s, -0.12], [0.22, 1.05 * s, 0.11], 0xd0c0b0, { sway: [0.05, 0.15] });
  b.box("bark", [-0.24, 0.55 * s, -0.04], [-0.06, 0.95 * s, 0.12], 0xd0c0b0, { sway: [0.05, 0.15] });
  const leaf = { sway: [0.2, 0.45] as [number, number], bottom: true };
  b.box("leaves", [-0.62 * s, 0.95 * s, -0.55 * s], [0.6 * s, 1.5 * s, 0.56 * s], LEAF_OLIVE, leaf);
  b.box("leaves", [-0.4 * s, 1.46 * s, -0.38 * s], [0.44 * s, 1.78 * s, 0.4 * s], 0x9fb478, leaf);
  b.box("leaves", [0.35 * s, 0.85 * s, -0.2 * s], [0.78 * s, 1.3 * s, 0.32 * s], 0x86a060, leaf);
  b.box("leaves", [-0.78 * s, 1.05 * s, 0.05 * s], [-0.4 * s, 1.4 * s, 0.45 * s], 0x86a060, leaf);
}

function palm(b: VoxelBuilder, v: number) {
  const height = 2.6 + (v % 3) * 0.3;
  const segments = 6;
  let x = 0;
  for (let i = 0; i < segments; i++) {
    const y0 = (height * i) / segments - (i === 0 ? 0.1 : 0);
    const y1 = (height * (i + 1)) / segments;
    b.box("bark", [x - 0.11, y0, -0.11], [x + 0.11, y1, 0.11], i % 2 ? 0xe0d0b8 : 0xc8b8a0, { sway: [(i / segments) * 0.8, ((i + 1) / segments) * 0.8] });
    x += 0.05;
  }
  const crown: Vec3 = [x, height, 0];
  b.box("leaves", [crown[0] - 0.16, height - 0.1, -0.16], [crown[0] + 0.16, height + 0.18, 0.16], 0x5a8a38, { sway: 0.85 });
  // Fronds radiating from the crown, drooping in steps.
  const fronds = 7;
  for (let f = 0; f < fronds; f++) {
    const a = (f / fronds) * Math.PI * 2 + 0.3;
    b.push(new THREE.Matrix4().makeRotationY(a).setPosition(crown[0], crown[1], crown[2]));
    for (let i = 0; i < 4; i++) {
      const x0 = 0.1 + i * 0.32;
      const drop = 0.05 * i * i + 0.04 * i;
      b.box("leaves", [x0, -drop, -0.12 + i * 0.01], [x0 + 0.36, -drop + 0.06, 0.12 - i * 0.01], i % 2 ? LEAF_PALM : 0x7aac4e, { sway: 0.9 + i * 0.1, bottom: true });
    }
    b.pop();
  }
  // A cluster of dates under the crown.
  b.box("plain", [crown[0] - 0.12, height - 0.4, 0.08], [crown[0] + 0.1, height - 0.1, 0.24], 0xb8682e, { sway: 0.8 });
}

function fig(b: VoxelBuilder, v: number) {
  const s = [1, 0.9, 1.1][v % 3];
  b.box("bark", [-0.16, -0.1, -0.16], [0.16, 0.8 * s, 0.16], 0xe0d4c8, { sway: [0, 0.05] });
  b.box("bark", [0.05, 0.6 * s, -0.08], [0.35, 0.95 * s, 0.1], 0xe0d4c8, { sway: [0.05, 0.12] });
  const leaf = { sway: [0.15, 0.4] as [number, number], bottom: true };
  b.box("leaves", [-0.75 * s, 0.8 * s, -0.7 * s], [0.75 * s, 1.35 * s, 0.7 * s], LEAF_FIG, leaf);
  b.box("leaves", [-0.55 * s, 1.3 * s, -0.5 * s], [0.6 * s, 1.62 * s, 0.52 * s], 0x6c9a48, leaf);
  b.box("leaves", [-0.95 * s, 0.9 * s, -0.25 * s], [-0.7 * s, 1.2 * s, 0.35 * s], 0x4f7a34, leaf);
  // Ripe figs.
  for (let i = 0; i < 5; i++) {
    const a = i * 1.9;
    const r = 0.72 * s;
    b.box("plain", [Math.cos(a) * r - 0.05, 0.95 * s + (i % 2) * 0.2, Math.sin(a) * r - 0.05], [Math.cos(a) * r + 0.05, 1.05 * s + (i % 2) * 0.2, Math.sin(a) * r + 0.05], 0x5e2e5a, { sway: 0.3 });
  }
}

function rock(b: VoxelBuilder, v: number) {
  const tone = [0x6a6560, 0x7c7670, 0xa8a090][v % 3];
  const top = [0x86807a, 0x958e86, 0xc0b8a8][v % 3];
  b.box("plain", [-0.38, -0.2, -0.3], [0.26, 0.34, 0.3], tone, { topColor: top });
  b.box("plain", [0.12, -0.2, -0.05], [0.44, 0.2, 0.36], tone, { topColor: top });
  b.box("plain", [-0.3, -0.2, 0.18], [-0.02, 0.14, 0.42], tone, { topColor: top });
  b.box("plain", [-0.2, 0.34, -0.16], [0.1, 0.42, 0.12], top);
}

/** A broad flat stone on the hillside: a quiet place to kneel and pray (Mark 1:35). */
function prayerRock(b: VoxelBuilder, o: WorldObject, base: number) {
  const x0 = o.x + 0.08;
  const x1 = o.x + o.w - 0.08;
  const z0 = o.y + 0.1;
  const z1 = o.y + o.h - 0.05;
  b.box("plain", [x0, base - 0.3, z0], [x1, base + 0.36, z1], 0xa49c8c, { topColor: 0xc8c0b0 });
  b.box("plain", [x0 + 0.2, base + 0.36, z0 + 0.1], [x1 - 0.3, base + 0.44, z1 - 0.15], 0xd2cabb);
  b.box("plain", [x1 - 0.2, base - 0.3, z0 - 0.15], [x1 + 0.15, base + 0.2, z0 + 0.4], 0x8f887a, { topColor: 0xaaa294 });
  b.box("leaves", [x0 - 0.05, base + 0.3, z0 + 0.05], [x0 + 0.35, base + 0.4, z0 + 0.35], 0x6f9a48);
}

function bush(b: VoxelBuilder, v: number) {
  const leaf = { sway: [0.1, 0.3] as [number, number], bottom: true };
  const green = [0x5f8a3b, 0x6f9444, 0x7a9a4a][v % 3];
  b.box("leaves", [-0.32, -0.02, -0.28], [0.3, 0.38, 0.3], green, leaf);
  b.box("leaves", [-0.1, 0.25, -0.15], [0.22, 0.52, 0.16], shadeHex(green, 1.1), leaf);
  b.box("leaves", [0.15, -0.02, 0.05], [0.42, 0.26, 0.36], shadeHex(green, 0.9), leaf);
  if (v === 1) {
    for (let i = 0; i < 4; i++) {
      const a = i * 1.7;
      b.box("plain", [Math.cos(a) * 0.3, 0.3 + (i % 2) * 0.1, Math.sin(a) * 0.3], [Math.cos(a) * 0.3 + 0.06, 0.36 + (i % 2) * 0.1, Math.sin(a) * 0.3 + 0.06], 0xe86aa0, { sway: 0.3 });
    }
  }
}

function reeds(b: VoxelBuilder, o: WorldObject, field: HeightField) {
  const v = o.variant ?? 0;
  const ground = Math.min(heightAt(field, o.x, o.y), WATER_LEVEL + 0.2);
  for (let i = 0; i < 9; i++) {
    const x = o.x + 0.1 + hash2(i, o.x, 21) * 0.8;
    const z = o.y + 0.3 + hash2(i, o.x, 22) * 1.1;
    const h = 0.7 + hash2(i, o.x, 23) * 0.5 + v * 0.08;
    const y0 = Math.min(ground, heightAt(field, x, z)) - 0.3;
    b.box("plain", [x, y0, z], [x + 0.045, ground + h, z + 0.045], i % 3 ? 0x7a9a4a : 0x8aa858, { sway: [0, 1] });
    if (i % 3 === 0) b.box("plain", [x - 0.025, ground + h - 0.2, z - 0.025], [x + 0.07, ground + h, z + 0.07], 0x6a4a2e, { sway: 1 });
  }
}

/** Wildflowers: "Consider the lilies of the field, how they grow" (Matthew 6:28). */
function flowers(b: VoxelBuilder, v: number, o: WorldObject) {
  const palette = [
    [0xd8433c, 0xe0583e],
    [0xf4f0e6, 0xf2cc40],
    [0x9a6ac0, 0xe86aa0],
  ][v % 3];
  for (let i = 0; i < 6; i++) {
    const x = (hash2(i, o.x * 7 + o.y, 31) - 0.5) * 0.7;
    const z = (hash2(i, o.x * 7 + o.y, 32) - 0.5) * 0.7;
    const h = 0.14 + hash2(i, o.x, 33) * 0.12;
    b.box("plain", [x, 0, z], [x + 0.035, h, z + 0.035], 0x5f8a3b, { sway: [0, 0.4] });
    b.box("plain", [x - 0.04, h, z - 0.04], [x + 0.075, h + 0.07, z + 0.075], palette[i % 2], { sway: 0.45 });
    b.box("plain", [x + 0.005, h + 0.07, z + 0.005], [x + 0.03, h + 0.09, z + 0.03], 0xf2d040, { sway: 0.45 });
  }
}

/** Nets drying on a frame by the boats, with cork floats along the top. */
function nets(b: VoxelBuilder, o: WorldObject, base: number) {
  const x0 = o.x + 0.1;
  const x1 = o.x + o.w - 0.1;
  const z = o.y + o.h / 2;
  b.box("bark", [x0, base - 0.1, z - 0.05], [x0 + 0.1, base + 1.45, z + 0.05], DARK_WOOD);
  b.box("bark", [x1 - 0.1, base - 0.1, z - 0.05], [x1, base + 1.45, z + 0.05], DARK_WOOD);
  b.box("bark", [x0 - 0.05, base + 1.35, z - 0.06], [x1 + 0.05, base + 1.45, z + 0.06], DARK_WOOD, { bottom: true });
  b.box("net", [x0 + 0.1, base + 0.25, z - 0.015], [x1 - 0.1, base + 1.35, z + 0.015], 0x6a5a48, { sway: [0.35, 0.02], bottom: true, uvScale: 2 });
  for (let x = x0 + 0.2; x < x1 - 0.15; x += 0.3) b.box("plain", [x, base + 1.2, z - 0.05], [x + 0.1, base + 1.3, z + 0.05], 0xd8b878, { sway: 0.05 });
  // A heap of net on the sand.
  b.box("net", [x0 + 0.2, base, z + 0.2], [x1 - 0.3, base + 0.14, z + 0.45], 0x6a5a48, { uvScale: 2 });
}

/** Stones, logs and glowing coals. The flames are a separate piece so they can flicker. */
function fire(b: VoxelBuilder, small: boolean) {
  const r = small ? 0.24 : 0.34;
  const stones = small ? 5 : 8;
  for (let i = 0; i < stones; i++) {
    const a = (i / stones) * Math.PI * 2;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    b.box("plain", [x - 0.08, -0.05, z - 0.07], [x + 0.08, 0.1, z + 0.07], 0x6a6560, { topColor: 0x847e78 });
  }
  b.box("bark", [-r * 0.8, 0, -0.04], [r * 0.8, 0.08, 0.04], 0x806048);
  b.box("bark", [-0.04, 0.02, -r * 0.8], [0.04, 0.1, r * 0.8], 0x806048);
  b.box("flame", [-r * 0.6, 0, -r * 0.6], [r * 0.6, 0.05, r * 0.6], 0xd8501e);
  if (small) {
    // A clay pot on the cooking fire.
    b.box("plain", [-0.13, 0.22, -0.13], [0.13, 0.46, 0.13], TERRACOTTA, { bottom: true });
    b.box("plain", [-0.1, 0.46, -0.1], [0.1, 0.5, 0.1], 0x8a4a2a);
  } else {
    // "A fire of coals there, with fish laid on it, and bread" (John 21:9).
    b.box("plain", [-0.2, 0.12, 0.05], [0.12, 0.17, 0.14], FISH);
    b.box("plain", [0.12, 0.11, 0.06], [0.2, 0.16, 0.13], 0x8a9ca6);
    b.box("plain", [r + 0.12, -0.02, -0.2], [r + 0.36, 0.1, 0.05], BREAD, { topColor: 0xdcac6a });
  }
}

function flames(b: VoxelBuilder, small: boolean) {
  const s = small ? 0.65 : 1;
  b.box("flame", [-0.16 * s, 0, -0.16 * s], [0.16 * s, 0.22 * s, 0.16 * s], 0xff6a1e);
  b.box("flame", [-0.1 * s, 0.2 * s, -0.1 * s], [0.1 * s, 0.42 * s, 0.1 * s], 0xff9a2e);
  b.box("flame", [-0.05 * s, 0.4 * s, -0.04 * s], [0.06 * s, 0.56 * s, 0.05 * s], 0xffd060);
  b.box("flame", [0.08 * s, 0.1 * s, -0.04 * s], [0.18 * s, 0.32 * s, 0.06 * s], 0xffb040);
  b.box("flame", [-0.18 * s, 0.08 * s, 0.02 * s], [-0.08 * s, 0.28 * s, 0.12 * s], 0xffb040);
}

// ---- Small things ---------------------------------------------------------------------------------------------

function jar(b: VoxelBuilder, x: number, y: number, z: number, s: number) {
  b.box("plain", [x - 0.13 * s, y, z - 0.13 * s], [x + 0.13 * s, y + 0.32 * s, z + 0.13 * s], TERRACOTTA, { topColor: 0xc87a4c });
  b.box("plain", [x - 0.07 * s, y + 0.32 * s, z - 0.07 * s], [x + 0.07 * s, y + 0.42 * s, z + 0.07 * s], 0xa85a34);
  b.box("plain", [x - 0.1 * s, y + 0.42 * s, z - 0.1 * s], [x + 0.1 * s, y + 0.46 * s, z + 0.1 * s], 0xc87a4c);
}

function jars(b: VoxelBuilder, v: number) {
  jar(b, -0.2, 0, -0.1, 1.15);
  jar(b, 0.18, 0, 0.05, 0.9);
  if (v !== 1) jar(b, -0.05, 0, 0.3, 0.75);
}

function baskets(b: VoxelBuilder, v: number) {
  const wicker = 0xb8925a;
  for (const [x, z, fill] of [
    [-0.18, -0.1, v % 2 ? BREAD : FISH],
    [0.2, 0.15, v % 2 ? FISH : 0xd8c070],
  ] as const) {
    b.box("plain", [x - 0.17, 0, z - 0.17], [x + 0.17, 0.22, z + 0.17], wicker, { topColor: fill });
    b.box("plain", [x - 0.18, 0.08, z - 0.18], [x + 0.18, 0.12, z + 0.18], 0x9a7448);
  }
}

/** A signpost to the places that open in later chapters. */
function signpost(b: VoxelBuilder) {
  b.box("bark", [-0.06, -0.1, -0.06], [0.06, 1.6, 0.06], DARK_WOOD);
  const boards: [number, number, number][] = [
    [1.35, 0.2, 0],
    [1.1, -0.15, Math.PI],
    [0.85, 0.1, -Math.PI / 2],
  ];
  for (const [y, tilt, yaw] of boards) {
    b.push(new THREE.Matrix4().makeRotationY(yaw + tilt).setPosition(0, y, 0));
    b.box("planks", [0.05, -0.1, -0.03], [0.6, 0.1, 0.03], 0xe8d0b0, { bottom: true });
    b.box("planks", [0.6, -0.06, -0.03], [0.68, 0.06, 0.03], 0xe8d0b0, { bottom: true });
    b.box("plain", [0.15, -0.02, 0.03], [0.5, 0.02, 0.035], 0x4a3626);
    b.pop();
  }
}

function lantern(b: VoxelBuilder) {
  b.box("bark", [-0.04, -0.1, -0.04], [0.04, 1.15, 0.04], DARK_WOOD);
  b.box("bark", [-0.04, 1.08, -0.04], [0.28, 1.14, 0.04], DARK_WOOD);
  b.box("glow", [0.15, 0.82, -0.07], [0.29, 1.0, 0.07], 0x5a4020, { bottom: true });
  b.box("plain", [0.13, 1.0, -0.09], [0.31, 1.04, 0.09], 0x3a3028);
}

/** A low table on a mat with bread and fish, where people share a meal (Acts 2:46). */
function table(b: VoxelBuilder, o: WorldObject, base: number) {
  const w = Math.max(1, o.w);
  const h = Math.max(1, o.h);
  const x0 = o.x + 0.1;
  const x1 = o.x + w - 0.1;
  const z0 = o.y + 0.1;
  const z1 = o.y + h - 0.1;
  b.box("cloth", [x0, base, z0], [x1, base + 0.03, z1], 0xc8b07a);
  const tx0 = x0 + 0.25;
  const tx1 = x1 - 0.25;
  const tz0 = z0 + 0.25;
  const tz1 = z1 - 0.25;
  for (const [x, z] of [
    [tx0, tz0],
    [tx1 - 0.08, tz0],
    [tx0, tz1 - 0.08],
    [tx1 - 0.08, tz1 - 0.08],
  ]) {
    b.box("bark", [x, base, z], [x + 0.08, base + 0.3, z + 0.08], DARK_WOOD);
  }
  b.box("planks", [tx0 - 0.04, base + 0.3, tz0 - 0.04], [tx1 + 0.04, base + 0.36, tz1 + 0.04], 0xe0c8b0, { bottom: true });
  const y = base + 0.36;
  const mx = (tx0 + tx1) / 2;
  const mz = (tz0 + tz1) / 2;
  b.box("plain", [mx - 0.3, y, mz - 0.12], [mx - 0.08, y + 0.08, mz + 0.06], BREAD, { topColor: 0xdcac6a });
  b.box("plain", [mx - 0.05, y, mz - 0.14], [mx + 0.12, y + 0.07, mz + 0.02], BREAD, { topColor: 0xdcac6a });
  b.box("plain", [mx + 0.1, y, mz + 0.06], [mx + 0.34, y + 0.04, mz + 0.14], FISH);
  b.box("plain", [mx + 0.34, y, mz + 0.07], [mx + 0.4, y + 0.04, mz + 0.13], 0x8a9ca6);
  jar(b, mx - 0.05, y, mz + 0.12, 0.45);
  // Cushions around it.
  const cushion = [0x8a3b2e, 0x45607a, 0x6a8a4a, 0xa88d63];
  const seats: [number, number][] = [
    [mx, z0 + 0.12],
    [mx, z1 - 0.12],
    [x0 + 0.12, mz],
    [x1 - 0.12, mz],
  ];
  seats.forEach(([x, z], i) => b.box("cloth", [x - 0.14, base + 0.03, z - 0.14], [x + 0.14, base + 0.1, z + 0.14], cushion[i]));
}

function shadeHex(color: number, k: number): number {
  const ch = (s: number) => Math.max(0, Math.min(255, Math.round(((color >> s) & 255) * k)));
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

export { FACE };
