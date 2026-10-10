"use client";

import { useEffect, useRef, useState } from "react";
import type { Appearance } from "@/walk/content";
import type { AvatarView } from "@/walk/game3d/avatarView";
import { Portrait } from "./Portrait";

/**
 * The player's avatar in 3D, as it will look in the world, standing on a grass block and turning slowly (drag to
 * spin it). Three.js loads on demand; without WebGL it falls back to the flat portrait.
 */
export function AvatarPreview({ appearance, size = 160, className = "" }: { appearance: Appearance; size?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const view = useRef<AvatarView | null>(null);
  const latest = useRef(appearance);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    latest.current = appearance;
    view.current?.setAppearance(appearance);
  }, [appearance]);

  useEffect(() => {
    let cancelled = false;
    import("@/walk/game3d/avatarView")
      .then(({ createAvatarView }) => {
        if (cancelled || !ref.current) return;
        view.current = createAvatarView(ref.current, latest.current);
      })
      .catch((error) => {
        console.error("Could not show the 3D avatar", error);
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      view.current?.destroy();
      view.current = null;
    };
  }, []);

  if (failed) return <Portrait appearance={appearance} size={size} className={className} />;
  return <div ref={ref} className={`relative inline-block ${className}`} style={{ width: size, height: size }} aria-hidden />;
}
