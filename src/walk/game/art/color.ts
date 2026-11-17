// Small colour helpers for procedural pixel art.

export type RGB = [number, number, number];

export function hex(color: string): RGB {
  const n = parseInt(color.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function css([r, g, b]: RGB, alpha = 1): string {
  return alpha === 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${alpha})`;
}

/** Lighten (amount > 0) or darken (amount < 0) by a fraction. */
export function shade(color: string | RGB, amount: number): string {
  const [r, g, b] = typeof color === "string" ? hex(color) : color;
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(amount >= 0 ? c + (255 - c) * amount : c * (1 + amount))));
  return css([f(r), f(g), f(b)]);
}

export function mix(a: string | RGB, b: string | RGB, t: number): RGB {
  const ca = typeof a === "string" ? hex(a) : a;
  const cb = typeof b === "string" ? hex(b) : b;
  return [0, 1, 2].map((i) => Math.round(ca[i] + (cb[i] - ca[i]) * t)) as RGB;
}

export function makeCanvas(width: number, height: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.ceil(width));
  canvas.height = Math.max(1, Math.ceil(height));
  const ctx = canvas.getContext("2d", { willReadFrequently: false })!;
  ctx.imageSmoothingEnabled = false;
  return { canvas, ctx };
}

/** Fill a rectangle in one colour (pixel coordinates, integers expected). */
export function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

export function px(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
}

/** A filled ellipse made of whole pixels, for blobby foliage and shadows. */
export function blob(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, color: string) {
  ctx.fillStyle = color;
  for (let y = -ry; y <= ry; y++) {
    const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y / ry) ** 2)));
    ctx.fillRect(Math.round(cx - half), Math.round(cy + y), half * 2 + 1, 1);
  }
}
