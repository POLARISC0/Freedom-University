"use client";

import { useEffect, useRef } from "react";
import { NEED_INFO, NEEDS, type ActivityDef } from "@/walk/life";
import type { World } from "@/walk/world/world";

/** The need an activity feeds most, for its icon. */
export function activityIcon(def: ActivityDef): string {
  const need = NEEDS.reduce((best, n) => ((def.needs[n] ?? 0) > (def.needs[best] ?? 0) ? n : best), NEEDS[0]);
  return NEED_INFO[need].icon;
}

/**
 * The running activity: what the player is doing, how far along it is, and a way to stop. Progress is read from the
 * world every frame and drawn straight onto the bar, so the rest of the game doesn't re-render for it.
 */
export function ActivityBar({ world, def, onCancel }: { world: World; def: ActivityDef; onCancel: () => void }) {
  const fill = useRef<HTMLDivElement>(null);
  const meter = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame = 0;
    let shown = -1;
    const draw = () => {
      const run = world.player.activity;
      const done = run && run.duration > 0 ? Math.min(1, run.elapsed / run.duration) : 1;
      if (fill.current) fill.current.style.width = `${done * 100}%`;
      // Screen readers hear it in tenths, not every frame.
      const tenth = Math.round(done * 10) * 10;
      if (tenth !== shown && meter.current) {
        shown = tenth;
        meter.current.setAttribute("aria-valuenow", String(tenth));
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [world]);

  return (
    <div className="pointer-events-auto flex w-[min(21rem,calc(100vw-1.5rem))] items-center gap-3 rounded-2xl border-2 border-amber-200 bg-[#275f6c] px-4 py-2.5 text-white shadow-lg">
      <span aria-hidden className="text-xl">
        {activityIcon(def)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{def.doing}…</p>
        <div
          ref={meter}
          role="progressbar"
          aria-label={def.doing}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={0}
          className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/25"
        >
          <div ref={fill} className="h-full w-0 rounded-full bg-amber-200" />
        </div>
      </div>
      <button type="button" onClick={onCancel} className="shrink-0 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold hover:bg-white/25">
        Cancel
      </button>
    </div>
  );
}
