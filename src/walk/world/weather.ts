import type { Weather } from "./types";

// PLACEHOLDER: returns clear weather. The life/world work replaces this with a deterministic forecast per game day.

export function weatherAt(_day: number, _minutes: number): Weather {
  return { kind: "clear", cloud: 0, rain: 0, fog: 0, wind: 0.2, label: "Clear skies" };
}
