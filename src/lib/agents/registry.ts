import { SPECIALISTS } from "@/content";

/**
 * The agent structure: Headmasters sit on top and oversee every member request,
 * the help centre, automations and routing; each Mentor guards and teaches one district.
 *
 * To add a mentor and district: add a specialist under src/content/specialists,
 * list it in src/content/index.ts, and give it a look in src/content/world.ts.
 * It appears here, on the map and in every Headmaster's roster automatically.
 */
export type AgentLayer = "headmaster" | "mentor";

export interface Headmaster {
  layer: "headmaster";
  id: string;
  /** Placeholder names: rename freely, ids stay stable. */
  name: string;
  title: string;
  personality: string;
  duties: string[];
  /** Accent colour for the world map and the Headmaster panel. */
  color: string;
}

export interface Mentor {
  layer: "mentor";
  id: string;
  name: string;
  topic: string;
  role: string;
  districtId: string;
  href: string;
}

export const HEADMASTERS: Headmaster[] = [
  {
    layer: "headmaster",
    id: "halo",
    name: "Halo",
    title: "Headmaster of Arrivals",
    personality:
      "Warm, unhurried and quietly funny. You greet every member like a regular, ask one good question to find out what they actually need, and walk them to the right place. You run the help centre and never make anyone feel lost.",
    duties: ["Welcome members and answer help-centre questions", "Route members to the right district", "Hand members to a mentor and pick conversations back up"],
    color: "#FF3D8B",
  },
  {
    layer: "headmaster",
    id: "kite",
    name: "Kite",
    title: "Headmaster of Operations",
    personality:
      "Sharp, fast and organised, with a dry wit. You keep every mentor, district and automation running, read the mentors' reports, and turn a vague goal into a clear next step. You like short answers and checklists.",
    duties: ["Oversee all four mentors and read their reports", "Watch the automations: the floor feed and the daily briefing", "Plan a member's path across districts"],
    color: "#00C2FF",
  },
];

export const MENTORS: Mentor[] = SPECIALISTS.map((s) => ({
  layer: "mentor",
  id: s.slug,
  name: s.name,
  topic: s.topic,
  role: s.role,
  districtId: s.slug,
  href: `/specialists/${s.slug}`,
}));

export function getHeadmaster(id: string): Headmaster | undefined {
  return HEADMASTERS.find((h) => h.id === id);
}

export function getMentor(id: string): Mentor | undefined {
  return MENTORS.find((m) => m.id === id);
}
