import type { ScheduleEntry, Spot } from "@/walk/world/types";

// A character's usual day, in one line for their panel, worked out from the same routine the world runs.

/** A game hour as a plain clock time: "4am", "6:30am", "noon", "5:30pm". */
export function clockTime(hour: number): string {
  const total = Math.round((((hour % 24) + 24) % 24) * 60);
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  if (m === 0 && h === 12) return "noon";
  if (m === 0 && h === 0) return "midnight";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}${m ? `:${String(m).padStart(2, "0")}` : ""}${h < 12 ? "am" : "pm"}`;
}

/** A place's label for use mid-sentence: "The boats" -> "the boats", but "Peter's table" stays as it is. */
function midSentence(label: string): string {
  const first = label.split(" ")[0];
  return /['’]s$/.test(first) ? label : label.charAt(0).toLowerCase() + label.slice(1);
}

/**
 * Where a character spends each part of their day, e.g. "4am a quiet place on the hillside · 6:30am the boats ·
 * 8:30am the shore where Jesus teaches · …". Null for someone without a routine.
 */
export function routineLine(schedule: ScheduleEntry[] | undefined, spots: Record<string, Spot>): string | null {
  if (!schedule?.length) return null;
  const parts: string[] = [];
  let last = "";
  for (const entry of schedule) {
    const place = entry.spot ? midSentence(spots[entry.spot]?.label ?? "out and about") : "home for the night";
    if (place === last) continue;
    last = place;
    parts.push(`${clockTime(entry.from)} ${place}`);
  }
  return parts.join(" · ");
}
