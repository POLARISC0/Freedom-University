import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

/** Everything the scene animates each frame. */
export type Updater = (t: number, dt: number) => void;

export const V3 = THREE.Vector3;
export const RAINBOW = (t: number) => new THREE.Color().setHSL(((t % 1) + 1) % 1, 0.95, 0.58);

export function seeded(seed: number) {
  return () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
}

/** A stable seed from a name, so each district gets its own pattern. */
export function seedOf(name: string): number {
  let h = 7;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 2147483647;
  return h;
}

export const merge = mergeGeometries;

export function pick<T>(r: () => number, list: T[]): T {
  return list[Math.floor(r() * list.length)];
}

// ---------- Textures ----------

export function glowTexture(): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.35, "rgba(255,255,255,0.6)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

export function paintedTexture(): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, 256, 256);
  // Deterministic "painted" strokes for the Community Square centre.
  const r = seeded(7);
  for (let i = 0; i < 40; i++) {
    g.strokeStyle = `hsl(${Math.floor(r() * 360)} 95% 60% / 0.75)`;
    g.lineWidth = 6 + r() * 18;
    g.lineCap = "round";
    g.beginPath();
    g.moveTo(r() * 256, r() * 256);
    g.quadraticCurveTo(r() * 256, r() * 256, r() * 256, r() * 256);
    g.stroke();
  }
  return new THREE.CanvasTexture(c);
}

/** A soft, out-of-focus fragment for the foreground (a hex tile or a strand), pre-blurred. */
export function blurredTexture(kind: "hex" | "strand"): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  g.filter = "blur(7px)";
  g.translate(64, 64);
  if (kind === "hex") {
    g.fillStyle = "rgba(150, 182, 255, 0.9)";
    g.beginPath();
    for (let k = 0; k < 6; k++) g.lineTo(Math.cos((k / 6) * Math.PI * 2) * 40, Math.sin((k / 6) * Math.PI * 2) * 40);
    g.closePath();
    g.fill();
  } else {
    g.rotate(0.6);
    g.fillStyle = "rgba(255, 255, 255, 0.95)";
    g.strokeStyle = "rgba(30, 44, 74, 0.6)";
    g.lineWidth = 3;
    g.beginPath();
    g.ellipse(0, 0, 52, 9, 0, 0, Math.PI * 2);
    g.fill();
    g.stroke();
  }
  return new THREE.CanvasTexture(c);
}

/** A small white speech bubble, drawn once and used as a point sprite. */
export function bubbleTexture(): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  g.fillStyle = "#ffffff";
  g.strokeStyle = "#1b1e28";
  g.lineWidth = 3;
  g.beginPath();
  g.roundRect(6, 12, 52, 30, 10);
  g.moveTo(22, 42);
  g.lineTo(18, 54);
  g.lineTo(32, 42);
  g.fill();
  g.stroke();
  g.fillStyle = "#1b1e28";
  for (const x of [22, 32, 42]) g.fillRect(x - 2, 25, 4, 4);
  return new THREE.CanvasTexture(c);
}

// ---------- Meshes ----------

export function rainbowTorus(radius: number, tube: number, opacity = 1): THREE.Mesh {
  const geo = new THREE.TorusGeometry(radius, tube, 12, 128);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const a = (Math.atan2(pos.getY(i), pos.getX(i)) + Math.PI) / (Math.PI * 2);
    RAINBOW(a).toArray(colors, i * 3);
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: opacity < 1, opacity });
  return new THREE.Mesh(geo, mat);
}

/** Glossy glass that catches the room reflections. Thick stacks keep `depthWrite` so they don't shuffle. */
export function glass(color: string, opacity = 0.5, depthWrite = false): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, transparent: true, opacity, roughness: 0.06, metalness: 0.25, side: THREE.DoubleSide, depthWrite });
}

let ramp: THREE.DataTexture | null = null;

/** Flat tones for the cel-shaded look: faces turned from the sun are shadow, side faces half-lit, the rest lit. */
function toonRamp(): THREE.DataTexture {
  if (!ramp) {
    ramp = new THREE.DataTexture(new Uint8Array([31, 31, 31, 255, 31, 31, 31, 255, 140, 140, 140, 255, 255, 255, 255, 255]), 4, 1, THREE.RGBAFormat);
    ramp.minFilter = ramp.magFilter = THREE.NearestFilter;
    ramp.needsUpdate = true;
  }
  return ramp;
}

/** Cel-shaded surface: flat light and shadow bands, with shadows tinted blue by the sky light. */
export function solid(color = "#ffffff", extra: THREE.MeshToonMaterialParameters = {}): THREE.MeshToonMaterial {
  return new THREE.MeshToonMaterial({ color, gradientMap: toonRamp(), ...extra });
}

/** Thin dark-blue ink lines, as drawn over the white strands of an anime burst. */
export function ink(opacity = 0.5): THREE.LineBasicMaterial {
  return new THREE.LineBasicMaterial({ color: "#1E2C4A", transparent: true, opacity });
}

/** One instance of a shape: where it sits, how it turns, its size and colour. */
export interface Item {
  p: THREE.Vector3;
  r?: THREE.Euler;
  s?: THREE.Vector3;
  c?: THREE.Color;
}

const dummy = new THREE.Object3D();
const NO_TURN = new THREE.Euler();
const UNIT = new THREE.Vector3(1, 1, 1);

export function place(mesh: THREE.InstancedMesh, i: number, it: Item) {
  dummy.position.copy(it.p);
  dummy.rotation.copy(it.r ?? NO_TURN);
  dummy.scale.copy(it.s ?? UNIT);
  dummy.updateMatrix();
  mesh.setMatrixAt(i, dummy.matrix);
}

/** Many copies of one shape in a single draw call. */
export function instanced(geo: THREE.BufferGeometry, mat: THREE.Material, items: Item[]): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(geo, mat, items.length);
  items.forEach((it, i) => {
    place(mesh, i, it);
    if (it.c) mesh.setColorAt(i, it.c);
  });
  mesh.instanceMatrix.needsUpdate = true;
  // Instances move every frame, so a cached bounding sphere would cull them wrongly.
  mesh.frustumCulled = false;
  return mesh;
}

/** Thin tubes along many curves, merged into one geometry. */
export function tubes(curves: THREE.Curve<THREE.Vector3>[], radius: number, segments = 48): THREE.BufferGeometry {
  return mergeGeometries(curves.map((c) => new THREE.TubeGeometry(c, segments, radius, 5)));
}

/** 1px strokes along many curves, as one LineSegments geometry. */
export function strokes(curves: THREE.Curve<THREE.Vector3>[], segments = 40): THREE.BufferGeometry {
  const pts: THREE.Vector3[] = [];
  curves.forEach((c) => {
    const p = c.getPoints(segments);
    for (let i = 0; i < p.length - 1; i++) pts.push(p[i], p[i + 1]);
  });
  return new THREE.BufferGeometry().setFromPoints(pts);
}

/**
 * Flat ribbons along curves (the strands of a burst), merged into one geometry. They start thin at the root,
 * widen quickly, taper to a point and twist as they go. `edges` traces both long sides for ink outlines.
 */
export function ribbons(curves: THREE.Curve<THREE.Vector3>[], width: number, twist = 2, segments = 40) {
  const pos: number[] = [];
  const index: number[] = [];
  const edge: number[] = [];
  const side = new THREE.Vector3();
  curves.forEach((curve, ci) => {
    const frames = curve.computeFrenetFrames(segments, false);
    const start = pos.length / 3;
    for (let i = 0; i <= segments; i++) {
      const k = i / segments;
      const p = curve.getPointAt(k);
      const w = (width * Math.min(1, k * 6) * (1 - k) ** 0.8) / 2;
      const a = twist * k + ci;
      side.copy(frames.binormals[i]).multiplyScalar(Math.cos(a)).addScaledVector(frames.normals[i], Math.sin(a));
      pos.push(p.x + side.x * w, p.y + side.y * w, p.z + side.z * w, p.x - side.x * w, p.y - side.y * w, p.z - side.z * w);
      if (i < segments) {
        const v = start + i * 2;
        index.push(v, v + 1, v + 2, v + 1, v + 3, v + 2);
      }
    }
    for (let i = 0; i < segments; i++)
      for (const o of [0, 1]) {
        const a = (start + i * 2 + o) * 3;
        const b = a + 6;
        edge.push(pos[a], pos[a + 1], pos[a + 2], pos[b], pos[b + 1], pos[b + 2]);
      }
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(index);
  geo.computeVertexNormals();
  const edges = new THREE.BufferGeometry();
  edges.setAttribute("position", new THREE.Float32BufferAttribute(edge, 3));
  return { geo, edges };
}

/** A small bird, nose along +z and wings raised, so flapping is a scale on y. */
export function birdGeometry(span = 0.32): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute([
    0, 0, 0.18,   0, 0, -0.12,   -span, 0.1, -0.05,
    0, 0, 0.18,   span, 0.1, -0.05,   0, 0, -0.12,
  ], 3));
  geo.computeVertexNormals();
  return geo;
}

/** A tiny standing person for crowds. */
export function avatarGeometry(): THREE.BufferGeometry {
  return new THREE.CapsuleGeometry(0.028, 0.05, 2, 6).translate(0, 0.055, 0);
}

export const AVATAR_COLORS = ["#E0202E", "#E0202E", "#FFFFFF", "#FF3D8B", "#1b1e28", "#FFC400"];

// ---------- Hex plates ----------

export interface HexTiles {
  tiles: Item[];
  /** Edge tiles that have broken off and drift below the plate. */
  debris: Item[];
  /** Top centre of each intact tile, and how far out it sits (0 centre, 1 edge). */
  tops: { p: THREE.Vector3; d: number }[];
}

export interface HexOptions {
  rings: number;
  tint: string;
  accent?: string;
  seed: number;
  /** Where the plate's centre sits, for scattering several plates into one mesh. */
  at?: THREE.Vector3;
}

export const HEX_SIZE = 0.22;

/** A hex tile, flat side up, 0.1 thick. */
export function hexGeometry(): THREE.BufferGeometry {
  return new THREE.CylinderGeometry(HEX_SIZE * 0.92, HEX_SIZE * 0.92, 0.1, 6).rotateY(Math.PI / 6);
}

/**
 * A plate of hexagonal tiles with a ragged outline whose edge crumbles away, like a district
 * built on a hex grid. Tiles are tinted around `tint`, with a few `accent` tiles for colour pops.
 */
export function hexTiles(opts: HexOptions): HexTiles {
  const n = opts.rings;
  const r = seeded(opts.seed);
  const at = opts.at ?? new THREE.Vector3();
  const white = new THREE.Color("#ffffff");
  const tint = new THREE.Color(opts.tint);
  const accent = opts.accent ? new THREE.Color(opts.accent) : null;
  const out: HexTiles = { tiles: [], debris: [], tops: [] };
  for (let q = -n; q <= n; q++)
    for (let s = Math.max(-n, -q - n); s <= Math.min(n, -q + n); s++) {
      const d = Math.max(Math.abs(q), Math.abs(s), Math.abs(q + s)) / n;
      const edge = 0.7 + r() * 0.3;
      if (d > edge + 0.15) continue;
      const x = HEX_SIZE * 1.5 * q;
      const z = HEX_SIZE * Math.sqrt(3) * (s + q / 2);
      const c = white.clone().lerp(tint, 0.2 + r() * 0.35);
      if (accent && r() < 0.05) c.copy(accent);
      if (d > edge) {
        const fall = r() < 0.35 ? 0.8 + r() * 1.8 : 0.1 + r() * 0.5;
        out.debris.push({
          p: new THREE.Vector3(x * (1 + fall * 0.12), -fall, z * (1 + fall * 0.12)).add(at),
          r: new THREE.Euler((r() - 0.5) * 1.2, r() * 6, (r() - 0.5) * 1.2),
          s: new THREE.Vector3(1, 1, 1).multiplyScalar(0.55 + r() * 0.45),
          c,
        });
        continue;
      }
      const lift = r() < 0.1 ? 0.04 + r() * 0.1 : 0;
      out.tiles.push({ p: new THREE.Vector3(x, lift / 2, z).add(at), s: new THREE.Vector3(1, 1 + lift * 10, 1), c });
      out.tops.push({ p: new THREE.Vector3(x, 0.05 + lift, z).add(at), d });
    }
  return out;
}

/** Tiny buildings on a plate's tiles, tallest in the middle: a city seen from far above. */
export function cityBlocks(tops: HexTiles["tops"], r: () => number, density = 1, height = 1): Item[] {
  const accents = ["#3DFF8F", "#FFC400", "#B46CFF", "#FF3D8B", "#00C2FF"];
  const items: Item[] = [];
  tops.forEach(({ p, d }) => {
    if (d > 0.86 || r() > 0.9 * density) return;
    for (let k = 1 + Math.floor(r() * 3 * density); k > 0; k--) {
      const h = (0.06 + (1 - d) ** 2.2 * (0.25 + r() * 1.9) * (r() < 0.08 ? 1.8 : 1)) * height;
      const w = 0.05 + r() * 0.08;
      items.push({
        p: new THREE.Vector3(p.x + (r() - 0.5) * 0.2, p.y + h / 2, p.z + (r() - 0.5) * 0.2),
        s: new THREE.Vector3(w, h, w * (0.7 + r() * 0.6)),
        r: new THREE.Euler(0, Math.floor(r() * 6) * (Math.PI / 3), 0),
        c: r() < 0.06 ? new THREE.Color(pick(r, accents)) : new THREE.Color().setHSL(0.6, 0.08, 0.78 + r() * 0.2),
      });
    }
  });
  return items;
}
