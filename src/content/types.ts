export type Level = "Beginner" | "Intermediate" | "Advanced";

export const LEVELS: Level[] = ["Beginner", "Intermediate", "Advanced"];

export type Accent = "amber" | "violet" | "emerald" | "sky" | "rose";

/** An entry on a professor's curated reading list. Cited in lessons as [S1], [S2], ... */
export interface Source {
  title: string;
  publisher: string;
  /** Omitted when there is no single stable page to link to. */
  url?: string;
}

export interface CourseModule {
  slug: string;
  title: string;
  level: Level;
  summary: string;
  objectives: string[];
  keyTerms: string[];
}

export interface Professor {
  slug: string;
  number: number;
  name: string;
  course: string;
  emoji: string;
  accent: Accent;
  tagline: string;
  /** Voice and teaching style, injected into the system prompt. */
  persona: string;
  modules: CourseModule[];
  sources: Source[];
}
