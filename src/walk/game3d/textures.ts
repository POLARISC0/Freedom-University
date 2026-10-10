// Procedural 16x16 pixel textures, Minecraft-style: painted on a canvas once at start-up from a seeded random
// generator, so the world looks the same every time it loads. Sampled with nearest filtering to stay crisp.

import * as THREE from "three";
import { hex, makeCanvas, mix, type RGB } from "@/walk/game/art/color";
import { rng } from "@/walk/world/noise";

export const TEXTURE_SIZE = 16;

export type TextureKey =
  | "grass"
  | "grassSide"
  | "dirt"
  | "sand"
  | "stone"
  | "limestone"
  | "road"
  | "plaza"
  | "field"
  | "meadow"
  | "planks"
  | "bark"
  | "leaves"
  | "cloth"
  | "roof"
  | "plain"
  | "net";

type Painter = (p: PixelPainter) => void;

class PixelPainter {
  readonly data: Uint8ClampedArray;
  readonly random: () => number;

  constructor(seed: number) {
    this.data = new Uint8ClampedArray(TEXTURE_SIZE * TEXTURE_SIZE * 4);
    this.random = rng(seed);
  }

  set(x: number, y: number, [r, g, b]: RGB, a = 255) {
    const i = (((y + TEXTURE_SIZE) % TEXTURE_SIZE) * TEXTURE_SIZE + ((x + TEXTURE_SIZE) % TEXTURE_SIZE)) * 4;
    this.data[i] = r;
    this.data[i + 1] = g;
    this.data[i + 2] = b;
    this.data[i + 3] = a;
  }

  /** Fill with a colour, each pixel jittered in brightness by up to `jitter`. */
  noise(base: string | RGB, jitter: number) {
    const c = typeof base === "string" ? hex(base) : base;
    for (let y = 0; y < TEXTURE_SIZE; y++) {
      for (let x = 0; x < TEXTURE_SIZE; x++) {
        const k = 1 + (this.random() * 2 - 1) * jitter;
        this.set(x, y, [c[0] * k, c[1] * k, c[2] * k].map(Math.round) as RGB);
      }
    }
  }

  /** Scatter single pixels of a colour. */
  flecks(color: string | RGB, count: number, rows: [number, number] = [0, TEXTURE_SIZE]) {
    const c = typeof color === "string" ? hex(color) : color;
    for (let n = 0; n < count; n++) {
      const x = Math.floor(this.random() * TEXTURE_SIZE);
      const y = rows[0] + Math.floor(this.random() * (rows[1] - rows[0]));
      this.set(x, y, c);
    }
  }

  rect(x: number, y: number, w: number, h: number, color: string | RGB, alpha = 255) {
    const c = typeof color === "string" ? hex(color) : color;
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, c, alpha);
  }

  /** Darken or lighten one pixel in place. */
  tint(x: number, y: number, k: number) {
    const i = (((y + TEXTURE_SIZE) % TEXTURE_SIZE) * TEXTURE_SIZE + ((x + TEXTURE_SIZE) % TEXTURE_SIZE)) * 4;
    for (let c = 0; c < 3; c++) this.data[i + c] = Math.min(255, this.data[i + c] * k);
  }
}

const GRASS = "#76a14a";
const DIRT = "#8c6a47";

const PAINTERS: Record<TextureKey, Painter> = {
  grass: (p) => {
    p.noise(GRASS, 0.07);
    p.flecks("#8fbb57", 22);
    p.flecks("#5f8a3b", 18);
    p.flecks("#a3c76a", 5);
  },
  grassSide: (p) => {
    p.noise(DIRT, 0.1);
    p.flecks("#6f5236", 14, [4, 16]);
    p.flecks("#a7865e", 8, [4, 16]);
    // A grass fringe along the top with uneven drips.
    for (let x = 0; x < TEXTURE_SIZE; x++) {
      const drip = 2 + Math.floor(p.random() * 3);
      for (let y = 0; y < drip; y++) p.set(x, y, mix(GRASS, "#5f8a3b", p.random() * 0.6));
    }
  },
  dirt: (p) => {
    p.noise(DIRT, 0.1);
    p.flecks("#6f5236", 18);
    p.flecks("#a7865e", 10);
    p.flecks("#7d7a74", 4);
  },
  sand: (p) => {
    p.noise("#e4cf9c", 0.05);
    p.flecks("#d2ba84", 22);
    p.flecks("#f2e2b8", 12);
    p.flecks("#b8a07a", 4);
  },
  stone: (p) => {
    // Capernaum's black basalt: rough dark blocks laid in courses with pale mortar.
    p.noise("#45413f", 0.12);
    const mortar = hex("#8a8278");
    for (let row = 0; row < 4; row++) {
      const y = row * 4;
      for (let x = 0; x < TEXTURE_SIZE; x++) p.set(x, y, mortar);
      const offset = row % 2 ? 4 : 0;
      for (let k = 0; k < 2; k++) for (let j = 1; j < 4; j++) p.set(offset + k * 8, y + j, mortar);
    }
    p.flecks("#2e2b2a", 16);
    p.flecks("#5a5552", 10);
  },
  limestone: (p) => {
    p.noise("#ddd2b8", 0.05);
    const line = hex("#bfb193");
    for (let row = 0; row < 2; row++) {
      for (let x = 0; x < TEXTURE_SIZE; x++) p.set(x, row * 8, line);
      for (let j = 1; j < 8; j++) p.set(row % 2 ? 4 : 12, row * 8 + j, line);
    }
    p.flecks("#efe7d4", 12);
    p.flecks("#c9bb9c", 10);
  },
  road: (p) => {
    p.noise("#bf9f6e", 0.07);
    p.flecks("#a68658", 20);
    p.flecks("#d6bc8e", 12);
    p.flecks("#8f8a80", 6);
  },
  plaza: (p) => {
    // Paving slabs of grey basalt with darker joints.
    p.noise("#7a756d", 0.08);
    const joint = hex("#4f4b46");
    for (let x = 0; x < TEXTURE_SIZE; x++) {
      p.set(x, 0, joint);
      p.set(x, 7, joint);
    }
    for (let y = 0; y < 7; y++) p.set(5, y, joint);
    for (let y = 7; y < 16; y++) p.set(11, y, joint);
    for (let y = 0; y < 7; y++) p.set(13, y, joint);
    p.flecks("#8f8a80", 14);
    p.flecks("#66615a", 10);
  },
  field: (p) => {
    // Ripe wheat: golden rows of stalks.
    p.noise("#d6b765", 0.06);
    for (let x = 0; x < TEXTURE_SIZE; x += 3) for (let y = 0; y < TEXTURE_SIZE; y++) if (p.random() < 0.7) p.set(x, y, hex("#b8963f"));
    p.flecks("#ecd28a", 18);
  },
  meadow: (p) => {
    p.noise("#7ea64e", 0.07);
    p.flecks("#94bc5c", 18);
    p.flecks("#5f8a3b", 14);
    // Wildflowers: the lilies of the field.
    p.flecks("#e0483e", 3);
    p.flecks("#f4f0e2", 3);
    p.flecks("#a678cc", 2);
    p.flecks("#f2cc40", 2);
  },
  planks: (p) => {
    p.noise("#9c7149", 0.06);
    for (let row = 0; row < 4; row++) {
      const y = row * 4 + 3;
      for (let x = 0; x < TEXTURE_SIZE; x++) p.set(x, y, hex("#6a4a2e"));
      const end = (row * 7 + 3) % TEXTURE_SIZE;
      for (let j = y - 3; j < y; j++) p.set(end, j, hex("#6a4a2e"));
    }
    p.flecks("#b28660", 10);
    p.flecks("#84603e", 12);
  },
  bark: (p) => {
    p.noise("#6e5038", 0.1);
    for (let x = 0; x < TEXTURE_SIZE; x += 2) for (let y = 0; y < TEXTURE_SIZE; y++) if (p.random() < 0.45) p.tint(x, y, 0.78);
    p.flecks("#8a6a4c", 10);
  },
  leaves: (p) => {
    p.noise("#ffffff", 0.0);
    // Leaf texture is pale and patterned; vertex colours give each tree its green.
    for (let y = 0; y < TEXTURE_SIZE; y++) {
      for (let x = 0; x < TEXTURE_SIZE; x++) {
        const v = 0.78 + p.random() * 0.22;
        p.set(x, y, [255 * v, 255 * v, 255 * v].map(Math.round) as RGB);
      }
    }
    for (let n = 0; n < 14; n++) {
      const x = Math.floor(p.random() * 16);
      const y = Math.floor(p.random() * 16);
      p.tint(x, y, 0.62);
      p.tint(x + 1, y, 0.75);
    }
    p.flecks("#ffffff", 10);
  },
  cloth: (p) => {
    // A soft weave, near white; vertex colours dye it.
    for (let y = 0; y < TEXTURE_SIZE; y++) {
      for (let x = 0; x < TEXTURE_SIZE; x++) {
        const weave = (x + y) % 2 === 0 ? 1 : 0.95;
        const v = weave * (0.93 + p.random() * 0.07);
        p.set(x, y, [255 * v, 255 * v, 255 * v].map(Math.round) as RGB);
      }
    }
  },
  roof: (p) => {
    // Flat roofs of packed clay over reeds and beams (Mark 2:4).
    p.noise("#b49a74", 0.07);
    p.flecks("#cdb48a", 16);
    p.flecks("#9a8060", 14);
    for (let n = 0; n < 6; n++) {
      const x = Math.floor(p.random() * 14);
      const y = Math.floor(p.random() * 16);
      p.rect(x, y, 3, 1, "#d8c48e");
    }
  },
  plain: (p) => {
    for (let y = 0; y < TEXTURE_SIZE; y++) {
      for (let x = 0; x < TEXTURE_SIZE; x++) {
        const v = 0.92 + p.random() * 0.08;
        p.set(x, y, [255 * v, 255 * v, 255 * v].map(Math.round) as RGB);
      }
    }
  },
  net: (p) => {
    // Knotted fishing net: a diagonal mesh of cord, open in between.
    for (let y = 0; y < TEXTURE_SIZE; y++) {
      for (let x = 0; x < TEXTURE_SIZE; x++) {
        const cord = (x + y) % 5 === 0 || (x - y + 20) % 5 === 0;
        if (cord) p.set(x, y, mix("#ffffff", "#c8c0b0", p.random()), 255);
        else p.set(x, y, [0, 0, 0], 0);
      }
    }
  },
};

const SEEDS: Record<TextureKey, number> = {
  grass: 11,
  grassSide: 12,
  dirt: 13,
  sand: 14,
  stone: 15,
  limestone: 16,
  road: 17,
  plaza: 18,
  field: 19,
  meadow: 20,
  planks: 21,
  bark: 22,
  leaves: 23,
  cloth: 24,
  roof: 25,
  plain: 26,
  net: 27,
};

/** Paint one texture's pixels (RGBA, 16x16). Pure apart from the canvas, so it can be tested. */
export function paintPixels(key: TextureKey): Uint8ClampedArray {
  const painter = new PixelPainter(SEEDS[key]);
  PAINTERS[key](painter);
  return painter.data;
}

/** A repeating, crisp texture for a material. */
export function makeTexture(key: TextureKey, anisotropy = 1): THREE.Texture {
  const { canvas, ctx } = makeCanvas(TEXTURE_SIZE, TEXTURE_SIZE);
  const image = ctx.createImageData(TEXTURE_SIZE, TEXTURE_SIZE);
  image.data.set(paintPixels(key));
  ctx.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.NearestFilter;
  // Mipmaps keep distant ground from shimmering; up close every pixel stays sharp.
  texture.minFilter = THREE.NearestMipmapLinearFilter;
  texture.anisotropy = anisotropy;
  texture.generateMipmaps = true;
  return texture;
}

/** A soft round spot (white centre fading out), for blob shadows, glows and rings. */
export function makeGlowTexture(size = 64, ring = false): THREE.Texture {
  const { canvas, ctx } = makeCanvas(size, size);
  ctx.imageSmoothingEnabled = true;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  if (ring) {
    g.addColorStop(0, "rgba(255,255,255,0)");
    g.addColorStop(0.62, "rgba(255,255,255,0)");
    g.addColorStop(0.8, "rgba(255,255,255,1)");
    g.addColorStop(1, "rgba(255,255,255,0)");
  } else {
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.45, "rgba(255,255,255,0.55)");
    g.addColorStop(1, "rgba(255,255,255,0)");
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
