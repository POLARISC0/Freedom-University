export type Accent = "amber" | "sky" | "emerald" | "violet";

/** An entry on a specialist's reading list. Cited in lessons as [S1], [S2], ... */
export interface Source {
  title: string;
  publisher: string;
  /** Omitted when there is no single stable page to link to. */
  url?: string;
}

export interface Lesson {
  slug: string;
  title: string;
  summary: string;
  objectives: string[];
  keyTerms: string[];
}

export type ZoneId = "crypto-desk" | "credit-desk" | "bank-vault" | "mindset-lounge" | "news-wall" | "coffee-bar" | "whiteboard";

export interface Specialist {
  slug: string;
  /** Fictional single-word name. Never a real person's name. */
  name: string;
  role: string;
  topic: string;
  emoji: string;
  accent: Accent;
  tagline: string;
  /** Voice and teaching style, injected into prompts. */
  personality: string;
  /** Zones visited in order, one per schedule slot, looping. */
  schedule: ZoneId[];
  lessons: Lesson[];
  sources: Source[];
}
