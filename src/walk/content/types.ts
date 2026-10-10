// Content model for Walk With Him. Everything here is plain data so it can be reviewed like a manuscript,
// tested, and rendered by any front end (the 2D game today, a 3D one later).

/** A quotation from the World English Bible (public domain), with its chapter-and-verse reference. */
export interface Passage {
  /** e.g. "Matthew 6:9-13". Must parse with `parseReference`. */
  ref: string;
  /** Exact WEB wording. Verses may be trimmed at the start or end, never reworded. */
  text: string;
}

/** Who is speaking a scripted line. A character id, the narrator, or the player. */
export type Speaker = string | "narrator" | "player";

export interface DialogueLine {
  speaker: Speaker;
  text: string;
  /** Scripture this line teaches from, shown as links under the line. */
  refs?: string[];
}

export interface Appearance {
  skin: string;
  hair: string;
  beard: "none" | "short" | "full";
  /** Hair or beard with grey in it. */
  grey?: boolean;
  robe: string;
  /** Outer cloak, drawn over the shoulders. */
  mantle?: string;
  sash: string;
  /** Head covering colour, if any. */
  headcloth?: string;
  /** Rough body size: "child" draws a smaller sprite. */
  build?: "adult" | "child";
}

export interface Character {
  id: string;
  name: string;
  shortName: string;
  /** A one-line epithet shown under the name. */
  title: string;
  /** Growth themes this character mentors. */
  themes: string[];
  /** Growth paths this character teaches (path slugs). */
  pathSlugs: string[];
  /** Two or three sentences for the mentors page. */
  summary: string;
  /** How they think and behave. Goes into the system prompt. */
  personality: string;
  /** How they talk. Goes into the system prompt. */
  voice: string;
  /** What Scripture tells us about them, with references. Goes into the system prompt. */
  backstory: string;
  /** Passages they know best and teach from. */
  keyRefs: string[];
  /** Honest limits: what Scripture does not tell us, traditions to label as tradition, people not to confuse them with. */
  cautions?: string;
  /** Extra rules for this character only (e.g. the stricter rules for Jesus). */
  extraRules?: string;
  /** Scripted greeting when the player walks up. */
  greeting: DialogueLine[];
  /** True when the character can hold an AI conversation in this build. */
  conversational: boolean;
  appearance: Appearance;
}

export type LessonStep =
  | { kind: "dialogue"; lines: DialogueLine[] }
  | {
      kind: "quest";
      /** Shown in the HUD while the quest is active. */
      objective: string;
      /** Id of a spot in the world the player must walk to. */
      target: string;
      /** The mentor walks to the spot too and is waiting there. */
      mentorWalks?: boolean;
      /** What the mentor says as they send the player off. */
      lines: DialogueLine[];
    }
  | { kind: "scene"; title: string; setting: string; narration: string[]; passages: Passage[] }
  | {
      kind: "choice";
      prompt: string;
      options: { id: string; label: string; response: DialogueLine[] }[];
    }
  | { kind: "conversation"; intro: string; suggestions: string[] }
  | { kind: "reflection"; question: string; guidance: string }
  | { kind: "challenge"; title: string; description: string; steps: string[]; refs: string[] };

export type LessonStepKind = LessonStep["kind"];

export interface Lesson {
  slug: string;
  pathSlug: string;
  mentorId: string;
  title: string;
  /** Short description for cards. */
  summary: string;
  /** Rough time to complete, in minutes. */
  minutes: number;
  /** What the mentor is trying to help the player understand. Used in the AI prompt. */
  goals: string[];
  /** The main passages, shown on the lesson card. */
  keyRefs: string[];
  steps: LessonStep[];
  /** Closing blessing shown when the lesson is complete. */
  blessing: Passage;
}

export interface UpcomingLesson {
  title: string;
  mentorId: string;
  refs: string[];
}

export interface GrowthPath {
  slug: string;
  title: string;
  icon: string;
  mentorIds: string[];
  summary: string;
  keyPassage: Passage;
  /** Lessons playable in this build, in order. */
  lessonSlugs: string[];
  /** Planned lessons, shown as "coming in a later chapter". */
  upcoming: UpcomingLesson[];
}

export interface WorldLocation {
  id: string;
  name: string;
  region: "Galilee" | "Judea" | "Wilderness";
  summary: string;
  refs: string[];
  /** True when the location can be explored in this build. */
  available: boolean;
}
