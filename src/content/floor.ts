import type { ZoneId } from "./types";

/** Floor zones in percent of the floor's width and height (top-left origin). */
export interface Zone {
  id: ZoneId;
  label: string;
  activity: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export const ZONES: Zone[] = [
  { id: "crypto-desk", label: "Crypto Desk", activity: "watching the chain", x: 4, y: 6, w: 26, h: 30 },
  { id: "news-wall", label: "News Wall", activity: "reading today's headlines", x: 37, y: 4, w: 26, h: 18 },
  { id: "bank-vault", label: "Bank Vault", activity: "studying the system", x: 70, y: 6, w: 26, h: 30 },
  { id: "whiteboard", label: "Whiteboard", activity: "sketching a lesson", x: 37, y: 38, w: 26, h: 22 },
  { id: "credit-desk", label: "Credit Desk", activity: "reviewing credit files", x: 4, y: 62, w: 26, h: 32 },
  { id: "coffee-bar", label: "Coffee Bar", activity: "taking a coffee break", x: 37, y: 72, w: 26, h: 22 },
  { id: "mindset-lounge", label: "Mindset Lounge", activity: "reflecting on the long game", x: 70, y: 62, w: 26, h: 32 },
];

export function getZone(id: ZoneId): Zone {
  const zone = ZONES.find((z) => z.id === id);
  if (!zone) throw new Error(`Unknown zone ${id}`);
  return zone;
}

/** Each schedule slot lasts this long; everyone viewing the floor sees the same positions. */
export const SLOT_MS = 40_000;

export function slotIndex(now: number): number {
  return Math.floor(now / SLOT_MS);
}

/** Where a specialist is during a slot, with a small per-specialist offset so they don't overlap. */
export function positionFor(schedule: ZoneId[], order: number, slot: number) {
  // Offset each specialist's place in the loop so they don't all move in lockstep.
  const zoneId = schedule[(slot + order * 2) % schedule.length];
  const zone = getZone(zoneId);
  // Each specialist gets their own column, alternating rows, so a shared zone never stacks them.
  const offsets = [
    [-0.3, -0.12],
    [-0.1, 0.2],
    [0.1, -0.12],
    [0.3, 0.2],
  ];
  const [dx, dy] = offsets[order % offsets.length];
  return {
    zoneId,
    x: zone.x + zone.w * (0.5 + dx),
    y: zone.y + zone.h * (0.5 + dy),
  };
}
