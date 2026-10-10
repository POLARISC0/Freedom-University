// Real people who can help. Shown whenever a player shares something serious, on the check-in when they say
// they're struggling, and on the /walk/help page. Keep numbers current: review this list at least yearly.

export type ConcernKind = "suicide" | "self-harm" | "abuse" | "violence" | "grief" | "substance";

export interface HelpLine {
  id: string;
  name: string;
  /** How to reach them, e.g. "Call or text 988". */
  contact: string;
  url: string;
  region: string;
  /** What they help with. "all" lines are shown for every concern. */
  topics: ConcernKind[] | "all";
}

export const EMERGENCY_NOTE =
  "If you or someone else is in immediate danger, call 911 in the US or your local emergency number now.";

export const HELP_LINES: HelpLine[] = [
  {
    id: "988",
    name: "988 Suicide & Crisis Lifeline",
    contact: "Call or text 988, or chat at 988lifeline.org. Veterans: dial 988 then press 1.",
    url: "https://988lifeline.org",
    region: "United States",
    topics: "all",
  },
  {
    id: "crisis-text-line",
    name: "Crisis Text Line",
    contact: "Text HOME to 741741",
    url: "https://www.crisistextline.org",
    region: "United States",
    topics: "all",
  },
  {
    id: "dv-hotline",
    name: "National Domestic Violence Hotline",
    contact: "Call 1-800-799-7233 or text START to 88788",
    url: "https://www.thehotline.org",
    region: "United States",
    topics: ["abuse", "violence"],
  },
  {
    id: "childhelp",
    name: "Childhelp National Child Abuse Hotline",
    contact: "Call or text 1-800-422-4453",
    url: "https://www.childhelphotline.org",
    region: "United States",
    topics: ["abuse"],
  },
  {
    id: "rainn",
    name: "RAINN National Sexual Assault Hotline",
    contact: "Call 1-800-656-4673 or chat at rainn.org",
    url: "https://rainn.org",
    region: "United States",
    topics: ["abuse"],
  },
  {
    id: "samhsa",
    name: "SAMHSA National Helpline",
    contact: "Call 1-800-662-4357 (free, confidential, 24/7)",
    url: "https://www.samhsa.gov/find-help/helplines/national-helpline",
    region: "United States",
    topics: ["substance"],
  },
  {
    id: "griefshare",
    name: "GriefShare",
    contact: "Find a grief support group meeting at a church near you",
    url: "https://www.griefshare.org",
    region: "United States and worldwide",
    topics: ["grief"],
  },
  {
    id: "988-canada",
    name: "9-8-8 Suicide Crisis Helpline (Canada)",
    contact: "Call or text 988",
    url: "https://988.ca",
    region: "Canada",
    topics: "all",
  },
  {
    id: "samaritans",
    name: "Samaritans",
    contact: "Call 116 123 (free, 24/7)",
    url: "https://www.samaritans.org",
    region: "UK & Ireland",
    topics: "all",
  },
  {
    id: "findahelpline",
    name: "Find A Helpline",
    contact: "Free, confidential helplines in your country",
    url: "https://findahelpline.com",
    region: "Worldwide",
    topics: "all",
  },
];

/** The lines most relevant to the given concerns, most specific first. */
export function helpLinesFor(concerns: ConcernKind[]): HelpLine[] {
  const specific = HELP_LINES.filter((l) => l.topics !== "all" && l.topics.some((t) => concerns.includes(t)));
  const general = HELP_LINES.filter((l) => l.topics === "all");
  // Grief alone doesn't need every crisis line; offer grief support plus one general line.
  if (concerns.length > 0 && concerns.every((c) => c === "grief")) {
    return [...specific, ...general.filter((l) => l.id === "988" || l.id === "findahelpline")];
  }
  return [...specific, ...general];
}

/** True for concerns where someone's life or safety may be at risk right now. */
export function isUrgent(concerns: ConcernKind[]): boolean {
  return concerns.some((c) => c === "suicide" || c === "self-harm" || c === "violence" || c === "abuse");
}
