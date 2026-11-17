import { describe, expect, it } from "vitest";
import { NEWS_PROFESSOR, PROFESSORS } from "@/content";
import { LEVELS } from "@/content/types";

describe("curriculum", () => {
  it("has five professors numbered 1-5 with unique slugs", () => {
    expect(PROFESSORS.map((p) => p.number)).toEqual([1, 2, 3, 4, 5]);
    expect(new Set(PROFESSORS.map((p) => p.slug)).size).toBe(5);
  });

  it("uses Professor 3 for the news briefing", () => {
    expect(NEWS_PROFESSOR.number).toBe(3);
  });

  for (const p of PROFESSORS) {
    describe(p.course, () => {
      it("runs beginner → advanced with unique module slugs", () => {
        const order = p.modules.map((m) => LEVELS.indexOf(m.level));
        expect(order).toEqual([...order].sort((a, b) => a - b));
        expect(new Set(order)).toEqual(new Set([0, 1, 2]));
        expect(new Set(p.modules.map((m) => m.slug)).size).toBe(p.modules.length);
      });

      it("gives every module objectives and key terms", () => {
        for (const m of p.modules) {
          expect(m.objectives.length).toBeGreaterThanOrEqual(3);
          expect(m.keyTerms.length).toBeGreaterThanOrEqual(3);
        }
      });

      it("has a reading list with https links", () => {
        expect(p.sources.length).toBeGreaterThanOrEqual(5);
        for (const s of p.sources) if (s.url) expect(s.url).toMatch(/^https:\/\//);
      });
    });
  }
});
