import { SPECIALISTS } from "./index";

/** A place on the home-page world map. Positions are percentages of the map panel. */
export interface District {
  id: string;
  name: string;
  kicker: string;
  href: string;
  /** Island colour. Never blue. */
  color: string;
  /** Text colour that reads on the island. */
  ink: string;
  glyph: string;
  blurb: string;
  meta: string;
  status: "open" | "live" | "soon";
  size: "lg" | "md";
  desktop: { x: number; y: number };
  phone: { x: number; y: number };
  /** Decorative district code shown in mono captions. */
  code: string;
  tagline?: string;
  /** Position in the 3D world (units; downtown at the origin). */
  space: { x: number; y: number; z: number };
  /** The look the whole scene shifts into when you fly in. */
  theme: { look: Look; skyTop: string; skyBottom: string };
}

export type Look = "shards" | "hexcity" | "transit" | "sky" | "stack" | "arena" | "wing";

type MentorLook = Pick<District, "color" | "ink" | "glyph" | "desktop" | "phone" | "code" | "space" | "theme">;

const look: Record<string, MentorLook> = {
  nova: {
    color: "#FFC400", ink: "#0B0B0C", glyph: "₿", desktop: { x: 20, y: 30 }, phone: { x: 24, y: 30 }, code: "D-01/NVA",
    space: { x: -9, y: 1.6, z: -3 }, theme: { look: "shards", skyTop: "#3E9BFF", skyBottom: "#E4F3FF" },
  },
  atlas: {
    color: "#FF5A1F", ink: "#0B0B0C", glyph: "$", desktop: { x: 80, y: 28 }, phone: { x: 76, y: 30 }, code: "D-02/ATL",
    space: { x: 9.5, y: 2.2, z: -5 }, theme: { look: "hexcity", skyTop: "#C9CDD4", skyBottom: "#F5F6F8" },
  },
  sterling: {
    color: "#3DFF8F", ink: "#0B0B0C", glyph: "%", desktop: { x: 19, y: 74 }, phone: { x: 24, y: 71 }, code: "D-03/STR",
    space: { x: -7.5, y: -1.2, z: 5.5 }, theme: { look: "transit", skyTop: "#CFF7E4", skyBottom: "#FFFFFF" },
  },
  sage: {
    color: "#B46CFF", ink: "#0B0B0C", glyph: "∞", desktop: { x: 81, y: 74 }, phone: { x: 76, y: 71 }, code: "D-04/SGE",
    space: { x: 8.5, y: -0.6, z: 4.5 }, theme: { look: "sky", skyTop: "#7CC4FF", skyBottom: "#FFF3D6" },
  },
};

export const DISTRICTS: District[] = [
  {
    id: "floor",
    name: "Trading Floor",
    kicker: "Downtown",
    href: "/floor",
    color: "#FFFFFF",
    ink: "#0B0B0C",
    glyph: "↯",
    blurb: "Where every mentor comes to work. Watch them react to today's news, live.",
    meta: "Live feed · 4 mentors",
    status: "live",
    size: "lg",
    desktop: { x: 50, y: 52 },
    phone: { x: 50, y: 50 },
    code: "D-00/LIVE",
    space: { x: 0, y: 0, z: 0 },
    theme: { look: "stack", skyTop: "#DCE2FF", skyBottom: "#FFFFFF" },
  },
  ...SPECIALISTS.map((s): District => ({
    id: s.slug,
    name: s.name,
    kicker: s.topic,
    href: `/specialists/${s.slug}`,
    blurb: s.tagline,
    meta: `${s.lessons.length} lessons · office hours`,
    status: "open",
    size: "md",
    ...look[s.slug],
  })),
  {
    id: "square",
    name: "Community Square",
    kicker: "Meet up",
    href: "/square",
    color: "#00E5C0",
    ink: "#0B0B0C",
    glyph: "◎",
    blurb: "The place to hang out between lessons and swap notes with other students.",
    meta: "Opening soon",
    status: "soon",
    size: "md",
    desktop: { x: 50, y: 17 },
    phone: { x: 50, y: 12 },
    code: "D-05/SQR",
    space: { x: -1, y: 3.4, z: -13 },
    theme: { look: "arena", skyTop: "#FFFFFF", skyBottom: "#F2EEFF" },
  },
  {
    id: "shop",
    name: "Shop",
    kicker: "Merch",
    href: "/shop",
    color: "#FF3D8B",
    ink: "#0B0B0C",
    glyph: "★",
    blurb: "Freedom University gear and printed study guides. No financial products, ever.",
    meta: "Opening soon",
    status: "soon",
    size: "md",
    desktop: { x: 50, y: 86 },
    phone: { x: 50, y: 84 },
    code: "D-06/SHP",
    tagline: "Go beyond.",
    space: { x: 3, y: -1.8, z: 7 },
    theme: { look: "wing", skyTop: "#FFFFFF", skyBottom: "#FFEAF3" },
  },
];

export function getDistrict(id: string): District | undefined {
  return DISTRICTS.find((d) => d.id === id);
}
