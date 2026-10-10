// Game time. One game day passes in DAY_REAL_SECONDS of real time. Times are minutes after midnight (0-1440).

export const DAY_MINUTES = 1440;
export const DAY_REAL_SECONDS = 12 * 60;
const MINUTES_PER_SECOND = DAY_MINUTES / DAY_REAL_SECONDS;

export class WorldClock {
  minutes: number;
  /** Multiplier for testing or for a "rest until morning" effect. */
  speed = 1;

  constructor(startMinutes = 7 * 60) {
    this.minutes = ((startMinutes % DAY_MINUTES) + DAY_MINUTES) % DAY_MINUTES;
  }

  tick(realSeconds: number) {
    this.minutes = (this.minutes + realSeconds * MINUTES_PER_SECOND * this.speed) % DAY_MINUTES;
  }

  get hour(): number {
    return this.minutes / 60;
  }
}

export type DayPhase = "night" | "dawn" | "day" | "evening";

export function dayPhase(minutes: number): DayPhase {
  const h = minutes / 60;
  if (h < 5 || h >= 20.5) return "night";
  if (h < 7) return "dawn";
  if (h < 17.5) return "day";
  return "evening";
}

/**
 * How first-century Jews and Romans told time: daylight hours counted from sunrise (about 6am, so the "sixth hour"
 * is noon) and the night in four Roman watches (Matthew 14:25; Mark 13:35).
 */
export function timeOfDayLabel(minutes: number): string {
  const h = minutes / 60;
  if (h >= 6 && h < 18) {
    // Hours after sunrise: 9am is the third hour (Mark 15:25), noon the sixth, 3pm the ninth (Matthew 27:45).
    const hour = Math.max(1, Math.round(h - 6));
    const part = h < 9 ? "Morning" : h < 12 ? "Late morning" : h < 15 ? "Afternoon" : "Late afternoon";
    return `${part} · the ${ordinal(hour)} hour`;
  }
  const watch = h >= 18 && h < 21 ? 1 : h >= 21 ? 2 : h < 3 ? 3 : 4;
  const part = h >= 18 && h < 20.5 ? "Evening" : h >= 5 && h < 6 ? "Dawn" : "Night";
  return `${part} · the ${ordinal(watch)} watch`;
}

function ordinal(n: number): string {
  const words = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth", "eleventh", "twelfth"];
  return words[n - 1] ?? `${n}th`;
}

interface LightKey {
  hour: number;
  color: [number, number, number];
  alpha: number;
}

// Colour and strength of the tint laid over the world through the day.
const LIGHT_KEYS: LightKey[] = [
  { hour: 0, color: [10, 18, 52], alpha: 0.62 },
  { hour: 4.5, color: [10, 18, 52], alpha: 0.6 },
  { hour: 5.6, color: [70, 50, 110], alpha: 0.38 },
  { hour: 6.4, color: [255, 150, 90], alpha: 0.2 },
  { hour: 7.5, color: [255, 220, 170], alpha: 0 },
  { hour: 16.5, color: [255, 200, 120], alpha: 0 },
  { hour: 18, color: [255, 140, 60], alpha: 0.2 },
  { hour: 19.3, color: [120, 60, 120], alpha: 0.38 },
  { hour: 20.6, color: [20, 24, 70], alpha: 0.56 },
  { hour: 24, color: [10, 18, 52], alpha: 0.62 },
];

/** The tint over the world at a given time: RGB colour and opacity. */
export function ambientLight(minutes: number): { color: number; alpha: number } {
  const h = (minutes / 60) % 24;
  let i = 0;
  while (i < LIGHT_KEYS.length - 2 && LIGHT_KEYS[i + 1].hour <= h) i++;
  const a = LIGHT_KEYS[i];
  const b = LIGHT_KEYS[i + 1];
  const t = Math.min(1, Math.max(0, (h - a.hour) / (b.hour - a.hour)));
  const mix = (k: 0 | 1 | 2) => Math.round(a.color[k] + (b.color[k] - a.color[k]) * t);
  return { color: (mix(0) << 16) | (mix(1) << 8) | mix(2), alpha: a.alpha + (b.alpha - a.alpha) * t };
}

/** How brightly lamps and fires glow, 0 (daylight) to 1 (full night). */
export function lampLevel(minutes: number): number {
  const h = (minutes / 60) % 24;
  if (h >= 20.5 || h < 5) return 1;
  if (h >= 18.5) return (h - 18.5) / 2;
  if (h < 6.5) return 1 - (h - 5) / 1.5;
  return 0;
}
