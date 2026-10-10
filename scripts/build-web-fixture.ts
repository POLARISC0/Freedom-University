// Rebuilds tests/fixtures/web-verses.json: the World English Bible text of every verse the Walk With Him content
// quotes, so the scripture tests can check quotations offline.
//
// Usage: npx tsx scripts/build-web-fixture.ts <dir>
//   <dir> holds one JSON file per book in the format of the `world-english-bible` npm package
//   (e.g. matthew.json, 1corinthians.json): an array of { type, chapterNumber, verseNumber, value }.
//   Get it with `npm pack world-english-bible` and extract package/json, or convert the WEB from ebible.org.
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { collectQuoteChecks, expandRef } from "../tests/walk/quote-checks";

const dir = process.argv[2];
if (!dir) {
  console.error("Usage: npx tsx scripts/build-web-fixture.ts <dir-with-WEB-book-json>");
  process.exit(1);
}

const bookCache = new Map<string, Map<string, string>>();
function bookVerses(book: string): Map<string, string> {
  const file = book.toLowerCase().replace(/[^a-z0-9]/g, "").replace(/^psalm$/, "psalms");
  if (!bookCache.has(file)) {
    const entries: { type: string; chapterNumber?: number; verseNumber?: number; value?: string }[] = JSON.parse(
      readFileSync(path.join(dir, `${file}.json`), "utf8"),
    );
    const verses = new Map<string, string>();
    for (const e of entries) {
      if ((e.type === "paragraph text" || e.type === "line text") && e.chapterNumber && e.verseNumber) {
        const key = `${e.chapterNumber}:${e.verseNumber}`;
        verses.set(key, `${verses.get(key) ?? ""} ${e.value ?? ""}`.replace(/\s+/g, " ").trim());
      }
    }
    bookCache.set(file, verses);
  }
  return bookCache.get(file)!;
}

const needed = new Set(collectQuoteChecks().flatMap((c) => c.refs.flatMap(expandRef)));
const out: Record<string, string> = {};
for (const key of [...needed].sort()) {
  const [, book, cv] = key.match(/^(.+) (\d+:\d+)$/)!;
  const text = bookVerses(book).get(cv);
  if (text === undefined) throw new Error(`Missing verse ${key}`);
  out[key] = text;
}
const target = path.join(import.meta.dirname, "../tests/fixtures/web-verses.json");
writeFileSync(target, JSON.stringify(out, null, 1) + "\n");
console.log(`Wrote ${Object.keys(out).length} verses to ${path.relative(process.cwd(), target)}`);
