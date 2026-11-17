export { CHARACTERS, TOWNSFOLK, getCharacter, speakerName } from "./characters";
export { DAILY_VERSES } from "./daily-verses";
export { LESSONS, getLesson } from "./lessons";
export { LOCATIONS } from "./locations";
export { PATHS, getPath } from "./paths";
export { HAIR_STYLES } from "./types";
export type * from "./types";

import { DAILY_VERSES } from "./daily-verses";
import type { Passage } from "./types";

/** The verse for a calendar day (YYYY-MM-DD). Everyone sees the same verse on the same date. */
export function verseForDay(day: string): Passage {
  const [y, m, d] = day.split("-").map(Number);
  const dayNumber = Math.floor(Date.UTC(y, (m || 1) - 1, d || 1) / 86_400_000);
  const index = ((dayNumber % DAILY_VERSES.length) + DAILY_VERSES.length) % DAILY_VERSES.length;
  return DAILY_VERSES[index];
}
