// Builds blocky geometry out of boxes and quads, grouped by material so a whole layer of the world (every stone
// wall, every leaf) becomes one mesh and one draw call. Colours are per vertex; textures tile in world units, so a
// 16-pixel texture covers one block like in Minecraft.

import * as THREE from "three";

export type Vec3 = [number, number, number];

/** Face bits for `BoxOptions.skip`. */
export const FACE = { px: 1, nx: 2, py: 4, ny: 8, pz: 16, nz: 32 } as const;

export interface BoxOptions {
  /** Faces to leave out (FACE bits). The bottom face is left out unless `bottom` is set. */
  skip?: number;
  bottom?: boolean;
  /** Wind sway, at the bottom and top of the box (one number: the same everywhere). */
  sway?: number | [number, number];
  /** Texture repeats per block (default 1). */
  uvScale?: number;
  /** Shift the texture, e.g. so a grass fringe lines up with the top of a step. */
  uvOffset?: [number, number];
  /** Per-face colour override for the top face, e.g. a lighter roof. */
  topColor?: THREE.ColorRepresentation;
}

interface FaceDef {
  bit: number;
  normal: Vec3;
  shade: number;
  origin: (a: Vec3, b: Vec3) => Vec3;
  right: (a: Vec3, b: Vec3) => Vec3;
  up: (a: Vec3, b: Vec3) => Vec3;
}

// Each face: an origin corner and two edges whose cross product points outwards (counter-clockwise from outside).
// A little baked shading per side keeps blocks readable even in flat light, as in Minecraft.
const FACES: FaceDef[] = [
  { bit: FACE.px, normal: [1, 0, 0], shade: 0.9, origin: (a, b) => [b[0], a[1], b[2]], right: (a, b) => [0, 0, a[2] - b[2]], up: (a, b) => [0, b[1] - a[1], 0] },
  { bit: FACE.nx, normal: [-1, 0, 0], shade: 0.84, origin: (a) => [a[0], a[1], a[2]], right: (a, b) => [0, 0, b[2] - a[2]], up: (a, b) => [0, b[1] - a[1], 0] },
  { bit: FACE.py, normal: [0, 1, 0], shade: 1, origin: (a, b) => [a[0], b[1], b[2]], right: (a, b) => [b[0] - a[0], 0, 0], up: (a, b) => [0, 0, a[2] - b[2]] },
  { bit: FACE.ny, normal: [0, -1, 0], shade: 0.7, origin: (a) => [a[0], a[1], a[2]], right: (a, b) => [b[0] - a[0], 0, 0], up: (a, b) => [0, 0, b[2] - a[2]] },
  { bit: FACE.pz, normal: [0, 0, 1], shade: 0.96, origin: (a, b) => [a[0], a[1], b[2]], right: (a, b) => [b[0] - a[0], 0, 0], up: (a, b) => [0, b[1] - a[1], 0] },
  { bit: FACE.nz, normal: [0, 0, -1], shade: 0.88, origin: (a, b) => [b[0], a[1], a[2]], right: (a, b) => [a[0] - b[0], 0, 0], up: (a, b) => [0, b[1] - a[1], 0] },
];

class Part {
  positions: number[] = [];
  normals: number[] = [];
  colors: number[] = [];
  uvs: number[] = [];
  sway: number[] = [];
  skinIndex: number[] = [];
  indices: number[] = [];
}

const colorCache = new Map<THREE.ColorRepresentation, THREE.Color>();
function toColor(c: THREE.ColorRepresentation): THREE.Color {
  if (c instanceof THREE.Color) return c;
  let cached = colorCache.get(c);
  if (!cached) {
    cached = new THREE.Color(c);
    colorCache.set(c, cached);
  }
  return cached;
}

const _p = new THREE.Vector3();
const _n = new THREE.Vector3();

export class VoxelBuilder {
  /** Bone that new geometry is bound to, for skinned characters. */
  bone = 0;
  private parts = new Map<string, Part>();
  private matrix = new THREE.Matrix4();
  private normalMatrix = new THREE.Matrix3();
  private stack: THREE.Matrix4[] = [];
  private mirrored = false;
  private readonly skinned: boolean;

  constructor({ skinned = false }: { skinned?: boolean } = {}) {
    this.skinned = skinned;
  }

  /** Apply a transform to everything added until the matching `pop`. */
  push(m: THREE.Matrix4) {
    this.stack.push(this.matrix.clone());
    this.matrix.multiply(m);
    this.updateNormalMatrix();
  }

  pop() {
    this.matrix = this.stack.pop() ?? new THREE.Matrix4();
    this.updateNormalMatrix();
  }

  /** Translate (and optionally turn about the vertical axis) until the matching `pop`. */
  pushAt(x: number, y: number, z: number, yaw = 0) {
    this.push(new THREE.Matrix4().makeRotationY(yaw).setPosition(x, y, z));
  }

  private updateNormalMatrix() {
    this.normalMatrix.getNormalMatrix(this.matrix);
    this.mirrored = this.matrix.determinant() < 0;
  }

  /** An axis-aligned box (in the current transform) from corner `a` to corner `b`. */
  box(material: string, a: Vec3, b: Vec3, color: THREE.ColorRepresentation, opts: BoxOptions = {}) {
    const skip = (opts.skip ?? 0) | (opts.bottom ? 0 : FACE.ny);
    const c = toColor(color);
    const top = opts.topColor !== undefined ? toColor(opts.topColor) : c;
    const sway = opts.sway ?? 0;
    const [s0, s1] = typeof sway === "number" ? [sway, sway] : sway;
    for (const f of FACES) {
      if (skip & f.bit) continue;
      const fc = f.bit === FACE.py ? top : c;
      this.face(material, f.origin(a, b), f.right(a, b), f.up(a, b), fc, {
        normal: f.normal,
        shade: f.shade,
        uvScale: opts.uvScale,
        uvOffset: opts.uvOffset,
        sway: s0 === s1 ? s0 : undefined,
        swayRange: s0 === s1 ? undefined : [a[1], b[1], s0, s1],
      });
    }
  }

  /**
   * One quad from `origin` along `right` and `up` (counter-clockwise seen from the front). Texture coordinates are
   * the position along those edges, so textures line up across neighbouring faces.
   */
  face(
    material: string,
    origin: Vec3,
    right: Vec3,
    up: Vec3,
    color: THREE.ColorRepresentation,
    opts: {
      normal?: Vec3;
      shade?: number;
      /** Brightness per corner (origin, +right, +right+up, +up), for ambient occlusion. */
      corners?: [number, number, number, number];
      uvScale?: number;
      uvOffset?: [number, number];
      sway?: number;
      swayRange?: [number, number, number, number];
    } = {},
  ) {
    const part = this.part(material);
    const c = toColor(color);
    const shade = opts.shade ?? 1;
    const scale = opts.uvScale ?? 1;
    const rl = Math.hypot(...right) || 1;
    const ul = Math.hypot(...up) || 1;
    const rd: Vec3 = [right[0] / rl, right[1] / rl, right[2] / rl];
    const ud: Vec3 = [up[0] / ul, up[1] / ul, up[2] / ul];
    const normal = opts.normal ?? cross(rd, ud);
    _n.set(normal[0], normal[1], normal[2]).applyMatrix3(this.normalMatrix).normalize();
    const base = part.positions.length / 3;
    const corners: Vec3[] = [
      origin,
      [origin[0] + right[0], origin[1] + right[1], origin[2] + right[2]],
      [origin[0] + right[0] + up[0], origin[1] + right[1] + up[1], origin[2] + right[2] + up[2]],
      [origin[0] + up[0], origin[1] + up[1], origin[2] + up[2]],
    ];
    const [du, dv] = opts.uvOffset ?? [0, 0];
    corners.forEach((p, k) => {
      _p.set(p[0], p[1], p[2]).applyMatrix4(this.matrix);
      part.positions.push(_p.x, _p.y, _p.z);
      part.normals.push(_n.x, _n.y, _n.z);
      const ao = opts.corners ? opts.corners[k] : 1;
      part.colors.push(c.r * shade * ao, c.g * shade * ao, c.b * shade * ao);
      part.uvs.push((dot(p, rd) + du) * scale, (dot(p, ud) + dv) * scale);
      let sway = opts.sway ?? 0;
      if (opts.swayRange) {
        const [y0, y1, s0, s1] = opts.swayRange;
        const t = y1 > y0 ? Math.min(1, Math.max(0, (p[1] - y0) / (y1 - y0))) : 0;
        sway = s0 + (s1 - s0) * t;
      }
      part.sway.push(sway);
      if (this.skinned) part.skinIndex.push(this.bone, 0, 0, 0);
    });
    if (this.mirrored) part.indices.push(base, base + 2, base + 1, base, base + 3, base + 2);
    else part.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }

  private part(material: string): Part {
    let part = this.parts.get(material);
    if (!part) {
      part = new Part();
      this.parts.set(material, part);
    }
    return part;
  }

  get isEmpty(): boolean {
    return this.parts.size === 0;
  }

  /** One geometry per material. */
  build(): Map<string, THREE.BufferGeometry> {
    const out = new Map<string, THREE.BufferGeometry>();
    for (const [material, part] of this.parts) {
      if (part.indices.length === 0) continue;
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(part.positions, 3));
      g.setAttribute("normal", new THREE.Float32BufferAttribute(part.normals, 3));
      g.setAttribute("color", new THREE.Float32BufferAttribute(part.colors, 3));
      g.setAttribute("uv", new THREE.Float32BufferAttribute(part.uvs, 2));
      g.setAttribute("sway", new THREE.Float32BufferAttribute(part.sway, 1));
      if (this.skinned) {
        g.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(part.skinIndex, 4));
        const weights = new Float32Array(part.skinIndex.length);
        for (let i = 0; i < weights.length; i += 4) weights[i] = 1;
        g.setAttribute("skinWeight", new THREE.BufferAttribute(weights, 4));
      }
      const vertexCount = part.positions.length / 3;
      g.setIndex(vertexCount > 65535 ? new THREE.Uint32BufferAttribute(part.indices, 1) : new THREE.Uint16BufferAttribute(part.indices, 1));
      g.computeBoundingSphere();
      g.computeBoundingBox();
      out.set(material, g);
    }
    return out;
  }
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
