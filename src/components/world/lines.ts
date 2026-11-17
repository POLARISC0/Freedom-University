import * as THREE from "three";
import { instanced, type Item, merge, place, seeded, type Updater } from "./kit";

/** A built piece of linework: its objects, what fades it in, and how it moves. */
export interface Linework {
  group: THREE.Group;
  materials: THREE.Material[];
  update: Updater;
}

const basic = (color: string, opacity: number) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false });
const line = (color: string, opacity: number) => new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false });

/** A flat arc between two radii, in the XY plane. */
function arc(inner: number, outer: number, start: number, length: number): THREE.BufferGeometry {
  return new THREE.RingGeometry(inner, outer, Math.max(8, Math.ceil(length * 24)), 1, start, length);
}

/** Mono text repeated around a ring, letters standing outward, drawn in the page's own mono face. */
function textBand(radius: number, height: number, text: string, color: string): THREE.Mesh {
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 64;
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  const draw = () => {
    const g = canvas.getContext("2d")!;
    const mono = getComputedStyle(document.documentElement).getPropertyValue("--font-geist-mono").trim() || "monospace";
    g.clearRect(0, 0, canvas.width, canvas.height);
    g.font = `500 34px ${mono}`;
    g.fillStyle = color;
    g.textBaseline = "middle";
    const step = g.measureText(text).width;
    for (let x = 0; x < canvas.width; x += step) g.fillText(text, x, 34);
    texture.needsUpdate = true;
  };
  draw();
  document.fonts?.ready.then(draw);

  const segments = 256;
  const repeats = Math.max(1, Math.round((radius * Math.PI * 2) / (height * 30)));
  const pos: number[] = [];
  const uv: number[] = [];
  const index: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    pos.push(Math.cos(a) * radius, Math.sin(a) * radius, 0, Math.cos(a) * (radius + height), Math.sin(a) * (radius + height), 0);
    uv.push((i / segments) * repeats, 0, (i / segments) * repeats, 1);
    if (i < segments) index.push(i * 2, i * 2 + 2, i * 2 + 1, i * 2 + 1, i * 2 + 2, i * 2 + 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(index);
  return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
}

/**
 * A big HUD ring like a targeting overlay: a hairline circle, thick partial bands, a segmented band,
 * tick marks, small node circles and a line of mono text running round it. Built in the XY plane.
 */
export function hudRing(opts: { radius: number; text: string; seed: number; color?: string }): Linework {
  const R = opts.radius;
  const color = opts.color ?? "#1FB6FF";
  const r = seeded(opts.seed);
  const group = new THREE.Group();
  const materials: THREE.Material[] = [];
  const keep = <M extends THREE.Material>(m: M): M => {
    materials.push(m);
    return m;
  };

  const circle = (radius: number, opacity: number) => new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(new THREE.EllipseCurve(0, 0, radius, radius).getPoints(256)), keep(line(color, opacity)));
  group.add(circle(R, 0.85), circle(R * 0.93, 0.35));

  // Thick bands over parts of the circle, turning against the text.
  const bands = new THREE.Group();
  const bandParts: THREE.BufferGeometry[] = [];
  let a = r() * Math.PI * 2;
  for (let i = 0; i < 4; i++) {
    const length = 0.25 + r() * 0.7;
    const w = R * (0.012 + r() * 0.03);
    bandParts.push(arc(R + R * 0.012, R + R * 0.012 + w, a, length));
    a += length + 0.3 + r() * 0.8;
  }
  // A segmented band: short dashes along a long arc.
  const dashStart = r() * Math.PI * 2;
  for (let i = 0; i < 46; i++) bandParts.push(arc(R * 0.955, R * 0.985, dashStart + i * 0.045, 0.028));
  bands.add(new THREE.Mesh(merge(bandParts), keep(basic(color, 0.85))));

  // Tick marks along a third of the circle, a longer one every fifth.
  const ticks: THREE.Vector3[] = [];
  const tickStart = r() * Math.PI * 2;
  for (let i = 0; i < 60; i++) {
    const t = tickStart + i * 0.035;
    const len = R * (i % 5 ? 0.025 : 0.06);
    ticks.push(new THREE.Vector3(Math.cos(t) * R, Math.sin(t) * R, 0), new THREE.Vector3(Math.cos(t) * (R - len), Math.sin(t) * (R - len), 0));
  }
  bands.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(ticks), keep(line(color, 0.8))));

  // Small node circles sitting on the ring, each with a crosshair.
  for (let i = 0; i < 3; i++) {
    const t = r() * Math.PI * 2;
    const node = new THREE.Group();
    const s = R * 0.05;
    node.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(new THREE.EllipseCurve(0, 0, s, s).getPoints(32)), keep(line(color, 0.9))));
    node.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-s * 1.6, 0, 0), new THREE.Vector3(s * 1.6, 0, 0), new THREE.Vector3(0, -s * 1.6, 0), new THREE.Vector3(0, s * 1.6, 0)]), keep(line(color, 0.6))));
    node.position.set(Math.cos(t) * R, Math.sin(t) * R, 0);
    bands.add(node);
  }
  group.add(bands);

  const text = textBand(R * 1.05, R * 0.045, opts.text, color);
  keep(text.material as THREE.Material);
  group.add(text);

  const spin = (r() - 0.5) * 0.12;
  return {
    group,
    materials,
    update: (t) => {
      bands.rotation.z = t * spin;
      text.rotation.z = -t * spin * 0.6;
    },
  };
}

/**
 * The magenta rail: a wide pink band with a dark centre line, thin edge lines, a faint glow
 * and bright dashes running along it. Laid flat along the line from `from` to `to`.
 */
export function rail(from: THREE.Vector3, to: THREE.Vector3, width = 0.6): Linework {
  const length = from.distanceTo(to);
  const group = new THREE.Group();
  const materials: THREE.Material[] = [];
  const strip = (w: number, x: number, color: string, opacity: number, y = 0) => {
    const m = basic(color, opacity);
    materials.push(m);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, length).rotateX(-Math.PI / 2), m);
    mesh.position.set(x, y, 0);
    return mesh;
  };
  group.add(
    strip(width * 2.6, 0, "#FF2E88", 0.1, -0.01),
    strip(width, 0, "#FF2E88", 0.88),
    strip(width * 0.1, 0, "#4A0D2E", 0.9, 0.004),
    strip(width * 0.05, width * 0.85, "#FF2E88", 0.85),
    strip(width * 0.05, -width * 0.85, "#FF2E88", 0.85),
    strip(width * 0.03, width * 1.2, "#FF6FB0", 0.6),
    strip(width * 0.03, -width * 1.2, "#FF6FB0", 0.6),
  );
  const r = seeded(Math.round(length * 100));
  const runners = Array.from({ length: 26 }, () => ({ z: (r() - 0.5) * length, v: 3 + r() * 6, item: { p: new THREE.Vector3(), s: new THREE.Vector3(width * 0.35, 1, 0.6 + r() * 1.6) } as Item }));
  const runnerMat = new THREE.MeshBasicMaterial({ color: "#FFFFFF", transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthWrite: false });
  materials.push(runnerMat);
  const dashes = instanced(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), runnerMat, runners.map((x) => x.item));
  group.add(dashes);
  group.position.copy(from).lerp(to, 0.5);
  group.lookAt(to);
  return {
    group,
    materials,
    update: (t, dt) => {
      runners.forEach((x, i) => {
        x.z += x.v * dt;
        if (x.z > length / 2) x.z = -length / 2;
        x.item.p.set(0, 0.008, x.z);
        place(dashes, i, x.item);
      });
      dashes.instanceMatrix.needsUpdate = true;
    },
  };
}

/** Thin tube along a closed ellipse, for orbit lines that stay crisp at any pixel ratio. */
export function orbit(radius: number, squash: number, thickness: number, color: string): THREE.Mesh {
  const curve = new THREE.EllipseCurve(0, 0, radius, radius * squash, 0, Math.PI * 2);
  const path = new THREE.CatmullRomCurve3(curve.getPoints(180).map((p) => new THREE.Vector3(p.x, 0, p.y)), true);
  return new THREE.Mesh(new THREE.TubeGeometry(path, 360, thickness, 4, true), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 }));
}
