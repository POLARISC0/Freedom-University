import { BOOK_DATA } from "./book-data";

export const TRANSLATION = {
  id: "WEB",
  name: "World English Bible",
  note: "The World English Bible is in the public domain.",
} as const;

export interface ScriptureRef {
  book: string;
  chapter: number;
  verse?: number;
  /** Last chapter of a range that crosses chapters, e.g. Matthew 5-7 or John 20:30-21:2. */
  chapterEnd?: number;
  verseEnd?: number;
}

interface Book {
  name: string;
  verses: readonly number[];
}

const BOOKS = new Map<string, Book>();
const NAME_LOOKUP = new Map<string, Book>();

function lookupKey(name: string): string {
  return name.toLowerCase().replace(/\./g, "").replace(/\s+/g, " ").trim();
}

for (const [name, aliases, verses] of BOOK_DATA) {
  const book = { name, verses };
  BOOKS.set(name, book);
  for (const alias of [name, ...aliases]) {
    NAME_LOOKUP.set(lookupKey(alias), book);
    // Accept "1John", "1st John" and "First John" for numbered books.
    const numbered = alias.match(/^([123]) (.+)$/);
    if (numbered) {
      const [, n, rest] = numbered;
      const words = { "1": ["1st", "first"], "2": ["2nd", "second"], "3": ["3rd", "third"] }[n as "1" | "2" | "3"];
      for (const prefix of [n, ...words]) NAME_LOOKUP.set(lookupKey(`${prefix} ${rest}`), book);
      NAME_LOOKUP.set(lookupKey(`${n}${rest}`), book);
    }
  }
}

export function bookNames(): string[] {
  return [...BOOKS.keys()];
}

// Book names as they may appear in text: capitalised, with an optional numeric or ordinal prefix and optional period.
const NAME_PATTERN = (() => {
  const forms = new Set<string>();
  for (const [name, aliases] of BOOK_DATA) {
    for (const alias of [name, ...aliases]) {
      const numbered = alias.match(/^([123]) (.+)$/);
      if (numbered) {
        const [, n, rest] = numbered;
        const ordinal = { "1": "1st|First", "2": "2nd|Second", "3": "3rd|Third" }[n as "1" | "2" | "3"];
        forms.add(`(?:${n}|${ordinal}) ?${escapeRegExp(rest)}`);
      } else {
        forms.add(escapeRegExp(alias));
      }
    }
  }
  // Longest first so "Philippians" wins over "Phil" and "Song of Solomon" over "Song".
  return [...forms].sort((a, b) => b.length - a.length).join("|");
})();

const DASH = "\\s?[-–—]\\s?";
const REF_SOURCE =
  `(?<![\\w])(${NAME_PATTERN})\\.?\\s(\\d{1,3})` +
  `(?::(\\d{1,3})(?:${DASH}(\\d{1,3})(?::(\\d{1,3}))?)?|${DASH}(\\d{1,3})(?![:\\d]))?(?![\\w:])`;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildRef(groups: (string | undefined)[]): ScriptureRef | null {
  const [name, ch, v, end1, end2, chapterRangeEnd] = groups;
  const book = NAME_LOOKUP.get(lookupKey(name ?? ""));
  if (!book) return null;
  const ref: ScriptureRef = { book: book.name, chapter: Number(ch) };
  if (v !== undefined) {
    ref.verse = Number(v);
    if (end2 !== undefined) {
      // John 20:30-21:2
      ref.chapterEnd = Number(end1);
      ref.verseEnd = Number(end2);
    } else if (end1 !== undefined) {
      ref.verseEnd = Number(end1);
    }
  } else if (chapterRangeEnd !== undefined) {
    ref.chapterEnd = Number(chapterRangeEnd);
  }
  return ref;
}

/** Parse a single reference such as "Matthew 6:9-13", "1 Cor. 13:4–7" or "Psalm 23". */
export function parseReference(text: string): ScriptureRef | null {
  const match = new RegExp(`^${REF_SOURCE}$`).exec(text.trim());
  return match ? buildRef(match.slice(1)) : null;
}

/** True when the book, chapters and verses all exist (World English Bible versification). */
export function isValidReference(ref: ScriptureRef): boolean {
  const book = BOOKS.get(ref.book);
  if (!book) return false;
  const chapters = book.verses.length;
  const inChapter = (chapter: number, verse: number) => verse >= 1 && verse <= book.verses[chapter - 1];
  if (ref.chapter < 1 || ref.chapter > chapters) return false;
  const lastChapter = ref.chapterEnd ?? ref.chapter;
  if (lastChapter < ref.chapter || lastChapter > chapters) return false;
  if (ref.verse !== undefined && !inChapter(ref.chapter, ref.verse)) return false;
  if (ref.verseEnd !== undefined) {
    if (!inChapter(lastChapter, ref.verseEnd)) return false;
    if (lastChapter === ref.chapter && ref.verseEnd < (ref.verse ?? 1)) return false;
  }
  return true;
}

/** Canonical display form, e.g. "Matthew 6:9–13". */
export function formatReference(ref: ScriptureRef): string {
  // One psalm is "Psalm 23"; a range of them is "Psalms 120-134".
  const book = ref.book === "Psalms" && ref.chapterEnd === undefined ? "Psalm" : ref.book;
  let out = `${book} ${ref.chapter}`;
  if (ref.verse !== undefined) {
    out += `:${ref.verse}`;
    if (ref.chapterEnd !== undefined && ref.verseEnd !== undefined) out += `–${ref.chapterEnd}:${ref.verseEnd}`;
    else if (ref.verseEnd !== undefined) out += `–${ref.verseEnd}`;
  } else if (ref.chapterEnd !== undefined) {
    out += `–${ref.chapterEnd}`;
  }
  return out;
}

/** Link to the passage in the World English Bible on Bible Gateway. */
export function bibleGatewayUrl(ref: ScriptureRef | string): string {
  const parsed = typeof ref === "string" ? parseReference(ref) : ref;
  const search = parsed ? formatReference(parsed).replace(/–/g, "-") : String(ref);
  return `https://www.biblegateway.com/passage/?search=${encodeURIComponent(search)}&version=${TRANSLATION.id}`;
}

export interface FoundReference {
  ref: ScriptureRef;
  /** Exact text that matched. */
  raw: string;
  index: number;
  valid: boolean;
}

/** Every Scripture reference in a piece of text, in order. */
export function findReferences(text: string): FoundReference[] {
  const out: FoundReference[] = [];
  for (const match of text.matchAll(new RegExp(REF_SOURCE, "g"))) {
    const ref = buildRef(match.slice(1));
    if (!ref) continue;
    out.push({ ref, raw: match[0], index: match.index ?? 0, valid: isValidReference(ref) });
  }
  return out;
}

/** Distinct valid references in a text, formatted for display. */
export function uniqueReferences(text: string): string[] {
  const seen = new Set<string>();
  for (const found of findReferences(text)) {
    if (found.valid) seen.add(formatReference(found.ref));
  }
  return [...seen];
}

/**
 * Turn references in markdown into links to the passage. References that don't exist in Scripture are
 * left as plain text with a marker so a reader can see that they could not be checked. Text already
 * inside a link or code span is left alone.
 */
export function linkScriptureReferences(markdown: string): string {
  // Split out existing links and code so they are not rewritten.
  const protectedPattern = /(`[^`]*`|\[[^\]]*\]\([^)]*\))/g;
  return markdown
    .split(protectedPattern)
    .map((part, i) => {
      if (i % 2 === 1) return part;
      let result = "";
      let last = 0;
      for (const found of findReferences(part)) {
        result += part.slice(last, found.index);
        result += found.valid
          ? `[${found.raw}](${bibleGatewayUrl(found.ref)})`
          : `${found.raw} (reference not found)`;
        last = found.index + found.raw.length;
      }
      return result + part.slice(last);
    })
    .join("");
}
