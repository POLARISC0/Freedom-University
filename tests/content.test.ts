import { describe, expect, it } from "vitest";
import { NEWS_SPECIALIST, SPECIALISTS } from "@/content";
import { shouldRefreshMemory } from "@/lib/memory-rules";

describe("specialists", () => {
  it("has the four specialists with unique, single-word fictional names", () => {
    expect(SPECIALISTS.map((s) => s.topic)).toEqual(["Crypto", "Credit", "Banking & the System", "Mindset & Ownership"]);
    expect(new Set(SPECIALISTS.map((s) => s.slug)).size).toBe(4);
    for (const s of SPECIALISTS) expect(s.name).toMatch(/^[A-Z][a-z]+$/);
  });

  it("uses the Banking & the System specialist for the daily news", () => {
    expect(NEWS_SPECIALIST.topic).toBe("Banking & the System");
  });

  for (const s of SPECIALISTS) {
    it(`${s.name} has a 5-lesson syllabus with objectives and an https reading list`, () => {
      expect(s.lessons).toHaveLength(5);
      expect(new Set(s.lessons.map((l) => l.slug)).size).toBe(5);
      for (const l of s.lessons) {
        expect(l.objectives.length).toBeGreaterThanOrEqual(3);
        expect(l.keyTerms.length).toBeGreaterThanOrEqual(3);
      }
      expect(s.sources.length).toBeGreaterThanOrEqual(5);
      for (const src of s.sources) if (src.url) expect(src.url).toMatch(/^https:\/\//);
    });
  }
});

describe("memory refresh", () => {
  it("refreshes after every 4 new student messages", () => {
    expect(shouldRefreshMemory(3, 0)).toBe(false);
    expect(shouldRefreshMemory(4, 0)).toBe(true);
    expect(shouldRefreshMemory(7, 4)).toBe(false);
    expect(shouldRefreshMemory(8, 4)).toBe(true);
  });
});
