// The colours of the day: sky, sunlight, ambient light and water through a Galilean day, and how the weather
// changes them. Pure functions returning plain RGB triples (0..1), so they can be tested without a GPU.

import type { Weather } from "@/walk/world/types";

export type RGB = [number, number, number];

export interface SkyColors {
  /** Overhead sky and the colour at the horizon (also the fog). */
  zenith: RGB;
  horizon: RGB;
  /** The sun by day, the moon by night. */
  sun: RGB;
  sunIntensity: number;
  /** Hemisphere light: sky above, warm ground bounce below. */
  ambientSky: RGB;
  ambientGround: RGB;
  ambientIntensity: number;
  /** Lake colours over deep water and over the shallows. */
  waterDeep: RGB;
  waterShallow: RGB;
  /** How visible the stars are, 0..1. */
  stars: number;
}

const rgb = (hex: number): RGB => [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255];

interface Key {
  hour: number;
  zenith: number;
  horizon: number;
  sun: number;
  sunIntensity: number;
  ambientSky: number;
  ambientGround: number;
  ambientIntensity: number;
  waterDeep: number;
  waterShallow: number;
  stars: number;
}

// Night stays a soft moonlit blue, never black, so the world is always readable.
const NIGHT: Omit<Key, "hour"> = {
  zenith: 0x0d1838,
  horizon: 0x26355f,
  sun: 0xa8bcff,
  sunIntensity: 0.55,
  ambientSky: 0x6f80c0,
  ambientGround: 0x2a2c40,
  ambientIntensity: 1.05,
  waterDeep: 0x0e2346,
  waterShallow: 0x24506e,
  stars: 1,
};

const KEYS: Key[] = [
  { hour: 0, ...NIGHT },
  { hour: 4.6, ...NIGHT },
  {
    hour: 5.5,
    zenith: 0x2b3268,
    horizon: 0x9a74a4,
    sun: 0xffb4a8,
    sunIntensity: 0.45,
    ambientSky: 0x8c86c0,
    ambientGround: 0x3e3448,
    ambientIntensity: 1,
    waterDeep: 0x2a3d6c,
    waterShallow: 0x52708e,
    stars: 0.45,
  },
  {
    hour: 6.3,
    zenith: 0x7092c8,
    horizon: 0xf6b89c,
    sun: 0xffb27e,
    sunIntensity: 1.3,
    ambientSky: 0xc4bce0,
    ambientGround: 0x6e5a50,
    ambientIntensity: 1,
    waterDeep: 0x3c6e98,
    waterShallow: 0x74aab8,
    stars: 0,
  },
  {
    hour: 7.6,
    zenith: 0x78b4e6,
    horizon: 0xd2e6ee,
    sun: 0xfff0da,
    sunIntensity: 2.3,
    ambientSky: 0xcfe4ff,
    ambientGround: 0x8a7a5c,
    ambientIntensity: 1,
    waterDeep: 0x2e78a2,
    waterShallow: 0x5cb6c0,
    stars: 0,
  },
  {
    hour: 12,
    zenith: 0x5ea8e8,
    horizon: 0xcfe7f2,
    sun: 0xfffaf0,
    sunIntensity: 2.6,
    ambientSky: 0xd8ecff,
    ambientGround: 0x928262,
    ambientIntensity: 1.05,
    waterDeep: 0x2a78a8,
    waterShallow: 0x54bcc6,
    stars: 0,
  },
  {
    hour: 16.4,
    zenith: 0x68a6dc,
    horizon: 0xf2d8a6,
    sun: 0xffdca4,
    sunIntensity: 2.4,
    ambientSky: 0xe6dcc8,
    ambientGround: 0x8c6c4a,
    ambientIntensity: 1,
    waterDeep: 0x2e6e98,
    waterShallow: 0x68b0b2,
    stars: 0,
  },
  {
    hour: 18,
    zenith: 0x5a6cae,
    horizon: 0xff9c5c,
    sun: 0xff8c4c,
    sunIntensity: 1.6,
    ambientSky: 0xdcac94,
    ambientGround: 0x6c4c40,
    ambientIntensity: 0.98,
    waterDeep: 0x3a4f80,
    waterShallow: 0xa27c72,
    stars: 0,
  },
  {
    hour: 19.3,
    zenith: 0x2c2f6a,
    horizon: 0x9c5c8c,
    sun: 0xc48cb4,
    sunIntensity: 0.55,
    ambientSky: 0x8e7cb4,
    ambientGround: 0x3c2e42,
    ambientIntensity: 1,
    waterDeep: 0x223a68,
    waterShallow: 0x4c507c,
    stars: 0.3,
  },
  { hour: 20.6, ...NIGHT },
  { hour: 24, ...NIGHT },
];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const mixRgb = (a: RGB, b: RGB, t: number): RGB => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const scale = (a: RGB, k: number): RGB => [a[0] * k, a[1] * k, a[2] * k];
const luma = (c: RGB) => c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11;
const grey = (c: RGB, amount: number): RGB => mixRgb(c, [luma(c), luma(c), luma(c)], amount);

/** Clear-weather colours at a time of day (minutes after midnight), blended smoothly between key hours. */
export function skyAt(minutes: number): SkyColors {
  const h = (((minutes / 60) % 24) + 24) % 24;
  let i = 0;
  while (i < KEYS.length - 2 && KEYS[i + 1].hour <= h) i++;
  const a = KEYS[i];
  const b = KEYS[i + 1];
  const raw = Math.min(1, Math.max(0, (h - a.hour) / (b.hour - a.hour)));
  const t = raw * raw * (3 - 2 * raw);
  const c = (k: "zenith" | "horizon" | "sun" | "ambientSky" | "ambientGround" | "waterDeep" | "waterShallow") =>
    mixRgb(rgb(a[k]), rgb(b[k]), t);
  return {
    zenith: c("zenith"),
    horizon: c("horizon"),
    sun: c("sun"),
    sunIntensity: lerp(a.sunIntensity, b.sunIntensity, t),
    ambientSky: c("ambientSky"),
    ambientGround: c("ambientGround"),
    ambientIntensity: lerp(a.ambientIntensity, b.ambientIntensity, t),
    waterDeep: c("waterDeep"),
    waterShallow: c("waterShallow"),
    stars: lerp(a.stars, b.stars, t),
  };
}

/**
 * The same colours under the weather: cloud greys the sky and dims the sun, rain darkens everything a little,
 * and mist washes the horizon (the fog colour) towards a soft pale grey.
 */
export function withWeather(sky: SkyColors, weather: Pick<Weather, "cloud" | "rain" | "fog">): SkyColors {
  const cloud = clamp01(weather.cloud);
  const rain = clamp01(weather.rain);
  const fog = clamp01(weather.fog);
  const overcast = Math.max(cloud, rain);
  const dim = 1 - rain * 0.22 - cloud * 0.08;
  const brightness = Math.max(luma(sky.horizon), 0.08);
  const mist: RGB = scale([0.86, 0.88, 0.9], Math.min(1, brightness * 1.25));
  return {
    zenith: scale(grey(sky.zenith, overcast * 0.75), dim),
    horizon: mixRgb(scale(grey(sky.horizon, overcast * 0.7), dim), mist, fog * 0.75),
    sun: grey(sky.sun, overcast * 0.5),
    sunIntensity: sky.sunIntensity * (1 - cloud * 0.7) * (1 - rain * 0.35) * (1 - fog * 0.35),
    ambientSky: grey(sky.ambientSky, overcast * 0.6),
    ambientGround: sky.ambientGround,
    // Overcast light is soft and comes from everywhere.
    ambientIntensity: sky.ambientIntensity * (1 + cloud * 0.25) * (1 - rain * 0.1),
    waterDeep: scale(grey(sky.waterDeep, overcast * 0.5), dim),
    waterShallow: scale(grey(sky.waterShallow, overcast * 0.5), dim),
    stars: sky.stars * (1 - overcast) * (1 - fog),
  };
}

function clamp01(v: number) {
  return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0;
}

/**
 * Where the sun is: rising in the east (+x) at six, high in the south (+z) at noon, setting in the west at six in
 * the evening. Returns a unit vector and how far above the horizon it is (negative at night).
 */
export function sunDirection(minutes: number): Direction {
  return arc(minutes / 60 - 6, 0.42);
}

/** The moon follows the opposite arc, a little further north, so something always lights the world from above. */
export function moonDirection(minutes: number): Direction {
  return arc(minutes / 60 - 18, 0.25);
}

export interface Direction {
  x: number;
  y: number;
  z: number;
  /** Sine of the angle above the horizon. */
  elevation: number;
}

function arc(hoursSinceRise: number, south: number): Direction {
  const angle = (hoursSinceRise / 12) * Math.PI;
  const x = Math.cos(angle);
  const y = Math.sin(angle) * 0.92;
  const len = Math.hypot(x, y, south);
  return { x: x / len, y: y / len, z: south / len, elevation: y / len };
}
