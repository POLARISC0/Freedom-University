import { DAY_MINUTES } from "./clock";
import { hash2 } from "./noise";
import type { Weather, WeatherKind } from "./types";

// Galilee's weather, worked out from the game day and time alone: no randomness at run time, so a day's sky is the
// same on every visit and every reload. Mostly clear; some grey days with "a cloud rising from the west" (Luke
// 12:54); mist over the lake on some mornings; the odd passing shower; and now and then a day when the wind gets up
// on the lake in the afternoon (Matthew 14:24). Levels are set every three hours and eased in between, so the sky
// changes gradually and never jumps.

const SEED = 4013;
const SLOT_HOURS = 3;
const SLOTS_PER_DAY = 24 / SLOT_HOURS;

type DayKind = "clear" | "cloudy" | "windy" | "showers";

/** The character of a game day. The first day of the walk is always fair. */
export function dayKind(day: number): DayKind {
  if (day <= 0) return "clear";
  const r = hash2(day, 1, SEED);
  return r < 0.55 ? "clear" : r < 0.75 ? "cloudy" : r < 0.88 ? "windy" : "showers";
}

/** The three-hour slot of the day when a showery day's rain is heaviest (6:00 to 18:00). */
function showerSlot(day: number): number {
  return 2 + Math.floor(hash2(day, 2, SEED) * 5);
}

/** How thick the morning mist is on a given day: 0 for none. Mist comes on still days, never on the first. */
function mistStrength(day: number): number {
  const kind = dayKind(day);
  if (day <= 0 || kind === "windy" || kind === "showers" || hash2(day, 3, SEED) > 0.35) return 0;
  return 0.55 + hash2(day, 4, SEED) * 0.35;
}

type Channel = "cloud" | "rain" | "wind";
const CHANNEL_SEED: Record<Channel, number> = { cloud: 11, rain: 12, wind: 13 };

/** A channel's level at the start of three-hour slot `k` (counted from the start of the walk). */
function keyframe(k: number, channel: Channel): number {
  const day = Math.floor(k / SLOTS_PER_DAY);
  const slot = k - day * SLOTS_PER_DAY;
  const kind = dayKind(day);
  const r = hash2(k, CHANNEL_SEED[channel], SEED);
  const showering = kind === "showers" && slot === showerSlot(day);
  switch (channel) {
    case "cloud":
      if (kind === "clear") return 0.04 + r * 0.24;
      if (kind === "cloudy") return 0.58 + r * 0.32;
      if (kind === "windy") return 0.2 + r * 0.3;
      return showering ? 0.9 + r * 0.1 : 0.45 + r * 0.3;
    case "rain":
      return showering ? 0.45 + r * 0.5 : 0;
    case "wind":
      // Windy days blow hardest through the afternoon (slots 4-5: noon to 6pm).
      if (kind === "windy") return slot >= 4 && slot <= 5 ? 0.72 + r * 0.24 : slot === 3 || slot === 6 ? 0.42 + r * 0.2 : 0.18 + r * 0.2;
      if (kind === "showers") return 0.28 + r * 0.25;
      return 0.06 + r * 0.26;
  }
}

const smooth = (t: number) => t * t * (3 - 2 * t);

/** A channel eased between the keyframes either side of `hours` (hours since the walk began). */
function level(hours: number, channel: Channel): number {
  const k = Math.floor(hours / SLOT_HOURS);
  const t = smooth(hours / SLOT_HOURS - k);
  const a = keyframe(k, channel);
  return a + (keyframe(k + 1, channel) - a) * t;
}

/** Morning mist: rises from 4:00, thickest around 6:30, gone by 10:00. */
function mistAt(day: number, hour: number): number {
  const strength = mistStrength(day);
  if (strength === 0 || hour <= 4 || hour >= 10) return 0;
  return strength * (hour < 6.5 ? smooth((hour - 4) / 2.5) : smooth((10 - hour) / 3.5));
}

// A level must reach these to name the weather; rain first, then mist, wind and cloud.
const RAIN_AT = 0.25;
const MIST_AT = 0.35;
const WIND_AT = 0.6;
const CLOUD_AT = 0.55;

function kindOf(w: Pick<Weather, "cloud" | "rain" | "fog" | "wind">): WeatherKind {
  if (w.rain >= RAIN_AT) return "rain";
  if (w.fog >= MIST_AT) return "mist";
  if (w.wind >= WIND_AT) return "windy";
  if (w.cloud >= CLOUD_AT) return "cloudy";
  return "clear";
}

function labelFor(kind: WeatherKind, rain: number, minutes: number): string {
  const h = minutes / 60;
  const night = h < 5 || h >= 20.5;
  switch (kind) {
    case "rain":
      return rain > 0.65 ? "Rain sweeping in off the lake" : "A passing shower from the west";
    case "mist":
      return "Morning mist over the lake";
    case "windy":
      return night ? "The wind is up on the lake tonight" : "A contrary wind on the lake";
    case "cloudy":
      return night ? "A cloudy night" : "Clouds rising from the west";
    case "clear":
      if (night) return "A clear night full of stars";
      if (h >= 17.5) return "A red sky at evening: fair weather";
      return h < 9 ? "A clear morning on the lake" : "Clear skies over the lake";
  }
}

const round = (n: number) => Math.round(Math.min(1, Math.max(0, n)) * 1000) / 1000;

/** The weather on game day `day` at `minutes` after midnight. */
export function weatherAt(day: number, minutes: number): Weather {
  const d = Math.max(0, Math.floor(day));
  const m = Math.min(DAY_MINUTES, Math.max(0, minutes));
  const hours = d * 24 + m / 60;
  const rain = level(hours, "rain");
  const mist = mistAt(d, m / 60);
  const w = {
    // Rain always comes with cloud, and drapes a little haze over the lake.
    cloud: round(Math.max(level(hours, "cloud"), rain * 1.6)),
    rain: round(rain),
    fog: round(Math.max(mist, rain * 0.45)),
    wind: round(level(hours, "wind")),
  };
  const kind = kindOf(w);
  return { kind, ...w, label: labelFor(kind, w.rain, m) };
}
