"use client";

import { useEffect, useRef, useState } from "react";
import type { Appearance } from "@/walk/content";
import type { GameHandle } from "@/walk/game3d/createGame";
import type { World } from "@/walk/world/world";

/** Mounts the 3D renderer for a world. Three.js loads only in the browser, on demand. */
export function GameCanvas({
  world,
  appearance,
  insets = { right: 0, bottom: 0 },
  showControls = true,
}: {
  world: World;
  appearance: Appearance;
  /** Screen space covered by panels, so the camera can keep the player in view. */
  insets?: { right: number; bottom: number };
  /** On-screen camera buttons; hidden while a panel covers the view. */
  showControls?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const handle = useRef<GameHandle | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const initialAppearance = useRef(appearance);

  useEffect(() => {
    let cancelled = false;
    const parent = ref.current;
    if (!parent) return;
    import("@/walk/game3d/createGame")
      .then(({ createGame }) => {
        if (cancelled) return;
        handle.current = createGame(parent, world, initialAppearance.current, () => setReady(true));
      })
      .catch((error) => {
        console.error("Could not start the game", error);
        setFailed(true);
      });
    return () => {
      cancelled = true;
      handle.current?.destroy();
      handle.current = null;
    };
  }, [world]);

  useEffect(() => {
    handle.current?.setPlayerAppearance(appearance);
  }, [appearance, ready]);

  useEffect(() => {
    handle.current?.setViewInsets(insets.right, insets.bottom);
  }, [insets.right, insets.bottom, ready]);

  return (
    <div className="walk-game absolute inset-0 overflow-hidden bg-[#22607f]">
      <div ref={ref} className="absolute inset-0" />
      {!ready && !failed && (
        <div className="absolute inset-0 grid place-items-center text-sm text-white/80">Walking into Galilee…</div>
      )}
      {failed && (
        <div className="absolute inset-0 grid place-items-center p-6 text-center text-white">
          This browser couldn&apos;t start the game world. You can still take every lesson from the Growth paths page.
        </div>
      )}
      {ready && showControls && (
        <div className="walk-camera-controls" role="group" aria-label="Camera">
          <button type="button" aria-label="Turn the view left" title="Turn left  [" onClick={() => handle.current?.rotateCamera(-1)}>
            ⟲
          </button>
          <button type="button" aria-label="Turn the view right" title="Turn right  ]" onClick={() => handle.current?.rotateCamera(1)}>
            ⟳
          </button>
          <button type="button" aria-label="Zoom out" title="Zoom out  −" onClick={() => handle.current?.zoomCamera(-1)}>
            −
          </button>
          <button type="button" aria-label="Zoom in" title="Zoom in  +" onClick={() => handle.current?.zoomCamera(1)}>
            +
          </button>
        </div>
      )}
    </div>
  );
}
