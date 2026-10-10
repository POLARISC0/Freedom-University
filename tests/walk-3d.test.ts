import { describe, expect, it } from "vitest";
import { cameraOffset, edgeArrow, fieldOfView, pickNearest, screenToWorld, snapYaw, stepYaw, YAW_STEP, zoomPose } from "@/walk/game3d/camera";
import { angleDelta } from "@/walk/game3d/crowd";
import { buildHeights, footprintBase, groundHeight, heightAt, JETTY_DECK, raycastGround, STEP, tileAt, WATER_LEVEL } from "@/walk/game3d/heights";
import { activityColor } from "@/walk/game3d/markers";
import { moonDirection, skyAt, sunDirection, withWeather, type RGB } from "@/walk/game3d/palette";
import { poseJoints, puppetHeight } from "@/walk/game3d/puppet";
import { paintPixels, TEXTURE_SIZE } from "@/walk/game3d/textures";
import { buildCapernaum } from "@/walk/world/maps/capernaum";
import { Tile } from "@/walk/world/types";

const map = buildCapernaum();
const field = buildHeights(map);
const luma = (c: RGB) => c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11;
const isLand = (t: Tile) => t !== Tile.Deep && t !== Tile.Shallow && t !== Tile.Jetty;

describe("terrain heights", () => {
  it("puts the lake below the waterline, the beach just above it, and the town a block up", () => {
    for (let i = 0; i < map.tiles.length; i++) {
      const t = map.tiles[i] as Tile;
      const h = field.heights[i];
      if (t === Tile.Deep || t === Tile.Shallow) expect(h).toBeLessThan(WATER_LEVEL);
      if (t === Tile.Sand) expect(h).toBe(0.5);
      if (t === Tile.Plaza || t === Tile.Field) expect(h).toBe(1);
      if (t === Tile.Jetty) expect(h).toBe(JETTY_DECK);
    }
  });

  it("raises the hills in half-block terraces, with the quiet place high on the hillside", () => {
    const hills = [...map.tiles.keys()].filter((i) => map.tiles[i] === Tile.Hill || map.tiles[i] === Tile.Meadow);
    for (const i of hills) {
      expect(field.heights[i]).toBeGreaterThanOrEqual(1);
      expect((field.heights[i] / STEP) % 1).toBe(0);
    }
    const rock = map.spots["prayer-rock"];
    expect(heightAt(field, rock.x, rock.y)).toBeGreaterThanOrEqual(3);
    // Higher towards the north-west than near the town.
    expect(heightAt(field, 8, 6)).toBeGreaterThan(heightAt(field, 24, 28));
  });

  it("never steps more than half a block between neighbouring land tiles", () => {
    const { width: w, height: h } = map;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (!isLand(tileAt(field, x, y))) continue;
        for (const [dx, dy] of [
          [1, 0],
          [0, 1],
        ]) {
          if (x + dx >= w || y + dy >= h || !isLand(tileAt(field, x + dx, y + dy))) continue;
          expect(Math.abs(heightAt(field, x, y) - heightAt(field, x + dx, y + dy))).toBeLessThanOrEqual(STEP);
        }
      }
    }
  });

  it("repeats the edge tiles past the map, so the ground carries on", () => {
    expect(heightAt(field, -5, 10)).toBe(heightAt(field, 0, 10));
    expect(heightAt(field, map.width + 3, map.height + 9)).toBe(heightAt(field, map.width - 1, map.height - 1));
  });

  it("ramps the ground smoothly over a step, meeting halfway at the edge", () => {
    // Find a step between two land tiles side by side.
    let found: [number, number] | null = null;
    for (let y = 0; y < map.height && !found; y++) {
      for (let x = 0; x < map.width - 1 && !found; x++) {
        const a = tileAt(field, x, y);
        const b = tileAt(field, x + 1, y);
        if (isLand(a) && isLand(b) && heightAt(field, x, y) !== heightAt(field, x + 1, y)) found = [x, y];
      }
    }
    expect(found).not.toBeNull();
    const [x, y] = found!;
    const left = heightAt(field, x, y);
    const right = heightAt(field, x + 1, y);
    expect(groundHeight(field, x + 0.5, y + 0.5)).toBe(left);
    expect(groundHeight(field, x + 1.5, y + 0.5)).toBe(right);
    const mid = (left + right) / 2;
    expect(groundHeight(field, x + 0.9999, y + 0.5)).toBeCloseTo(mid, 3);
    expect(groundHeight(field, x + 1.0001, y + 0.5)).toBeCloseTo(mid, 3);
    // No jumps: small steps across the edge change the height only a little.
    for (let fx = x + 0.5; fx < x + 1.5; fx += 0.01) {
      expect(Math.abs(groundHeight(field, fx + 0.01, y + 0.5) - groundHeight(field, fx, y + 0.5))).toBeLessThan(0.05);
    }
  });

  it("sits objects on the lowest ground under their footprint", () => {
    expect(footprintBase(field, 10, 5, 3, 2)).toBe(Math.min(...[10, 11, 12].flatMap((x) => [5, 6].map((y) => heightAt(field, x, y)))));
    // A zero-sized footprint (a lantern) still reads its own tile.
    expect(footprintBase(field, 48.8, 40, 0, 0)).toBe(heightAt(field, 48, 40));
  });

  it("finds where a ray from the camera meets the ground", () => {
    const top = raycastGround(field, { x: 50.5, y: 30, z: 25.5 }, { x: 0, y: -1, z: 0 });
    expect(top!.x).toBeCloseTo(50.5);
    expect(top!.z).toBeCloseTo(25.5);
    // At an angle, it lands where the ray's height falls to the ground there.
    const dir = { x: 0, y: -Math.SQRT1_2, z: -Math.SQRT1_2 };
    const hit = raycastGround(field, { x: 45.5, y: 21, z: 50 }, dir)!;
    const t = (50 - hit.z) / Math.SQRT1_2;
    expect(21 - t * Math.SQRT1_2).toBeCloseTo(Math.max(heightAt(field, hit.x, hit.z), WATER_LEVEL), 1);
    // Pointing at the sky misses.
    expect(raycastGround(field, { x: 40, y: 10, z: 30 }, { x: 0, y: 1, z: 0 })).toBeNull();
  });
});

describe("camera", () => {
  it("turns in eighth-turn steps from wherever it is heading", () => {
    expect(stepYaw(0, 1)).toBeCloseTo(YAW_STEP);
    expect(stepYaw(0, -1)).toBeCloseTo(-YAW_STEP);
    // Part-way through a drag, the next step is from the nearest whole step.
    expect(stepYaw(YAW_STEP * 1.3, 1)).toBeCloseTo(YAW_STEP * 2);
    expect(snapYaw(0.2)).toBe(0);
    expect(snapYaw(0.6)).toBeCloseTo(YAW_STEP);
  });

  it("looks north by default, from the south", () => {
    const o = cameraOffset(0, zoomPose(0.4).pitch, 10);
    expect(o.x).toBeCloseTo(0);
    expect(o.z).toBeGreaterThan(0);
    expect(o.y).toBeGreaterThan(0);
    expect(Math.hypot(o.x, o.y, o.z)).toBeCloseTo(10);
  });

  it("walks relative to the camera: up on screen is away from it", () => {
    // Facing north: up walks north, right walks east.
    expect(screenToWorld(0, -1, 0)).toEqual({ x: expect.closeTo(0), y: expect.closeTo(-1) });
    expect(screenToWorld(1, 0, 0)).toEqual({ x: expect.closeTo(1), y: expect.closeTo(0) });
    // A quarter turn round to the east, looking west: up walks west, right walks north.
    expect(screenToWorld(0, -1, Math.PI / 2)).toEqual({ x: expect.closeTo(-1), y: expect.closeTo(0) });
    expect(screenToWorld(1, 0, Math.PI / 2)).toEqual({ x: expect.closeTo(0), y: expect.closeTo(-1) });
    // Up always walks along the camera's own look direction.
    for (const yaw of [0.3, 1.7, -2.2]) {
      const o = cameraOffset(yaw, 0.8, 1);
      const away = screenToWorld(0, -1, yaw);
      expect(away.x * o.x + away.y * o.z).toBeLessThan(0);
      expect(Math.hypot(away.x, away.y)).toBeCloseTo(1);
    }
  });

  it("zooms from a close look at faces to a view over much of the town", () => {
    const near = zoomPose(0);
    const far = zoomPose(1);
    expect(near.distance).toBeLessThan(8);
    expect(far.distance).toBeGreaterThan(40);
    expect(zoomPose(2)).toEqual(far);
    for (let z = 0; z < 1; z += 0.1) {
      expect(zoomPose(z + 0.1).distance).toBeGreaterThan(zoomPose(z).distance);
      expect(zoomPose(z + 0.1).pitch).toBeGreaterThanOrEqual(zoomPose(z).pitch);
    }
    expect(far.pitch * (180 / Math.PI)).toBeCloseTo(56);
  });

  it("widens the field of view on tall phone screens", () => {
    expect(fieldOfView(1.6)).toBe(38);
    expect(fieldOfView(0.5)).toBeGreaterThan(fieldOfView(0.8));
    expect(fieldOfView(0.2)).toBeLessThanOrEqual(58);
  });

  it("points the quest arrow at off-screen targets, from the edge of the view", () => {
    const view = { width: 800, height: 600 };
    expect(edgeArrow({ x: 400, y: 300, behind: false }, view)).toBeNull();
    const right = edgeArrow({ x: 2000, y: 300, behind: false }, view)!;
    expect(right.x).toBeCloseTo(800 - 28);
    expect(right.y).toBeCloseTo(300);
    expect(right.angle).toBeCloseTo(0);
    const up = edgeArrow({ x: 400, y: -900, behind: false }, view)!;
    expect(up.y).toBeCloseTo(28);
    expect(up.angle).toBeCloseTo(-Math.PI / 2);
    // Behind the camera the projection flips, so the arrow does too.
    const behind = edgeArrow({ x: 400, y: -900, behind: true }, view)!;
    expect(behind.y).toBeCloseTo(600 - 28);
  });

  it("picks the person whose figure is nearest a tap, within reach", () => {
    const people = [
      { id: "a", x: 100, top: 50, bottom: 120 },
      { id: "b", x: 160, top: 60, bottom: 130 },
    ];
    expect(pickNearest(people, 104, 80, 20)?.id).toBe("a");
    expect(pickNearest(people, 150, 125, 20)?.id).toBe("b");
    // Above the head or below the feet counts from the nearest end.
    expect(pickNearest(people, 100, 40, 20)?.id).toBe("a");
    expect(pickNearest(people, 130, 300, 20)).toBeNull();
  });
});

describe("palette", () => {
  it("is brightest at noon and never pitch black at night", () => {
    const noon = skyAt(12 * 60);
    const night = skyAt(0);
    expect(luma(noon.horizon)).toBeGreaterThan(luma(night.horizon));
    expect(noon.sunIntensity).toBeGreaterThan(night.sunIntensity);
    expect(night.ambientIntensity).toBeGreaterThan(0.8);
    expect(luma(night.ambientSky)).toBeGreaterThan(0.3);
    expect(night.stars).toBe(1);
    expect(noon.stars).toBe(0);
  });

  it("blushes rose at dawn and glows orange at sunset", () => {
    const dawn = skyAt(6.3 * 60).horizon;
    const sunset = skyAt(18 * 60).horizon;
    expect(dawn[0]).toBeGreaterThan(dawn[2]);
    expect(sunset[0]).toBeGreaterThan(sunset[1]);
    expect(sunset[1]).toBeGreaterThan(sunset[2]);
  });

  it("blends smoothly, including across midnight", () => {
    expect(skyAt(0)).toEqual(skyAt(24 * 60));
    for (let m = 0; m < 1440; m += 5) {
      const a = skyAt(m);
      const b = skyAt(m + 5);
      expect(Math.abs(a.sunIntensity - b.sunIntensity)).toBeLessThan(0.25);
      expect(Math.abs(luma(a.horizon) - luma(b.horizon))).toBeLessThan(0.08);
    }
  });

  it("greys and dims the day under cloud and rain, and pales it in mist", () => {
    const clear = skyAt(12 * 60);
    const calm = withWeather(clear, { cloud: 0, rain: 0, fog: 0 });
    expect(calm).toEqual(clear);
    const rain = withWeather(clear, { cloud: 0.9, rain: 1, fog: 0 });
    expect(rain.sunIntensity).toBeLessThan(clear.sunIntensity * 0.3);
    expect(luma(rain.zenith)).toBeLessThan(luma(clear.zenith));
    const mist = withWeather(clear, { cloud: 0, rain: 0, fog: 1 });
    const spread = (c: RGB) => Math.max(...c) - Math.min(...c);
    expect(spread(mist.horizon)).toBeLessThan(spread(clear.horizon));
    // Bad numbers don't break the colours.
    expect(withWeather(clear, { cloud: NaN, rain: -1, fog: 3 }).sunIntensity).toBeGreaterThan(0);
  });

  it("moves the sun from east to west through the south, and the moon by night", () => {
    const rise = sunDirection(6 * 60);
    const noon = sunDirection(12 * 60);
    const set = sunDirection(18 * 60);
    expect(rise.x).toBeGreaterThan(0.8);
    expect(rise.elevation).toBeCloseTo(0);
    expect(noon.elevation).toBeGreaterThan(0.8);
    expect(noon.z).toBeGreaterThan(0);
    expect(set.x).toBeLessThan(-0.8);
    expect(sunDirection(0).elevation).toBeLessThan(0);
    expect(moonDirection(0).elevation).toBeGreaterThan(0.8);
    for (const d of [rise, noon, set, moonDirection(3 * 60)]) expect(Math.hypot(d.x, d.y, d.z)).toBeCloseTo(1);
  });
});

describe("puppets", () => {
  it("swings legs and arms in opposition while walking", () => {
    const j = poseJoints("person", "walk", 0, Math.PI / 2, 0);
    expect(j.legLPitch).toBeCloseTo(-j.legRPitch);
    expect(Math.sign(j.armLPitch)).toBe(-Math.sign(j.legLPitch));
  });

  it("kneels with knees down and hands together, sits with legs forward, sleeps lying down", () => {
    const kneel = poseJoints("person", "kneel", 0, 0, 0);
    expect(kneel.hipsY).toBeLessThan(-6);
    expect(kneel.legLPitch).toBeGreaterThan(1);
    expect(kneel.armLRoll).toBeLessThan(0);
    expect(kneel.armRRoll).toBeGreaterThan(0);
    expect(kneel.headPitch).toBeGreaterThan(0.2);
    const sit = poseJoints("person", "sit", 0, 0, 0);
    expect(sit.legLPitch).toBeLessThan(-1);
    expect(poseJoints("person", "sleep", 0, 0, 0).hipsPitch).toBeCloseTo(-Math.PI / 2);
    expect(poseJoints("person", "work", 0, 0, 0).torsoPitch).toBeGreaterThan(0.2);
  });

  it("breathes a little while standing", () => {
    const a = poseJoints("person", "stand", 0, 0, 0).breath;
    const b = poseJoints("person", "stand", 0.8, 0, 0).breath;
    expect(a).not.toBe(b);
    expect(Math.abs(a - 1)).toBeLessThan(0.05);
  });

  it("makes children shorter than grown-ups, and sheep shorter still", () => {
    expect(puppetHeight("child")).toBeLessThan(puppetHeight("person"));
    expect(puppetHeight("sheep")).toBeLessThan(puppetHeight("child"));
    expect(puppetHeight("person")).toBeCloseTo(1.65, 1);
  });

  it("turns the short way round", () => {
    expect(angleDelta(0.1, -0.1)).toBeCloseTo(-0.2);
    expect(angleDelta(3, -3)).toBeCloseTo(2 * Math.PI - 6);
    expect(angleDelta(-3, 3)).toBeCloseTo(6 - 2 * Math.PI);
  });
});

describe("textures and markers", () => {
  it("paints the same 16x16 pixels every time", () => {
    const a = paintPixels("grass");
    expect(a.length).toBe(TEXTURE_SIZE * TEXTURE_SIZE * 4);
    expect(paintPixels("grass")).toEqual(a);
    expect(paintPixels("stone")).not.toEqual(a);
  });

  it("leaves holes in the fishing net", () => {
    const net = paintPixels("net");
    let open = 0;
    for (let i = 3; i < net.length; i += 4) if (net[i] === 0) open++;
    expect(open).toBeGreaterThan(64);
    expect(open).toBeLessThan(256);
  });

  it("colours activity rings by the need they feed, like the meters", () => {
    expect(activityColor("pray")).not.toBe(activityColor("sleep"));
    expect(activityColor("read")).not.toBe(activityColor("pray"));
    expect(activityColor("something-new")).toBe(0xf2d68a);
    for (const id of ["pray", "read", "listen", "meal", "nets", "water", "shade", "sleep"]) {
      expect(activityColor(id)).toBeGreaterThan(0);
      expect(activityColor(id)).toBeLessThanOrEqual(0xffffff);
    }
  });
});
