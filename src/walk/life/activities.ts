import { DAY_MINUTES } from "@/walk/world/clock";
import type { Weather, WeatherKind } from "@/walk/world/types";
import type { ActivityDef } from "./types";

// Things the player can do in the world that feed a spiritual need. Each one happens at an activity spot on the
// map (see WorldMap.activitySpots); the world runs it, and the life state records what it did.

export const ACTIVITIES: ActivityDef[] = [
  {
    id: "pray",
    action: "Pray here",
    doing: "Praying in the quiet place",
    done: "You spent time alone with your Father in the quiet place.",
    pose: "kneel",
    seconds: 6,
    minutes: 30,
    needs: { prayer: 25 },
    friendship: 2,
    passage: {
      ref: "Mark 1:35",
      text: "Early in the morning, while it was still dark, he rose up and went out, and departed into a deserted place, and prayed there.",
    },
  },
  {
    id: "read",
    action: "Read the scroll",
    doing: "Reading the scroll",
    done: "You sat with the scroll at the synagogue and read.",
    pose: "sit",
    seconds: 6,
    minutes: 30,
    hours: [[6, 19]],
    closedNote: "The synagogue is closed for the night. It opens again at sunrise.",
    needs: { word: 25 },
    friendship: 1,
    passage: { ref: "Psalm 119:105", text: "Your word is a lamp to my feet, and a light for my path." },
  },
  {
    id: "listen",
    action: "Sit and listen",
    doing: "Listening to Jesus",
    done: "You sat with the crowd by the sea and listened to Jesus teach.",
    pose: "sit",
    seconds: 8,
    minutes: 60,
    hours: [[8.5, 17.5]],
    closedNote: "Jesus teaches by the shore during the day.",
    withCharacter: "jesus",
    needs: { word: 20, fellowship: 5 },
    friendship: 2,
    passage: { ref: "Mark 4:1", text: "Again he began to teach by the seaside. A great multitude was gathered to him" },
  },
  {
    id: "meal",
    action: "Join the meal",
    doing: "Sharing the meal",
    done: "You shared bread and fish around Peter's table.",
    pose: "sit",
    seconds: 8,
    minutes: 45,
    hours: [[17.5, 21.5]],
    closedNote: "The evening meal is shared around sunset, when the day's work is done.",
    needs: { fellowship: 30, rest: 5 },
    friendship: 4,
    passage: {
      ref: "Acts 2:46",
      text: "breaking bread at home, they took their food with gladness and singleness of heart",
    },
  },
  {
    id: "nets",
    action: "Help with the nets",
    doing: "Washing and mending the nets",
    done: "You helped the fishermen wash and mend their nets.",
    pose: "work",
    seconds: 8,
    minutes: 60,
    hours: [[5, 11]],
    closedNote: "The fishermen see to their nets from dawn until late morning.",
    notIn: ["windy"],
    needs: { service: 20, rest: -8 },
    friendship: 3,
    passage: { ref: "Galatians 6:2", text: "Bear one another's burdens, and so fulfill the law of Christ." },
  },
  {
    id: "water",
    action: "Carry water",
    doing: "Carrying water",
    done: "You drew water at the well and carried it to your neighbours' doors.",
    pose: "work",
    seconds: 6,
    minutes: 30,
    hours: [[5.5, 20]],
    closedNote: "The well is quiet at night. Come back in the morning.",
    needs: { service: 15, rest: -4 },
    friendship: 1,
    passage: {
      ref: "Mark 10:45",
      text: "For the Son of Man also came not to be served, but to serve, and to give his life as a ransom for many.",
    },
  },
  {
    id: "shade",
    action: "Rest in the shade",
    doing: "Resting in the shade",
    done: "You sat in the shade of the fig tree and rested.",
    pose: "sit",
    seconds: 6,
    minutes: 45,
    hours: [[7, 18]],
    closedNote: "The fig tree's shade is for the heat of the day. At night, rest at your house.",
    notIn: ["rain"],
    needs: { rest: 20 },
    friendship: 1,
    passage: { ref: "Mark 6:31", text: "You come apart into a deserted place, and rest awhile." },
  },
  {
    id: "sleep",
    action: "Sleep until morning",
    doing: "Sleeping until morning",
    done: "You slept in peace and woke with the sunrise.",
    pose: "sleep",
    seconds: 8,
    minutes: 0,
    untilHour: 6,
    hours: [[20, 5]],
    closedNote: "It's early yet. Your bed will be here tonight.",
    needs: { rest: 60 },
    passage: {
      ref: "Psalm 4:8",
      text: "In peace I will both lay myself down and sleep, for you, Yahweh alone, make me live in safety.",
    },
  },
];

const BY_ID = new Map(ACTIVITIES.map((a) => [a.id, a]));

export function getActivity(id: string): ActivityDef | undefined {
  return BY_ID.get(id);
}

/** Whether `hour` (0-24, fractional) falls in any of the [from, to) ranges; a range with from > to wraps midnight. */
export function inHours(hours: [number, number][] | undefined, hour: number): boolean {
  if (!hours) return true;
  return hours.some(([from, to]) => (from <= to ? hour >= from && hour < to : hour >= from || hour < to));
}

/**
 * Whether the time and weather allow an activity, at `minutes` after midnight. The world also checks that the
 * player is at the spot and that `withCharacter` is there.
 */
export function isAvailable(def: ActivityDef, minutes: number, weather: Pick<Weather, "kind">): boolean {
  return unavailableReason(def, minutes, weather) === null;
}

const WEATHER_NOTES: Record<WeatherKind, string> = {
  clear: "Not in this weather.",
  cloudy: "Not in this weather.",
  mist: "Wait for the mist to lift.",
  rain: "Not in this rain. Wait for the shower to pass.",
  windy: "The wind is too strong on the lake for that today.",
};

/** Why an activity can't be done now, in a sentence for the player, or null when it can. */
export function unavailableReason(def: ActivityDef, minutes: number, weather: Pick<Weather, "kind">): string | null {
  if (!inHours(def.hours, (minutes / 60) % 24)) return def.closedNote ?? "Not at this hour. Come back later.";
  if (def.notIn?.includes(weather.kind)) return WEATHER_NOTES[weather.kind];
  return null;
}

/**
 * When an activity started at `startTotal` ends, both as game minutes since the walk began (WorldClock.total).
 * Sleep runs on to the next `untilHour`, exactly.
 */
export function activityEnd(def: ActivityDef, startTotal: number): number {
  if (def.untilHour === undefined) return startTotal + def.minutes;
  const until = Math.floor(startTotal / DAY_MINUTES) * DAY_MINUTES + def.untilHour * 60;
  return until > startTotal ? until : until + DAY_MINUTES;
}

/** Game minutes an activity takes when started at `minutes` after midnight. */
export function activityMinutes(def: ActivityDef, minutes: number): number {
  return activityEnd(def, minutes) - minutes;
}
