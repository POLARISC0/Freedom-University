import { describe, expect, it } from "vitest";
import { SPECIALISTS } from "@/content";
import { getZone, positionFor, SLOT_MS, slotIndex, ZONES } from "@/content/floor";

describe("floor schedule", () => {
  it("only schedules zones that exist", () => {
    for (const s of SPECIALISTS) for (const z of s.schedule) expect(() => getZone(z)).not.toThrow();
  });

  it("is deterministic for a given time, so every viewer sees the same floor", () => {
    const slot = slotIndex(1_800_000_000_000);
    expect(positionFor(SPECIALISTS[0].schedule, 0, slot)).toEqual(positionFor(SPECIALISTS[0].schedule, 0, slot));
    expect(slotIndex(SLOT_MS * 10 + 1)).toBe(10);
  });

  it("keeps each specialist inside their current zone and on the floor", () => {
    for (let slot = 0; slot < 20; slot++) {
      SPECIALISTS.forEach((s, order) => {
        const p = positionFor(s.schedule, order, slot);
        const z = getZone(p.zoneId);
        expect(p.x).toBeGreaterThan(z.x);
        expect(p.x).toBeLessThan(z.x + z.w);
        expect(p.y).toBeGreaterThan(z.y);
        expect(p.y).toBeLessThan(z.y + z.h);
      });
    }
  });

  it("never stacks two specialists on the same spot", () => {
    for (let slot = 0; slot < 50; slot++) {
      const spots = SPECIALISTS.map((s, order) => {
        const p = positionFor(s.schedule, order, slot);
        return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
      });
      expect(new Set(spots).size).toBe(SPECIALISTS.length);
    }
  });

  it("moves specialists over time", () => {
    const zones = new Set(Array.from({ length: 7 }, (_, slot) => positionFor(SPECIALISTS[0].schedule, 0, slot).zoneId));
    expect(zones.size).toBeGreaterThan(2);
    expect(ZONES.length).toBe(7);
  });
});
