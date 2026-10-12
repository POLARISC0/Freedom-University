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
  merge,
  paintedTexture,
  pick,
  place,
  RAINBOW,
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

export type Island = { group: THREE.Group; update: Updater };

/** Marks a part of an island that lifts and spreads out when its district blooms open on hover. */
function layer<T extends THREE.Object3D>(o: T, lift: number, spread = 1): T {
  o.userData.bloom = { lift, spread };
  return o;
}

function holder(lift: number, spread: number, ...children: THREE.Object3D[]): THREE.Group {
  const g = layer(new THREE.Group(), lift, spread);
  g.add(...children);
  return g;
}

const BOX = new THREE.BoxGeometry(1, 1, 1);
const turn = (r: () => number) => new THREE.Euler(r() * 6, r() * 6, r() * 6);
const grow = (k: number) => new V3(k, k, k);

/** Each district is a dense cluster of tiny parts, most of them standing on a crumbling hex plate. */
export function buildIsland(look: Look, color: string): Island {
  const g = new THREE.Group();
  const r = seeded(seedOf(look));
  let update: Updater = () => {};
  const plate = (tint: string, rings: number, accent = color) => {
    const p = hexTiles({ rings, tint, accent, seed: seedOf(look) + rings });
    const mat = solid();
    g.add(layer(instanced(hexGeometry(), mat, p.tiles), -0.15, 1.14), layer(instanced(hexGeometry(), mat, p.debris), -0.6, 1.45));
    return p;
  };

  if (look === "shards") {
    // Nova: a burst of white strands, shards and small blue panes over a pale blue plate.
    plate("#7DBBFF", 5);
    // The burst erupts from the middle of the plate.
    const core = new V3(0, 0.3, 0);
    const burstCurves = (count: number, reach: number, curl: number) =>
      Array.from({ length: count }, (_, i) => {
        const a = (i / count) * Math.PI * 2 + r() * 0.5;
        const dir = new V3(Math.cos(a), 0.25 + r() * 1.3, Math.sin(a)).normalize();
        const bend = new V3(-Math.sin(a), (r() - 0.5) * 0.6, Math.cos(a)).multiplyScalar((r() - 0.5) * curl);
        const len = reach * (0.6 + r() * 0.8);
        return new THREE.CatmullRomCurve3([0, 0.35, 0.7, 1].map((k) => core.clone().addScaledVector(dir, len * k).addScaledVector(bend, k * k)));
      });
    const burstShape = ribbons(burstCurves(36, 2.6, 1.8), 0.2, 2.4);
    const strands = new THREE.Mesh(burstShape.geo, solid("#ffffff", { side: THREE.DoubleSide }));
    strands.add(new THREE.LineSegments(burstShape.edges, ink()));
    const hair = new THREE.LineSegments(strokes(burstCurves(44, 2.2, 2.4)), ink(0.4));
    const around = (min: number, max: number) => new V3(r() - 0.5, 0.2 + r() * 0.8, r() - 0.5).normalize().multiplyScalar(min + r() * (max - min)).add(core);
    const shards = instanced(
      new THREE.TetrahedronGeometry(0.1),
      solid(),
      Array.from({ length: 70 }, () => ({ p: around(0.8, 2.8), r: turn(r), s: grow(0.5 + r() * 1.4) })),
    );
    const panes = instanced(new THREE.PlaneGeometry(0.42, 0.26), glass("#3E9BFF", 0.75), Array.from({ length: 12 }, () => ({ p: around(1.2, 2.6), r: new THREE.Euler(0, r() * 6, (r() - 0.5) * 0.4) })));
    const burst = new THREE.Group();
    burst.add(strands, hair, shards, panes);
    g.add(holder(0.35, 1.12, burst));
    update = (t) => {
      burst.rotation.y = t * 0.1;
    };
  }

  if (look === "hexcity") {
    // Atlas: a city of tiny towers on a grey hex plate, two broken-off plates and turning rings.
    const { tops } = plate("#C3C8D0", 6);
    g.add(layer(instanced(BOX, solid(), cityBlocks(tops, r)), 0.1, 1.04));
    const band: Item[] = [];
    for (let i = 0; i < 46; i++) {
      if (i % 9 === 8) continue;
      const a = -0.6 + i * 0.085;
      band.push({ p: new V3(Math.cos(a) * 2.5, 0.06, Math.sin(a) * 2.5), r: new THREE.Euler(0, -a, 0), s: new V3(0.07, 0.05, 0.17), c: new THREE.Color(i % 2 ? "#2F6BFF" : "#9CC0FF") });
    }
    g.add(layer(instanced(BOX, solid(), band), -0.05, 1.1));
    for (const [x, y, z] of [[2.9, -0.5, -1.4], [-2.7, 0.35, 1.5]]) {
      const sat = hexTiles({ rings: 2, tint: "#C3C8D0", seed: seedOf(look) + Math.round(x * 10) });
      const tiles = instanced(hexGeometry(), solid(), sat.tiles);
      const city = instanced(BOX, solid(), cityBlocks(sat.tops, r, 0.7, 0.6));
      const piece = holder(-0.2, 1.3, tiles, city);
      piece.position.set(x, y, z);
      g.add(piece);
    }
    const rings = ["#FF5A1F", "#FFC400", "#FF3D8B"].map((c, i) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(2.8 + i * 0.32, 0.025, 8, 128), new THREE.MeshBasicMaterial({ color: c }));
      ring.rotation.x = Math.PI / 2 + (i - 1) * 0.35;
      ring.position.y = 1.1;
      return ring;
    });
    g.add(holder(0.6, 1.08, ...rings));
    update = (t) => rings.forEach((ring, i) => (ring.rotation.z = t * (0.25 + i * 0.1) * (i % 2 ? -1 : 1)));
  }

  if (look === "transit") {
    // Sterling: a stack of green and white glass slats sliding past each other, with glass pods.
    plate("#9BE8C4", 4);
    const palette = ["#FFFFFF", "#FFFFFF", "#FFFFFF", "#E2FAEE", "#BDF3DA", "#5ED9A2", "#19C37D", "#0E6B5A"];
    const slats = Array.from({ length: 150 }, () => ({
      x: (r() - 0.5) * 3.2,
      amp: 0.15 + r() * 0.8,
      speed: 0.3 + r() * 0.9,
      phase: r() * 6,
      item: { p: new V3(0, 0.25 + Math.floor(r() * 22) * 0.1, (r() - 0.5) * 1.8), s: new V3(0.3 + r() ** 1.5 * 3, 0.02 + r() * 0.05, 0.12 + r() * 0.75), c: new THREE.Color(pick(r, palette)) } as Item,
    }));
    const stack = instanced(BOX, glass("#ffffff", 0.78, true), slats.map((s) => s.item));
    const pods = [0, 1, 2].map((i) => {
      const pod = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 1.3, 4, 16), glass("#BFF5DD", 0.55));
      pod.rotation.z = Math.PI / 2;
      pod.position.set(0, 0.6 + i * 0.75, (i - 1) * 0.55);
      return pod;
    });
    g.add(holder(0.25, 1.08, stack, ...pods));
    update = (t) => {
      slats.forEach((s, i) => {
        s.item.p.x = s.x + Math.sin(t * s.speed + s.phase) * s.amp;
        place(stack, i, s.item);
      });
      stack.instanceMatrix.needsUpdate = true;
      pods.forEach((p, i) => (p.position.x = Math.sin(t * 0.5 + i * 2) * 0.9));
    };
  }

  if (look === "sky") {
    // Sage: a fan of golden curves sweeping over a small plate, birds flying along them, white bubbles.
    plate("#FFE2A6", 4);
    const root = new V3(-2.3, 0.15, 0.6);
    const fan = Array.from({ length: 22 }, (_, i) => {
      const k = i / 21;
      return new THREE.QuadraticBezierCurve3(root, new V3(-0.6 + k * 0.8, 2.4 + k * 1.3, -0.9 + k * 1.2), new V3(2.5 + k * 0.4, 0.5 + k * 2.6, 1.4 - k * 2.4));
    });
    const flock = Array.from({ length: 16 }, (_, i) => ({ curve: fan[(i * 5) % fan.length], off: r(), speed: 0.04 + r() * 0.04, item: { p: new V3(), c: new THREE.Color(i % 3 ? "#F2C230" : "#FFFFFF") } as Item }));
    const birds = instanced(birdGeometry(), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), flock.map((f) => f.item));
    const bubbles = instanced(
      new THREE.SphereGeometry(1, 10, 8),
      solid(),
      Array.from({ length: 26 }, () => ({ p: new V3(1.2 + r() * 1.6, 0.4 + r() * 2.2, -0.6 + r() * 1.4), s: grow(0.025 + r() * 0.06) })),
    );
    g.add(holder(0.3, 1.1, new THREE.Mesh(tubes(fan, 0.012), new THREE.MeshBasicMaterial({ color: "#E2A400" })), birds, bubbles));
    const fly = new THREE.Object3D();
    const ahead = new V3();
    update = (t) => {
      flock.forEach((f, i) => {
        const u = (t * f.speed + f.off) % 1;
        fly.position.copy(f.curve.getPointAt(u));
        fly.lookAt(ahead.copy(fly.position).add(f.curve.getTangentAt(u)));
        fly.scale.set(1, Math.sin(t * 9 + i * 1.7), 1);
        fly.updateMatrix();
        birds.setMatrixAt(i, fly.matrix);
      });
      birds.instanceMatrix.needsUpdate = true;
    };
  }

  if (look === "stack") {
    // Trading Floor: a whirling tower of hundreds of blue slabs, with tiny avatars riding them and talking.
    plate("#9FB0FF", 6);
    const blues = ["#6F7DFF", "#8E9BFF", "#AAB6FF", "#5E6CF0", "#8FD8FF", "#C5CEFF"];
    const slab = (y: number, rad: number, spin: number, tilt: number, size: THREE.Vector3) => ({
      a: r() * Math.PI * 2,
      rad,
      y,
      spin,
      tilt,
      skew: (r() - 0.5) * 0.6,
      item: { p: new V3(), r: new THREE.Euler(), s: size, c: new THREE.Color(pick(r, blues)) } as Item,
    });
    const slabs = Array.from({ length: 420 }, () => {
      const y = 4.4 * r() ** 1.7;
      return slab(0.12 + y, (0.25 + 2.2 * (1 - y / 4.8) ** 1.3) * (0.45 + r() * 0.65), 0.12 + (1 - y / 4.8) * 0.25, (r() - 0.5) * 0.3, new V3(0.22 + r() * 0.55, 0.025 + r() * 0.03, 0.08 + r() * 0.16));
    });
    for (let i = 0; i < 60; i++) slabs.push(slab(4.6 + r() * 0.7, r() * 0.45, 0.5, (r() - 0.5) * 1.2, new V3(0.12 + r() * 0.18, 0.02, 0.05 + r() * 0.08)));
    const tower = instanced(BOX, glass("#ffffff", 0.72, true), slabs.map((s) => s.item));
    const swirl = slabs.slice(0, 420);
    const riders = Array.from({ length: 90 }, () => ({ on: pick(r, swirl), item: { p: new V3(), c: new THREE.Color(pick(r, AVATAR_COLORS)) } as Item }));
    const crowd = instanced(avatarGeometry(), solid(), riders.map((x) => x.item));
    const talking = 22;
    const bubbleGeo = new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(talking * 3), 3));
    const bubbles = new THREE.Points(bubbleGeo, new THREE.PointsMaterial({ map: bubbleTexture(), size: 0.32, transparent: true, depthWrite: false, alphaTest: 0.05 }));
    bubbles.frustumCulled = false;
    g.add(holder(0.4, 1.12, tower, crowd, bubbles));
    const ring = rainbowTorus(3.4, 0.08);
    ring.rotation.x = Math.PI / 2.2;
    ring.position.y = 1.4;
    g.add(layer(ring, 0.5, 1.06));
    update = (t, dt) => {
      ring.rotation.z = t * 0.35;
      slabs.forEach((s, i) => {
        s.a += dt * s.spin;
        s.item.p.set(Math.cos(s.a) * s.rad, s.y + Math.sin(t * 0.8 + i) * 0.03, Math.sin(s.a) * s.rad);
        s.item.r!.set(s.tilt, -s.a - Math.PI / 2 + s.skew, 0);
        place(tower, i, s.item);
      });
      tower.instanceMatrix.needsUpdate = true;
      const at = bubbleGeo.attributes.position as THREE.BufferAttribute;
      riders.forEach((x, i) => {
        x.item.p.copy(x.on.item.p).y += 0.02;
        place(crowd, i, x.item);
        if (i < talking) at.setXYZ(i, x.item.p.x, x.item.p.y + 0.26, x.item.p.z);
      });
      crowd.instanceMatrix.needsUpdate = true;
      at.needsUpdate = true;
    };
  }

  if (look === "arena") {
    // Community Square: three tiers of rainbow stands around a painted floor, a small crowd, a rainbow ring.
    plate("#FFC8E4", 5);
    const stands: Item[] = [];
    const seats: THREE.Vector3[] = [];
    [0, 1, 2].forEach((k) => {
      const n = 40 + k * 12;
      const rad = 1.25 + k * 0.3;
      const h = 0.08 + k * 0.08;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        stands.push({ p: new V3(Math.cos(a) * rad, 0.05 + h / 2, Math.sin(a) * rad), r: new THREE.Euler(0, -a - Math.PI / 2, 0), s: new V3(((rad * Math.PI * 2) / n) * 0.85, h, 0.22), c: RAINBOW(i / n).lerp(new THREE.Color("#ffffff"), 0.35) });
        if (r() < 0.3) seats.push(new V3(Math.cos(a) * rad, 0.05 + h, Math.sin(a) * rad));
      }
    });
    const floor = new THREE.Mesh(new THREE.CircleGeometry(1.05, 64), new THREE.MeshBasicMaterial({ map: paintedTexture() }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.07;
    const crowd = instanced(avatarGeometry(), solid(), seats.map((p) => ({ p, c: new THREE.Color(pick(r, AVATAR_COLORS)) })));
    g.add(holder(0.15, 1.08, instanced(BOX, solid(), stands), floor, crowd));
    const ring = rainbowTorus(2.3, 0.09);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.55;
    g.add(layer(ring, 0.5, 1.06));
    update = (t) => (ring.rotation.z = t * 0.2);
  }

  if (look === "wing") {
    // Shop: three layers of white feathers fanning out and toward you, loose feathers flying off, a rainbow ring.
    const white = solid();
    const feather = (len: number, belly: number) => {
      const shape = new THREE.Shape();
      shape.moveTo(0, 0);
      shape.quadraticCurveTo(belly, len * 0.46, 0, len);
      shape.quadraticCurveTo(-belly * 0.7, len * 0.46, 0, 0);
      return shape;
    };
    const layers = [0, 1, 2].map((k) => {
      const count = 13 - k * 2;
      const shape = feather(2.7 - k * 0.55, 0.34 - k * 0.05);
      const parts = Array.from({ length: count }, (_, i) => new THREE.ExtrudeGeometry(shape, { depth: 0.05, bevelEnabled: false }).rotateZ(-1.05 + (i * 2.1) / (count - 1)).translate(0, 0, k * 0.22));
      const mesh = new THREE.Mesh(merge(parts), white);
      // White on a white sky needs a drawn edge to read.
      mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, 20), new THREE.LineBasicMaterial({ color: "#FF3D8B", transparent: true, opacity: 0.55 })));
      return mesh;
    });
    const loose = Array.from({ length: 36 }, () => ({ v: new V3((r() - 0.5) * 1.2, r() * 0.9, 1.2 + r() * 1.6), life: r(), item: { p: new V3(), r: turn(r), s: grow(0.6 + r() * 0.6) } as Item }));
    const flying = instanced(new THREE.ShapeGeometry(feather(0.5, 0.08)), solid("#ffffff", { side: THREE.DoubleSide }), loose.map((f) => f.item));
    g.add(holder(0.2, 1.1, ...layers), holder(0.3, 1.25, flying));
    const ring = rainbowTorus(2.3, 0.07);
    ring.position.set(0, 1.4, -0.3);
    g.add(layer(ring, 0.4, 1.06));
    g.userData.facesForward = true; // the wing bursts toward you, so it doesn't spin
    update = (t, dt) => {
      layers.forEach((l, k) => (l.rotation.z = Math.sin(t * 1.2 + k * 0.6) * 0.05));
      loose.forEach((f, i) => {
        f.life = (f.life + dt * 0.25) % 1;
        f.item.p.set(0, 1.1, 0).addScaledVector(f.v, f.life * 2.2);
        f.item.s!.setScalar((1 - f.life) * 0.9);
        f.item.r!.z += dt;
        place(flying, i, f.item);
      });
      flying.instanceMatrix.needsUpdate = true;
    };
  }

  // Remember resting positions so hover can bloom the layers open.
  g.children.forEach((c) => (c.userData.base = c.position.clone()));
  // One simple invisible shape to point at, instead of thousands of tiny parts.
  const proxy = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 4.4, 12), new THREE.MeshBasicMaterial());
  proxy.visible = false;
  proxy.position.y = 1.4;
  g.add(proxy);
  g.userData.proxy = proxy;
  return { group: g, update };
}
