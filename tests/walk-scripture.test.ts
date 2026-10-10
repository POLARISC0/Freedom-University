import { describe, expect, it } from "vitest";
import webVerses from "./fixtures/web-verses.json";
import { collectQuoteChecks, expandRef, normalizeForCompare } from "./walk/quote-checks";
import { CHARACTERS, DAILY_VERSES, LESSONS, LOCATIONS, PATHS } from "@/walk/content";
import { findReferences, isValidReference, parseReference } from "@/walk/scripture/references";

const WEB = webVerses as Record<string, string>;

function allReferenceStrings(): { where: string; ref: string }[] {
  const out: { where: string; ref: string }[] = [];
  const add = (where: string, refs: string[] | undefined) => refs?.forEach((ref) => out.push({ where, ref }));
  for (const c of CHARACTERS) {
    add(`character ${c.id}`, c.keyRefs);
    c.greeting.forEach((l) => add(`character ${c.id} greeting`, l.refs));
  }
  for (const p of PATHS) {
    add(`path ${p.slug}`, [p.keyPassage.ref]);
    p.upcoming.forEach((u) => add(`path ${p.slug} upcoming`, u.refs));
  }
  for (const l of LOCATIONS) add(`location ${l.id}`, l.refs);
  for (const lesson of LESSONS) {
    add(`lesson ${lesson.slug}`, [...lesson.keyRefs, lesson.blessing.ref]);
    for (const step of lesson.steps) {
      if (step.kind === "dialogue" || step.kind === "quest") step.lines.forEach((l) => add(lesson.slug, l.refs));
      if (step.kind === "choice") step.options.forEach((o) => o.response.forEach((l) => add(lesson.slug, l.refs)));
      if (step.kind === "scene") add(lesson.slug, step.passages.map((p) => p.ref));
      if (step.kind === "challenge") add(lesson.slug, step.refs);
    }
  }
  DAILY_VERSES.forEach((v) => add("daily verses", [v.ref]));
  return out;
}

describe("Scripture references in content", () => {
  it("all parse and exist", () => {
    const bad = allReferenceStrings().filter(({ ref }) => {
      const parsed = parseReference(ref);
      return !parsed || !isValidReference(parsed);
    });
    expect(bad).toEqual([]);
  });

  it("inline references in prose all exist", () => {
    const prose = [
      ...CHARACTERS.flatMap((c) => [c.personality, c.voice, c.backstory, c.cautions ?? "", c.extraRules ?? ""]),
      ...LESSONS.flatMap((l) => l.goals),
      ...LESSONS.flatMap((l) => l.steps.flatMap((s) => (s.kind === "challenge" ? s.steps : []))),
    ];
    const invalid = prose.flatMap((text) => findReferences(text).filter((f) => !f.valid).map((f) => f.raw));
    expect(invalid).toEqual([]);
  });
});

describe("Scripture quotations match the World English Bible", () => {
  const checks = collectQuoteChecks();

  it("finds the quotations to check", () => {
    expect(checks.length).toBeGreaterThan(100);
  });

  it.each(checks.map((c) => [c.where, c] as const))("%s", (_where, check) => {
    const source = check.refs
      .flatMap(expandRef)
      .map((key) => {
        const text = WEB[key];
        if (text === undefined) throw new Error(`${key} is missing from the fixture: run scripts/build-web-fixture.ts`);
        return text;
      })
      .join(" ");
    expect(normalizeForCompare(source)).toContain(normalizeForCompare(check.quote));
  });
});
