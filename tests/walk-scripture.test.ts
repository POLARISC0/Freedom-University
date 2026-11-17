import { describe, expect, it } from "vitest";
import webVerses from "./fixtures/web-verses.json";
import { collectQuoteChecks, expandRef, normalizeForCompare } from "./walk/quote-checks";
import { CHARACTERS, DAILY_VERSES, LESSONS, LOCATIONS, PATHS } from "@/walk/content";
import { ACTIVITIES, allNudges, BADGES, NEED_INFO, relationshipLevels } from "@/walk/life";
import { findReferences, isValidReference, parseReference } from "@/walk/scripture/references";
import { buildCapernaum } from "@/walk/world/maps/capernaum";

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
  for (const info of Object.values(NEED_INFO)) add(`need ${info.id}`, [info.ref]);
  for (const nudge of allNudges()) add(`need nudge ${nudge.need}`, [nudge.passage.ref]);
  for (const a of ACTIVITIES) add(`activity ${a.id}`, [a.passage.ref]);
  for (const b of BADGES) add(`badge ${b.id}`, [b.ref]);
  return out;
}

/** Prose in the life systems and the world's daily routines that cites Scripture inline. */
function lifeAndWorldProse(): { where: string; text: string }[] {
  const out: { where: string; text: string }[] = [];
  for (const info of Object.values(NEED_INFO)) out.push({ where: `need ${info.id}`, text: info.summary });
  for (const id of ["jesus", "peter"]) {
    for (const level of relationshipLevels(id)) out.push({ where: `friendship ${id} ${level.label}`, text: level.description });
  }
  for (const npc of buildCapernaum().npcs) {
    for (const entry of npc.schedule ?? []) if (entry.doing) out.push({ where: `routine ${npc.id}`, text: entry.doing });
  }
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

  it("cites a valid reference wherever the life systems and daily routines point to Scripture", () => {
    const prose = lifeAndWorldProse();
    const invalid = prose.flatMap(({ where, text }) => findReferences(text).filter((f) => !f.valid).map((f) => `${where}: ${f.raw}`));
    expect(invalid).toEqual([]);
    // Every need, every step of friendship with Jesus, and every part of the mentors' days names its passage.
    const uncited = prose
      .filter(({ where }) => /^(need |friendship jesus |routine (jesus|peter|matthew)$)/.test(where))
      .filter(({ text }) => findReferences(text).length === 0)
      .map(({ where, text }) => `${where}: ${text}`);
    expect(uncited).toEqual([]);
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
