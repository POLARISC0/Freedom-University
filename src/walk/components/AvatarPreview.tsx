"use client";

import type { Appearance } from "@/walk/content";
import { Portrait } from "./Portrait";

/** A preview of the player's avatar for the character creator. */
export function AvatarPreview({ appearance, size = 160, className = "" }: { appearance: Appearance; size?: number; className?: string }) {
  return <Portrait appearance={appearance} size={size} className={className} />;
}
