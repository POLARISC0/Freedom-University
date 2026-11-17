import { describe, expect, it } from "vitest";
import { SPECIALISTS } from "@/content";
import { DISTRICTS } from "@/content/world";

describe("world map districts", () => {
  it("has every mentor, the Trading Floor, the Community Square and the Shop", () => {
    const names = DISTRICTS.map((d) => d.name);
    for (const s of SPECIALISTS) expect(names).toContain(s.name);
    expect(names).toEqual(expect.arrayContaining(["Trading Floor", "Community Square", "Shop"]));
    expect(DISTRICTS).toHaveLength(SPECIALISTS.length + 3);
  });

  it("links each mentor district to that mentor's area", () => {
    for (const s of SPECIALISTS) {
      expect(DISTRICTS.find((d) => d.name === s.name)?.href).toBe(`/specialists/${s.slug}`);
    }
    expect(DISTRICTS.find((d) => d.name === "Trading Floor")?.href).toBe("/floor");
  });

  it("keeps districts on the map and apart from each other, on desktop and phone", () => {
    for (const layout of ["desktop", "phone"] as const) {
      const spots = DISTRICTS.map((d) => d[layout]);
      for (const p of spots) {
        expect(p.x).toBeGreaterThanOrEqual(10);
        expect(p.x).toBeLessThanOrEqual(90);
        expect(p.y).toBeGreaterThanOrEqual(10);
        expect(p.y).toBeLessThanOrEqual(90);
      }
      for (let i = 0; i < spots.length; i++)
        for (let j = i + 1; j < spots.length; j++)
          expect(Math.hypot(spots[i].x - spots[j].x, spots[i].y - spots[j].y)).toBeGreaterThan(18);
    }
  });

  it("uses no blue hues (roughly 190-250 degrees)", () => {
    for (const d of DISTRICTS) {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(d.color.slice(i, i + 2), 16) / 255);
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      if (max === min) continue; // greys and white have no hue
      const h = max === r ? ((g - b) / (max - min)) % 6 : max === g ? (b - r) / (max - min) + 2 : (r - g) / (max - min) + 4;
      const hue = (h * 60 + 360) % 360;
      expect(hue < 190 || hue > 250, `${d.name} ${d.color} hue ${hue.toFixed(0)}`).toBe(true);
    }
  });
});
