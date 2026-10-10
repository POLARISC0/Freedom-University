import type { Appearance } from "@/walk/content";
import type { Facing } from "@/walk/world/types";
import { blob, makeCanvas, mix, px, rect, shade, css } from "./color";

export const FRAME_W = 16;
export const FRAME_H = 24;
export const DIRECTIONS: Facing[] = ["down", "left", "right", "up"];
export const FRAMES_PER_DIR = 3;

type Ctx = CanvasRenderingContext2D;

/**
 * A sprite sheet for one person: rows are directions (down, left, right, up), columns are frames
 * (standing, left foot forward, right foot forward). Each frame is 16x24 with the feet at the bottom.
 */
export function characterSheet(a: Appearance): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(FRAME_W * FRAMES_PER_DIR, FRAME_H * DIRECTIONS.length);
  DIRECTIONS.forEach((dir, row) => {
    for (let f = 0; f < FRAMES_PER_DIR; f++) drawPerson(ctx, f * FRAME_W, row * FRAME_H, a, dir, f);
  });
  return canvas;
}

function drawPerson(ctx: Ctx, ox: number, oy: number, a: Appearance, dir: Facing, frame: number) {
  const child = a.build === "child";
  // Body measurements; children are shorter and slimmer.
  const headH = child ? 6 : 7;
  const bodyH = child ? 8 : 11;
  const half = child ? 3 : 4;
  const feetY = oy + FRAME_H - 2;
  const bob = frame === 0 ? 0 : 1;
  const bodyBottom = feetY - 1;
  const bodyTop = bodyBottom - bodyH + bob;
  const headTop = bodyTop - headH + 1;
  const cx = ox + 8;

  const robe = a.robe;
  const robeDark = shade(robe, -0.28);
  const robeLight = shade(robe, 0.14);
  const skin = a.skin;
  const skinDark = shade(skin, -0.2);
  const hair = a.grey ? css(mix(a.hair, "#a9a39a", 0.55)) : a.hair;
  const side = dir === "left" || dir === "right";
  const flip = dir === "left" ? -1 : 1;

  // Shadow.
  blob(ctx, cx, feetY, child ? 4 : 5, 1, "rgba(20,15,10,0.28)");

  // Sandaled feet, stepping.
  const step = frame === 1 ? 1 : frame === 2 ? -1 : 0;
  if (side) {
    rect(ctx, cx - 2 + step * flip, feetY - 1, 3, 1, "#5a3a22");
    rect(ctx, cx - 1 - step * flip, feetY - 1, 3, 1, "#4a2f1c");
  } else {
    rect(ctx, cx - 3, feetY - 1 - (step > 0 ? 1 : 0), 2, 2, skinDark);
    rect(ctx, cx + 1, feetY - 1 - (step < 0 ? 1 : 0), 2, 2, skinDark);
    rect(ctx, cx - 3, feetY - (step > 0 ? 1 : 0), 2, 1, "#5a3a22");
    rect(ctx, cx + 1, feetY - (step < 0 ? 1 : 0), 2, 1, "#5a3a22");
  }

  // Robe: a tunic that widens towards the hem.
  for (let y = bodyTop; y < bodyBottom; y++) {
    const t = (y - bodyTop) / bodyH;
    const w = Math.round(half + t * 1.6);
    const left = cx - w;
    const width = side ? w * 2 - 1 : w * 2;
    rect(ctx, left + (side ? 1 : 0), y, width, 1, robe);
    px(ctx, left + (side ? 1 : 0), y, robeDark);
    px(ctx, left + width - 1 + (side ? 1 : 0), y, robeDark);
  }
  rect(ctx, cx - half - 1, bodyBottom - 1, half * 2 + 2, 1, robeDark);
  if (!side) rect(ctx, cx - 1, bodyTop + 2, 1, bodyH - 3, robeLight);

  // Sash at the waist.
  const waist = bodyTop + Math.round(bodyH * 0.42);
  rect(ctx, cx - half, waist, half * 2, 1, a.sash);
  if (dir === "down") px(ctx, cx + 1, waist + 1, a.sash);

  // Outer cloak over the shoulders.
  if (a.mantle) {
    const m = a.mantle;
    if (dir === "up") {
      rect(ctx, cx - half, bodyTop, half * 2, bodyH - 2, m);
      rect(ctx, cx - half, bodyTop, half * 2, 1, shade(m, 0.15));
    } else if (side) {
      rect(ctx, cx - half + 1, bodyTop, half * 2 - 2, 3, m);
      rect(ctx, cx - (flip > 0 ? half - 1 : 0), bodyTop + 3, half, bodyH - 5, m);
    } else {
      rect(ctx, cx - half, bodyTop, half * 2, 2, m);
      for (let i = 0; i < bodyH - 3; i++) rect(ctx, cx - half + Math.floor(i * 0.6), bodyTop + 2 + i, 2, 1, m);
    }
  }

  // Arms swinging with each step.
  const swing = frame === 1 ? 1 : frame === 2 ? -1 : 0;
  if (side) {
    const armX = cx + (flip > 0 ? -1 : 0);
    rect(ctx, armX + swing * flip, bodyTop + 2, 2, 5, robeDark);
    px(ctx, armX + swing * flip, bodyTop + 7, skin);
  } else {
    rect(ctx, cx - half - 1, bodyTop + 1 + Math.max(0, swing), 1, 5, robeDark);
    rect(ctx, cx + half, bodyTop + 1 + Math.max(0, -swing), 1, 5, robeDark);
    px(ctx, cx - half - 1, bodyTop + 6 + Math.max(0, swing), skin);
    px(ctx, cx + half, bodyTop + 6 + Math.max(0, -swing), skin);
  }

  // Head.
  const hw = child ? 3 : 3;
  const hx = cx - hw;
  rect(ctx, hx, headTop + 1, hw * 2 + 1, headH - 1, skin);
  rect(ctx, hx + 1, headTop, hw * 2 - 1, 1, skin);
  // Hair on top and at the back.
  if (dir === "up") {
    rect(ctx, hx, headTop, hw * 2 + 1, headH - 1, hair);
  } else {
    rect(ctx, hx, headTop, hw * 2 + 1, 2, hair);
    if (side) rect(ctx, flip > 0 ? hx : hx + hw + 1, headTop + 2, hw, headH - 3, hair);
    else {
      px(ctx, hx, headTop + 2, hair);
      px(ctx, hx + hw * 2, headTop + 2, hair);
    }
  }
  // Face.
  const eyeY = headTop + 3;
  if (dir === "down") {
    px(ctx, cx - 2, eyeY, "#1c140e");
    px(ctx, cx + 2, eyeY, "#1c140e");
  } else if (side) {
    px(ctx, cx + 2 * flip, eyeY, "#1c140e");
    px(ctx, cx + 4 * flip, eyeY + 1, skinDark);
  }
  // Beard.
  if (a.beard !== "none" && dir !== "up" && !child) {
    const beardTop = a.beard === "full" ? headTop + headH - 3 : headTop + headH - 2;
    if (side) rect(ctx, flip > 0 ? cx : cx - 2, beardTop, 4, headH - (beardTop - headTop), hair);
    else {
      rect(ctx, hx + 1, beardTop, hw * 2 - 1, headH - (beardTop - headTop), hair);
      if (a.beard === "full") px(ctx, cx, beardTop, shade(skin, -0.35));
    }
  }
  // Head covering, draping to the shoulders.
  if (a.headcloth) {
    const hc = a.headcloth;
    rect(ctx, hx - 1, headTop - 1, hw * 2 + 3, 2, hc);
    if (dir === "up") rect(ctx, hx - 1, headTop, hw * 2 + 3, headH + 2, hc);
    else if (side) rect(ctx, flip > 0 ? hx - 1 : hx + hw + 1, headTop, hw + 1, headH + 2, hc);
    else {
      rect(ctx, hx - 1, headTop, 1, headH + 2, hc);
      rect(ctx, hx + hw * 2 + 1, headTop, 1, headH + 2, hc);
    }
    px(ctx, hx, headTop - 1, shade(hc, 0.2));
  }
}

/** Sheep: 16x16 frames, two per direction, facing left or right. */
export function sheepSheet(): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(32, 32);
  for (let row = 0; row < 2; row++) {
    for (let f = 0; f < 2; f++) {
      const ox = f * 16;
      const oy = row * 16;
      const facingRight = row === 1;
      blob(ctx, ox + 8, oy + 14, 5, 1, "rgba(20,15,10,0.25)");
      blob(ctx, ox + 8, oy + 9, 5, 3, "#d9d2c0");
      blob(ctx, ox + 8, oy + 8, 4, 3, "#f1ece0");
      for (let i = 0; i < 5; i++) px(ctx, ox + 5 + i * 2, oy + 6 + (i % 2), "#ffffff");
      const hx = facingRight ? ox + 13 : ox + 2;
      rect(ctx, hx, oy + 7 + (f === 1 ? 1 : 0), 2, 3, "#3b332c");
      px(ctx, facingRight ? hx + 1 : hx, oy + 8, "#1a1410");
      const legs = f === 0 ? [5, 10] : [6, 9];
      for (const lx of legs) rect(ctx, ox + lx, oy + 12, 1, 2, "#3b332c");
    }
  }
  return canvas;
}
