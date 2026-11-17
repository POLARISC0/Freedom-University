"use client";

import { useEffect, useRef } from "react";
import type { Appearance } from "@/walk/content";
import { characterSheet, FRAME_H, FRAME_W } from "@/walk/game/art/characters";

/** A character's face-forward sprite, scaled up crisply, for dialogue and lists. */
export function Portrait({ appearance, size = 48, className = "" }: { appearance: Appearance; size?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Head and shoulders of the front-facing standing frame.
    ctx.drawImage(characterSheet(appearance), 0, 0, FRAME_W, FRAME_H - 8, 0, 0, FRAME_W, FRAME_H - 8);
  }, [appearance]);
  return (
    <span
      className={`inline-grid place-items-center overflow-hidden rounded-full border border-line bg-surface-2 ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <canvas
        ref={ref}
        width={FRAME_W}
        height={FRAME_H - 8}
        style={{ width: size * 0.82, height: (size * 0.82 * (FRAME_H - 8)) / FRAME_W, imageRendering: "pixelated", marginTop: size * 0.18 }}
      />
    </span>
  );
}
