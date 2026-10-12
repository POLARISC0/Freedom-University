import * as THREE from "three";
import type { Look } from "@/content/world";
import {
  AVATAR_COLORS,
  avatarGeometry,
  birdGeometry,
  bubbleTexture,
  cityBlocks,
  glass,
  hexGeometry,
  hexTiles,
  ink,
  instanced,
  type Item,
  pick,
  place,
  rainbowTorus,
  ribbons,
  seeded,
  seedOf,
  solid,
  strokes,
  tubes,
  type Updater,
  V3,
} from "./kit";
import { hudRing } from "./lines";

/** The surroundings you fly into. Everything in it fades in and out with `materials`. */
export type Env = { root: THREE.Group; materials: THREE.Material[]; update: Updater };

const BOX = new THREE.BoxGeometry(1, 1, 1);
/** Where the camera sits and looks, relative to a district it has flown into: close, with the district left of centre. */
export const FLY_CAMERA = new V3(1.4, 2.0, 7.0);
export const FLY_TARGET = new V3(1.9, 1.0, 0);
const CAMERA_SPOT = FLY_CAMERA;

export function buildEnvironment(look: Look): Env {
  const root = new THREE.Group();
  const materials: THREE.Material[] = [];
  const r = seeded(seedOf(look) + 3);
  const fade = <M extends THREE.Material>(m: M): M => {
    materials.push(m);
    return m;
  };
  const anywhere = (w: number, h: number, d: number) => new V3((r() - 0.5) * w, (r() - 0.5) * h, (r() - 0.5) * d);
  const clearOfCamera = (p: THREE.Vector3, room = 3.5) => p.distanceTo(CAMERA_SPOT) > room;
  const lines = (points: THREE.Vector3[], color: string, opacity: number) =>
    new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(points), fade(new THREE.LineBasicMaterial({ color, opacity })));
  /** Moving linework added alongside each look's own animation. */
  const extras: Updater[] = [];
  let update: Updater = () => {};

  if (look === "shards") {
    // Nova: huge white strands sweeping out past you, shards flying outward, drifting blue panes.
    const core = new V3(0, 1.25, 0);
    const burst = (count: number, reach: number, curl: number) =>
      Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2 + r() * 0.3;
        const dir = new V3(Math.cos(a), (r() - 0.35) * 1.4, Math.sin(a)).normalize();
        const bend = new V3(-Math.sin(a), r() - 0.5, Math.cos(a)).multiplyScalar((r() - 0.5) * curl);
        const len = dir.z > 0.5 ? 3 + r() * 2 : reach * (0.5 + r() * 0.7);
        const start = core.clone().addScaledVector(dir, 2.4);
        return new THREE.CatmullRomCurve3([0, 0.35, 0.7, 1].map((k) => start.clone().addScaledVector(dir, len * k).addScaledVector(bend, k * k)));
      });
    const sweepShape = ribbons(burst(64, 14, 7), 0.6, 3);
    const sweep = new THREE.Group();
    sweep.add(
      new THREE.Mesh(sweepShape.geo, fade(solid("#ffffff", { side: THREE.DoubleSide }))),
      new THREE.LineSegments(sweepShape.edges, fade(ink(0.6))),
      new THREE.LineSegments(strokes(burst(90, 12, 8)), fade(ink(0.4))),
    );
    const shards = Array.from({ length: 260 }, () => ({ v: anywhere(2, 1.4, 2).normalize().multiplyScalar(0.6 + r() * 1.4), item: { p: anywhere(30, 16, 26), r: new THREE.Euler(r() * 6, r() * 6, 0), s: new V3(1, 1, 1).multiplyScalar(0.4 + r() * 1.2) } as Item }));
    const flying = instanced(new THREE.TetrahedronGeometry(0.16), fade(solid()), shards.map((s) => s.item));
    const panes = instanced(new THREE.PlaneGeometry(1.2, 0.75), fade(glass("#3E9BFF", 0.7)), Array.from({ length: 30 }, () => ({ p: anywhere(34, 14, 24), r: new THREE.Euler(0, r() * 6, (r() - 0.5) * 0.5) })));
    const rays: THREE.Vector3[] = [];
    for (let i = 0; i < 50; i++) {
      const d = anywhere(2, 1.6, 2).normalize();
      rays.push(core.clone().addScaledVector(d, 3), core.clone().addScaledVector(d, 14 + r() * 10));
    }
    root.add(sweep, flying, panes, lines(rays, "#1E2C4A", 0.25));
    update = (t, dt) => {
      sweep.rotation.y = t * 0.03;
      shards.forEach((s, i) => {
        s.item.p.addScaledVector(s.v, dt);
        if (s.item.p.length() > 22) s.item.p.copy(core).add(anywhere(4, 2, 4));
        s.item.r!.x += dt * 0.6;
        s.item.r!.y += dt * 0.4;
        place(flying, i, s.item);
      });
      flying.instanceMatrix.needsUpdate = true;
    };
  } else if (look === "hexcity") {
    // Atlas: dozens of floating city plates at every depth, with coloured rings turning between them.
    const tiles: Item[] = [];
    const debris: Item[] = [];
    const blocks: Item[] = [];
    for (let i = 0; i < 20; i++) {
      const at = anywhere(36, 14, 30);
      if (at.length() < 5) at.setLength(5 + r() * 3);
      if (!clearOfCamera(at, 5)) at.z -= 12;
      const p = hexTiles({ rings: 1 + Math.floor(r() * 3), tint: "#C3C8D0", accent: pick(r, ["#3DFF8F", "#FFC400", "#B46CFF", "#FF3D8B"]), seed: 100 + i, at });
      tiles.push(...p.tiles);
      debris.push(...p.debris);
      blocks.push(...cityBlocks(p.tops, r, 0.8, 0.7));
    }
    const tileMat = fade(solid());
    const city = new THREE.Group();
    city.add(instanced(hexGeometry(), tileMat, tiles), instanced(hexGeometry(), tileMat, debris), instanced(BOX, fade(solid()), blocks));
    const ringItems = Array.from({ length: 14 }, (_, i) => ({ p: anywhere(30, 12, 24), r: new THREE.Euler(r() * 6, r() * 6, 0), s: new V3(1, 1, 1).multiplyScalar(0.6 + r() * 1.4), c: new THREE.Color(["#FF5A1F", "#FFC400", "#FF3D8B", "#3DFF8F"][i % 4]) }) as Item);
    const rings = instanced(new THREE.TorusGeometry(1.2, 0.03, 6, 64), fade(new THREE.MeshBasicMaterial({ opacity: 0.9 })), ringItems);
    root.add(city, rings);
    for (const [radius, x, y, z, rx, ry] of [[7, 0, 1.5, -2, -0.4, 0.3], [11, -3, 3, -8, -0.15, -0.5], [15, 6, 5, -14, 0.1, 0.4]]) {
      const hud = hudRing({ radius, seed: radius, text: "D-02/ATL · BANKING & THE SYSTEM · RESERVES · RATES · SETTLEMENT · " });
      hud.group.position.set(x, y, z);
      hud.group.rotation.set(rx, ry, 0);
      hud.materials.forEach(fade);
      root.add(hud.group);
      extras.push(hud.update);
    }
    update = (t, dt) => {
      city.rotation.y = t * 0.012;
      ringItems.forEach((it, i) => {
        it.r!.x += dt * 0.3 * (i % 2 ? 1 : -1);
        it.r!.y += dt * 0.2;
        place(rings, i, it);
      });
      rings.instanceMatrix.needsUpdate = true;
    };
  } else if (look === "transit") {
    // Sterling: a corridor of glass slats streaking past on every wall, with pods racing through.
    const palette = ["#FFFFFF", "#FFFFFF", "#FFFFFF", "#E2FAEE", "#BDF3DA", "#5ED9A2", "#19C37D", "#0E6B5A", "#0B3D33"];
    const lanes = Array.from({ length: 360 }, () => {
      const wall = Math.floor(r() * 3);
      const p = wall === 0 ? new V3(0, 3.2 + r() * 4, (r() - 0.5) * 16) : wall === 1 ? new V3(0, -2.5 - r() * 4, (r() - 0.5) * 16) : new V3(0, (r() - 0.5) * 7, -4 - r() * 6);
      p.x = (r() - 0.5) * 44;
      return { v: 4 + r() * 12, item: { p, s: new V3(2 + r() * 10, 0.03 + r() * 0.12, wall === 2 ? 0.05 : 0.2 + r() * 1.4), c: new THREE.Color(pick(r, palette)) } as Item };
    });
    const streaks = instanced(BOX, fade(glass("#ffffff", 0.75, true)), lanes.map((l) => l.item));
    const pods = Array.from({ length: 8 }, () => ({ v: 6 + r() * 8, item: { p: new V3((r() - 0.5) * 44, -1.5 + r() * 5, -2 - r() * 4), r: new THREE.Euler(0, 0, Math.PI / 2), s: new V3(1, 1.4 + r() * 2, 1) } as Item }));
    const capsules = instanced(new THREE.CapsuleGeometry(0.25, 1, 4, 16), fade(glass("#BFF5DD", 0.6)), pods.map((p) => p.item));
    const rules: THREE.Vector3[] = [];
    for (let i = 0; i < 70; i++) {
      const y = (r() - 0.5) * 12;
      const z = -3 - r() * 8;
      const x0 = -22 + r() * 10;
      rules.push(new V3(x0, y, z), new V3(x0 + 20 + r() * 24, y, z));
    }
    root.add(streaks, capsules, lines(rules, "#0E6B5A", 0.35));
    const run = (list: { v: number; item: Item }[], mesh: THREE.InstancedMesh, dt: number) => {
      list.forEach((l, i) => {
        l.item.p.x += l.v * dt;
        if (l.item.p.x > 22) l.item.p.x = -22;
        place(mesh, i, l.item);
      });
      mesh.instanceMatrix.needsUpdate = true;
    };
    update = (t, dt) => {
      run(lanes, streaks, dt);
      run(pods, capsules, dt);
    };
  } else if (look === "sky") {
    // Sage: a giant fan of golden curves across the sky, a flock flying along it, pink lines low down, bubbles rising.
    const root0 = new V3(-14, -5, -7);
    const fan = Array.from({ length: 44 }, (_, i) => {
      const k = i / 43;
      return new THREE.QuadraticBezierCurve3(root0, new V3(-4 + k * 6, 9 + k * 4, -11 + k * 6), new V3(13 + k * 3, -2 + k * 13, 3 - k * 14));
    });
    const low = Array.from({ length: 10 }, (_, i) => new THREE.QuadraticBezierCurve3(new V3(-16, -6 + i * 0.25, 2), new V3(0, -1 - i * 0.4, 4 - i * 0.6), new V3(16, -5 + i * 0.5, -2)));
    const flock = Array.from({ length: 60 }, (_, i) => ({ curve: fan[(i * 7) % fan.length], off: r(), speed: 0.012 + r() * 0.015, item: { p: new V3(), c: new THREE.Color(i % 4 ? "#F2C230" : "#FFFFFF") } as Item }));
    const birds = instanced(birdGeometry(0.4), fade(new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })), flock.map((f) => f.item));
    const rising = Array.from({ length: 140 }, () => ({ item: { p: anywhere(34, 18, 24), s: new V3(1, 1, 1).multiplyScalar(0.04 + r() * 0.14) } as Item, v: 0.2 + r() * 0.5 }));
    const bubbles = instanced(new THREE.SphereGeometry(1, 10, 8), fade(solid()), rising.map((b) => b.item));
    for (const [radius, y] of [[7, 3], [10.5, 4.5]]) {
      const circle = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(new THREE.EllipseCurve(0, 0, radius, radius).getPoints(200)), fade(new THREE.LineBasicMaterial({ color: "#ffffff", opacity: 0.9 })));
      circle.position.set(-2, y, -9);
      root.add(circle);
    }
    root.add(new THREE.Mesh(tubes(fan, 0.025, 64), fade(new THREE.MeshBasicMaterial({ color: "#E2A400" }))), new THREE.Mesh(tubes(low, 0.02, 64), fade(new THREE.MeshBasicMaterial({ color: "#FF8A7A" }))), birds, bubbles);
    const fly = new THREE.Object3D();
    const ahead = new V3();
    update = (t, dt) => {
      flock.forEach((f, i) => {
        const u = (t * f.speed + f.off) % 1;
        fly.position.copy(f.curve.getPointAt(u));
        fly.lookAt(ahead.copy(fly.position).add(f.curve.getTangentAt(u)));
        fly.scale.set(1, Math.sin(t * 8 + i * 1.3), 1);
        fly.updateMatrix();
        birds.setMatrixAt(i, fly.matrix);
      });
      birds.instanceMatrix.needsUpdate = true;
      rising.forEach((b, i) => {
        b.item.p.y += b.v * dt;
        if (b.item.p.y > 9) b.item.p.y = -9;
        place(bubbles, i, b.item);
      });
      bubbles.instanceMatrix.needsUpdate = true;
    };
  } else if (look === "stack") {
    // Trading Floor: a vortex of slabs around you, turning in bands, crowded with avatars, walled by glass hexagons.
    const blues = ["#6F7DFF", "#8E9BFF", "#AAB6FF", "#5E6CF0", "#8FD8FF", "#C5CEFF"];
    const slabMat = fade(glass("#ffffff", 0.7, true));
    const crowdMat = fade(solid());
    const bubbleMat = fade(new THREE.PointsMaterial({ map: bubbleTexture(), size: 0.5, depthWrite: false, alphaTest: 0.05 }));
    const bands = [0.05, -0.035, 0.025, -0.06].map((speed) => {
      const items: Item[] = [];
      while (items.length < 380) {
        const y = -5 + 16 * r() ** 1.4;
        const a = r() * Math.PI * 2;
        const rad = 4.5 + r() * 10;
        const p = new V3(Math.cos(a) * rad, y, Math.sin(a) * rad);
        if (rad > 6 && rad < 11 && y > 0.5 && y < 4.7) continue; // the camera's orbit
        items.push({ p, r: new THREE.Euler((r() - 0.5) * 0.3, -a - Math.PI / 2 + (r() - 0.5) * 0.6, 0), s: new V3(0.5 + r() * 1.6, 0.04 + r() * 0.06, 0.15 + r() * 0.4), c: new THREE.Color(pick(r, blues)) });
      }
      const riders = Array.from({ length: 80 }, () => ({ p: pick(r, items).p.clone().add(new V3(0, 0.04, 0)), c: new THREE.Color(pick(r, AVATAR_COLORS)) }));
      const talk = new THREE.BufferGeometry().setFromPoints(riders.slice(0, 10).map((x) => x.p.clone().add(new V3(0, 0.4, 0))));
      const band = new THREE.Group();
      band.add(instanced(BOX, slabMat, items), instanced(avatarGeometry().scale(1.6, 1.6, 1.6), crowdMat, riders), new THREE.Points(talk, bubbleMat));
      root.add(band);
      return { band, speed };
    });
    // Translucent glass hexagons standing in a wide ring, like the walls of the floor.
    const hexes = Array.from({ length: 26 }, (_, i) => {
      const a = (i / 26) * Math.PI * 2 + r() * 0.1;
      const rad = 15 + r() * 3;
      return { p: new V3(Math.cos(a) * rad, -3 + r() * 9, Math.sin(a) * rad), r: new THREE.Euler(0, -a + Math.PI / 2, 0), s: new V3(1, 1, 1).multiplyScalar(1 + r() * 1.2) } as Item;
    });
    const hexShape = new THREE.CircleGeometry(1.6, 6);
    const panes = instanced(hexShape, fade(new THREE.MeshBasicMaterial({ color: "#B9C8FF", opacity: 0.28, side: THREE.DoubleSide, depthWrite: false })), hexes);
    const rims = new THREE.LineSegments(
      new THREE.BufferGeometry().setFromPoints(
        hexes.flatMap((h) => {
          const m = new THREE.Matrix4().compose(h.p, new THREE.Quaternion().setFromEuler(h.r!), h.s!);
          const corners = Array.from({ length: 6 }, (_, k) => new V3(Math.cos((k / 6) * Math.PI * 2) * 1.6, Math.sin((k / 6) * Math.PI * 2) * 1.6, 0).applyMatrix4(m));
          return corners.flatMap((c, k) => [c, corners[(k + 1) % 6]]);
        }),
      ),
      fade(new THREE.LineBasicMaterial({ color: "#6E86FF", opacity: 0.7 })),
    );
    const railMat = fade(new THREE.MeshBasicMaterial({ color: "#3FD4FF", opacity: 0.8 }));
    for (let k = 0; k < 6; k++) {
      const railRing = new THREE.Mesh(new THREE.TorusGeometry(6 + k * 2, 0.03 + (k % 2) * 0.03, 6, 160), railMat);
      railRing.rotation.x = Math.PI / 2;
      railRing.position.y = -1.2 + (k % 3) * 0.25;
      root.add(railRing);
    }
    root.add(panes, rims);
    update = (t) => bands.forEach((b) => (b.band.rotation.y = t * b.speed));
  } else if (look === "arena") {
    // Community Square: rainbow rings around tiers of stands packed with a crowd.
    const rings = Array.from({ length: 6 }, (_, i) => {
      const ring = rainbowTorus(5 + i * 2.2, 0.08 + i * 0.02, 0.9);
      ring.rotation.x = Math.PI / 2 + (i % 2 ? 0.15 : -0.15);
      fade(ring.material as THREE.Material);
      return ring;
    });
    const stands: Item[] = [];
    const seats: Item[] = [];
    for (let k = 0; k < 5; k++) {
      const n = 120 + k * 30;
      const rad = 7 + k * 1.5;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const p = new V3(Math.cos(a) * rad, -3 + k * 0.7, Math.sin(a) * rad);
        stands.push({ p, r: new THREE.Euler(0, -a - Math.PI / 2, 0), s: new V3(((rad * Math.PI * 2) / n) * 0.8, 0.5, 1.2), c: new THREE.Color().setHSL(i / n, 0.9, 0.78) });
        if (r() < 0.6) seats.push({ p: p.clone().add(new V3(0, 0.25, 0)), c: new THREE.Color(pick(r, AVATAR_COLORS)) });
      }
    }
    const crowd = new THREE.Group();
    crowd.add(instanced(BOX, fade(solid()), stands), instanced(avatarGeometry().scale(3, 3, 3), fade(solid()), seats));
    root.add(...rings, crowd);
    update = (t) => {
      rings.forEach((ring, i) => (ring.rotation.z = t * 0.1 * (i % 2 ? 1 : -1)));
      crowd.rotation.y = t * 0.02;
    };
  } else if (look === "wing") {
    // Shop: hundreds of white feathers bursting toward you through a huge rainbow ring.
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.quadraticCurveTo(0.3, 1, 0, 2.2);
    shape.quadraticCurveTo(-0.2, 1, 0, 0);
    const feathers = Array.from({ length: 220 }, () => ({ v: new V3((r() - 0.5) * 0.5, (r() - 0.5) * 0.3, 3 + r() * 4), item: { p: anywhere(30, 16, 26), r: new THREE.Euler(r() * 6, r() * 6, r() * 6), s: new V3(1, 1, 1).multiplyScalar(0.4 + r() * 0.8) } as Item }));
    const flock = instanced(new THREE.ShapeGeometry(shape), fade(solid("#ffffff", { side: THREE.DoubleSide })), feathers.map((f) => f.item));
    const ring = rainbowTorus(7, 0.12, 0.9);
    fade(ring.material as THREE.Material);
    root.add(flock, ring);
    update = (t, dt) => {
      ring.rotation.z = t * 0.15;
      feathers.forEach((f, i) => {
        f.item.p.addScaledVector(f.v, dt);
        if (f.item.p.z > 13 || !clearOfCamera(f.item.p, 2)) f.item.p.set((r() - 0.5) * 30, (r() - 0.5) * 16, -13);
        f.item.r!.z += dt * 0.5;
        place(flock, i, f.item);
      });
      flock.instanceMatrix.needsUpdate = true;
    };
  }

  materials.forEach((m) => {
    m.transparent = true;
    m.userData.full = m.opacity;
    m.opacity = 0;
  });
  root.visible = false;
  const all = [update, ...extras];
  return { root, materials, update: (t, dt) => all.forEach((u) => u(t, dt)) };
}
