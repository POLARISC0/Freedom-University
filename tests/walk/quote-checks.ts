// Finds every Scripture quotation in the Walk With Him content so tests can check it word for word against the
// World English Bible. Shared by tests/walk-scripture.test.ts and scripts/build-web-fixture.ts.
import { BOOK_DATA } from "@/walk/scripture/book-data";
import { findReferences, parseReference } from "@/walk/scripture/references";
import { CHARACTERS, DAILY_VERSES, LESSONS, LOCATIONS, PATHS } from "@/walk/content";
import { MOOD_VERSES } from "@/walk/content/checkin";
import { ENCOURAGEMENT_VERSE } from "@/walk/progress";
import type { DialogueLine, Passage } from "@/walk/content";

export interface QuoteCheck {
  where: string;
  /** The quotation must appear within the text of these passages. */
  refs: string[];
  quote: string;
}

const VERSE_COUNTS = new Map(BOOK_DATA.map(([name, , verses]) => [name, verses]));

/** Every single verse a reference covers, as "Book C:V" keys. */
export function expandRef(ref: string): string[] {
  const parsed = parseReference(ref);
  if (!parsed) throw new Error(`Unparseable reference: ${ref}`);
  const verses = VERSE_COUNTS.get(parsed.book)!;
  const out: string[] = [];
  const lastChapter = parsed.chapterEnd ?? parsed.chapter;
  for (let c = parsed.chapter; c <= lastChapter; c++) {
    const first = c === parsed.chapter ? (parsed.verse ?? 1) : 1;
    const last =
      c === lastChapter ? (parsed.verseEnd ?? (parsed.chapterEnd === undefined ? parsed.verse : undefined) ?? verses[c - 1]) : verses[c - 1];
    for (let v = first; v <= last; v++) out.push(`${parsed.book} ${c}:${v}`);
  }
  return out;
}

/** Compare wording only: case, quotation marks, apostrophes, spacing and trailing punctuation are ignored. */
export function normalizeForCompare(text: string): string {
  return text
    .toLowerCase()
    .replace(/[“”"‘’'`]/g, "")
    .replace(/[—–]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[\s,;:.]+|[\s,;:.!?]+$/g, "");
}

const MIN_QUOTE_WORDS = 5;

/** Quoted phrases of at least five words, split at ellipses. */
export function quotationsIn(text: string): string[] {
  const out: string[] = [];
  for (const match of text.matchAll(/"([^"]+)"/g)) {
    if (match[1].split(/\s+/).length < MIN_QUOTE_WORDS) continue;
    for (const piece of match[1].split(/\.\.\.|…/)) {
      if (piece.trim().split(/\s+/).length >= 2) out.push(piece.trim());
    }
  }
  return out;
}

function refsIn(text: string): string[] {
  return findReferences(text)
    .filter((f) => f.valid)
    .map((f) => f.raw);
}

export function collectQuoteChecks(): QuoteCheck[] {
  const checks: QuoteCheck[] = [];
  const passage = (where: string, p: Passage) => checks.push({ where, refs: [p.ref], quote: p.text });
  const quotes = (where: string, text: string, refs: string[]) => {
    for (const quote of quotationsIn(text)) checks.push({ where, refs, quote });
  };
  const lines = (where: string, list: DialogueLine[], fallbackRefs: string[]) =>
    list.forEach((line, i) => quotes(`${where} line ${i + 1}`, line.text, line.refs?.length ? line.refs : fallbackRefs));

  for (const lesson of LESSONS) {
    const all = [...lesson.keyRefs];
    for (const step of lesson.steps) {
      if (step.kind === "dialogue" || step.kind === "quest") all.push(...step.lines.flatMap((l) => l.refs ?? []));
      if (step.kind === "choice") all.push(...step.options.flatMap((o) => o.response.flatMap((l) => l.refs ?? [])));
      if (step.kind === "scene") all.push(...step.passages.map((p) => p.ref));
      if (step.kind === "challenge") all.push(...step.refs);
    }
    lesson.steps.forEach((step, i) => {
      const where = `lesson ${lesson.slug} step ${i + 1}`;
      switch (step.kind) {
        case "dialogue":
        case "quest":
          lines(where, step.lines, all);
          break;
        case "choice":
          step.options.forEach((o) => lines(`${where} option ${o.id}`, o.response, all));
          break;
        case "scene":
          step.passages.forEach((p) => passage(where, p));
          step.narration.forEach((n) => quotes(where, n, all));
          break;
        case "reflection":
          quotes(where, step.question, all);
          break;
        case "challenge":
          quotes(where, step.description, step.refs);
          step.steps.forEach((s) => quotes(where, s, [...refsIn(s), ...step.refs]));
          break;
      }
    });
    passage(`lesson ${lesson.slug} blessing`, lesson.blessing);
  }

  for (const c of CHARACTERS) {
    for (const field of ["summary", "personality", "voice", "backstory", "title"] as const) {
      quotes(`character ${c.id} ${field}`, c[field], [...refsIn(c[field]), ...c.keyRefs]);
    }
    lines(`character ${c.id} greeting`, c.greeting, c.keyRefs);
  }

  for (const p of PATHS) passage(`path ${p.slug}`, p.keyPassage);
  for (const l of LOCATIONS) quotes(`location ${l.id}`, l.summary, l.refs);
  DAILY_VERSES.forEach((v, i) => passage(`daily verse ${i + 1}`, v));
  Object.entries(MOOD_VERSES).forEach(([mood, v]) => passage(`check-in ${mood}`, v));
  passage("encouragement", ENCOURAGEMENT_VERSE);
  return checks;
}
