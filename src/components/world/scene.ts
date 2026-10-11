import * as THREE from "three";
import type { Look } from "@/content/world";

export interface SceneDistrict {
  id: string;
  color: string;
  status: "open" | "live" | "soon";
  space: { x: number; y: number; z: number };
  theme: { look: Look; skyTop: string; skyBottom: string; dark?: boolean };
}

export interface SceneHeadmaster {
  id: string;
  color: string;
  space: { x: number; y: number; z: number };
}

export interface SceneCallbacks {
  /** Hovered pick id: a district id, "hm:<id>" for a Headmaster, or null. */
  onHover(id: string | null): void;
  onSelect(id: string): void;
}

const WORLD_SKY = { top: "#FFFFFF", bottom: "#EEF1F6" };
const HOME_CAMERA = new THREE.Vector3(0, 8.5, 24);
const HOME_TARGET = new THREE.Vector3(0, 0.5, 0);
const RAINBOW = (t: number) => new THREE.Color().setHSL(t, 0.95, 0.58);

/** Everything the scene animates each frame. */
type Updater = (t: number, dt: number) => void;

function glowTexture(): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.35, "rgba(255,255,255,0.6)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

function shadowTexture(): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, "rgba(20,24,40,0.35)");
  grad.addColorStop(1, "rgba(20,24,40,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

function paintedTexture(): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d")!;
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, 256, 256);
  // Deterministic "painted" strokes for the Community Square centre.
  let seed = 7;
  const rand = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < 40; i++) {
    g.strokeStyle = `hsl(${Math.floor(rand() * 360)} 95% 60% / 0.75)`;
    g.lineWidth = 6 + rand() * 18;
    g.lineCap = "round";
    g.beginPath();
    g.moveTo(rand() * 256, rand() * 256);
    g.quadraticCurveTo(rand() * 256, rand() * 256, rand() * 256, rand() * 256);
    g.stroke();
  }
  return new THREE.CanvasTexture(c);
}

function rainbowTorus(radius: number, tube: number, opacity = 1): THREE.Mesh {
  const geo = new THREE.TorusGeometry(radius, tube, 12, 128);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const a = (Math.atan2(pos.getY(i), pos.getX(i)) + Math.PI) / (Math.PI * 2);
    RAINBOW(a).toArray(colors, i * 3);
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: opacity < 1, opacity });
  return new THREE.Mesh(geo, mat);
}

function glass(color: string, opacity = 0.5): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, transparent: true, opacity, roughness: 0.15, metalness: 0.05, side: THREE.DoubleSide, depthWrite: false });
}

/** A mesh with a crisp blueprint outline. */
function outlined(geo: THREE.BufferGeometry, mat: THREE.Material, edge = "#1b1e28", edgeOpacity = 0.28): THREE.Mesh {
  const mesh = new THREE.Mesh(geo, mat);
  const lines = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: edge, transparent: true, opacity: edgeOpacity }));
  mesh.add(lines);
  return mesh;
}

// ---------- Island builders: one small cluster per district look ----------

type Island = { group: THREE.Group; update: Updater };

function seeded(seed: number) {
  return () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
}

function buildIsland(look: Look, color: string): Island {
  const g = new THREE.Group();
  const r = seeded(look.length * 97 + 11);
  let update: Updater = () => {};

  if (look === "shards") {
    g.add(outlined(new THREE.BoxGeometry(3.2, 0.22, 3.2), glass("#8FC8FF", 0.45)));
    const shards: THREE.Mesh[] = [];
    for (let i = 0; i < 11; i++) {
      const s = outlined(new THREE.TetrahedronGeometry(0.35 + r() * 0.45), new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: "#ffffff", emissiveIntensity: 0.45, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.94, flatShading: true }), "#3E9BFF", 0.35);
      s.position.set((r() - 0.5) * 3, 0.6 + r() * 2.2, (r() - 0.5) * 3);
      s.rotation.set(r() * 6, r() * 6, r() * 6);
      shards.push(s);
      g.add(s);
    }
    for (let i = 0; i < 3; i++) {
      const c = outlined(new THREE.BoxGeometry(0.45, 0.45, 0.45), glass("#3E9BFF", 0.8));
      c.position.set((r() - 0.5) * 2.6, 0.4, (r() - 0.5) * 2.6);
      g.add(c);
    }
    update = (t) => shards.forEach((s, i) => { s.rotation.y = t * 0.3 + i; s.rotation.x = t * 0.2 + i * 0.5; });
  }

  if (look === "hexcity") {
    g.add(outlined(new THREE.CylinderGeometry(2.3, 2.3, 0.3, 6), new THREE.MeshStandardMaterial({ color: "#B9BEC6", roughness: 0.6 })));
    for (let i = 0; i < 9; i++) {
      const h = 0.5 + r() * 2.4;
      const w = 0.35 + r() * 0.35;
      const b = outlined(new THREE.BoxGeometry(w, h, w), new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(0.6, 0.06, 0.55 + r() * 0.25), roughness: 0.5 }));
      const a = (i / 9) * Math.PI * 2;
      const d = r() * 1.5;
      b.position.set(Math.cos(a) * d, 0.15 + h / 2, Math.sin(a) * d);
      g.add(b);
    }
    const rings = ["#FF5A1F", "#FFC400", "#FF3D8B"].map((c, i) => {
      const t = new THREE.Mesh(new THREE.TorusGeometry(2.7 + i * 0.35, 0.035, 8, 96), new THREE.MeshBasicMaterial({ color: c }));
      t.rotation.x = Math.PI / 2 + (i - 1) * 0.35;
      t.position.y = 1.2;
      g.add(t);
      return t;
    });
    update = (t) => rings.forEach((ring, i) => { ring.rotation.z = t * (0.25 + i * 0.1) * (i % 2 ? -1 : 1); });
  }

  if (look === "transit") {
    const panels: THREE.Mesh[] = [];
    for (let i = 0; i < 6; i++) {
      const p = outlined(new THREE.BoxGeometry(3.2, 0.06, 1.8), glass(i % 2 ? "#3DFF8F" : "#14C46A", 0.38), "#0B6B3A", 0.4);
      p.position.set(0, i * 0.45, 0);
      panels.push(p);
      g.add(p);
    }
    for (const x of [-1.7, 1.7]) {
      const rail = outlined(new THREE.BoxGeometry(0.06, 2.8, 0.06), new THREE.MeshStandardMaterial({ color: "#0B6B3A" }));
      rail.position.set(x, 1.2, 0.9);
      g.add(rail);
    }
    update = (t) => panels.forEach((p, i) => { p.position.x = Math.sin(t * 0.6 + i * 0.8) * 0.45; });
  }

  if (look === "sky") {
    g.add(outlined(new THREE.CylinderGeometry(2.1, 2.1, 0.16, 48), new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.3 }), "#C99700", 0.35));
    const gold = new THREE.MeshStandardMaterial({ color: "#F5B700", emissive: "#7a5200", roughness: 0.25, metalness: 0.4 });
    const arcs = [0, 1].map((k) => {
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-2.4, 0.4 + k * 0.6, -0.4),
        new THREE.Vector3(-0.6, 2.2 + k * 0.5, 0.8),
        new THREE.Vector3(1.2, 1.4 + k * 0.4, -0.6),
        new THREE.Vector3(2.6, 2.6 + k * 0.3, 0.4),
      ]);
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 64, 0.05, 8), gold);
      g.add(tube);
      return tube;
    });
    const birds = Array.from({ length: 6 }, () => {
      const bird = new THREE.Group();
      for (const side of [-1, 1]) {
        const wing = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.02, 0.08), new THREE.MeshBasicMaterial({ color: "#2a2a35" }));
        wing.position.x = side * 0.15;
        wing.userData.side = side;
        bird.add(wing);
      }
      bird.position.set((r() - 0.5) * 3, 2 + r() * 1.5, (r() - 0.5) * 2);
      g.add(bird);
      return bird;
    });
    update = (t) => {
      arcs.forEach((a, i) => { a.rotation.y = Math.sin(t * 0.3 + i) * 0.3; });
      birds.forEach((b, i) => {
        b.position.x = ((t * 0.4 + i * 0.9) % 5) - 2.5;
        b.children.forEach((w) => { w.rotation.z = Math.sin(t * 8 + i) * 0.5 * w.userData.side; });
      });
    };
  }

  if (look === "stack") {
    const blue = ["#0B2A9A", "#1636C8", "#2446D8", "#3B5BFF"];
    for (let x = -1; x <= 1; x++)
      for (let z = -1; z <= 1; z++) {
        const h = 0.6 + r() * 2.6;
        const b = outlined(new THREE.BoxGeometry(0.9, h, 0.9), new THREE.MeshStandardMaterial({ color: blue[Math.floor(r() * blue.length)], roughness: 0.35 }), "#ffffff", 0.35);
        b.position.set(x * 1.05, h / 2, z * 1.05);
        g.add(b);
      }
    const ring = rainbowTorus(3.6, 0.1);
    ring.rotation.x = Math.PI / 2.2;
    ring.position.y = 1.4;
    g.add(ring);
    const swarm = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 8, 8), new THREE.MeshBasicMaterial(), 70);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < 70; i++) swarm.setColorAt(i, RAINBOW(r()));
    g.add(swarm);
    update = (t) => {
      ring.rotation.z = t * 0.35;
      for (let i = 0; i < 70; i++) {
        const a = t * (0.4 + (i % 7) * 0.05) + i;
        const rad = 1.9 + Math.sin(i * 1.7) * 0.6;
        dummy.position.set(Math.cos(a) * rad, 0.6 + ((i * 0.37) % 3) + Math.sin(t + i) * 0.15, Math.sin(a) * rad);
        dummy.updateMatrix();
        swarm.setMatrixAt(i, dummy.matrix);
      }
      swarm.instanceMatrix.needsUpdate = true;
    };
  }

  if (look === "arena") {
    const ring = rainbowTorus(2.4, 0.2);
    ring.rotation.x = Math.PI / 2;
    g.add(ring);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(2.2, 64), new THREE.MeshBasicMaterial({ map: paintedTexture() }));
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = -0.05;
    g.add(disc);
    update = (t) => { ring.rotation.z = t * 0.2; };
  }

  if (look === "wing") {
    const feathers: THREE.Mesh[] = [];
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.quadraticCurveTo(0.35, 1.2, 0, 2.6);
    shape.quadraticCurveTo(-0.25, 1.2, 0, 0);
    for (let i = 0; i < 9; i++) {
      const f = outlined(new THREE.ExtrudeGeometry(shape, { depth: 0.08, bevelEnabled: false }), new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: "#ffffff", emissiveIntensity: 0.42, roughness: 0.35 }), "#FF3D8B", 0.5);
      f.rotation.z = -0.9 + i * 0.22;
      f.position.z = i * 0.04;
      feathers.push(f);
      g.add(f);
    }
    const ring = rainbowTorus(2.3, 0.07);
    ring.position.set(0, 1.4, -0.3);
    g.add(ring);
    update = (t) => feathers.forEach((f, i) => { f.rotation.z = -0.9 + i * 0.22 + Math.sin(t * 1.2 + i * 0.3) * 0.05; });
    g.userData.facesForward = true; // the wing bursts toward you, so it doesn't spin
  }

  // Remember resting positions so hover can "bloom" the cluster open.
  g.children.forEach((c) => (c.userData.base = c.position.clone()));
  if (color) g.userData.color = color;
  return { group: g, update };
}

// ---------- Fly-in environments: the whole scene shifts into a district's look ----------

type Env = { root: THREE.Group; materials: THREE.Material[]; update: Updater };

function buildEnvironment(look: Look): Env {
  const root = new THREE.Group();
  const materials: THREE.Material[] = [];
  const r = seeded(look.length * 31 + 3);
  const dummy = new THREE.Object3D();
  const field = (count: number, geo: THREE.BufferGeometry, mat: THREE.Material, colors?: (i: number) => THREE.Color) => {
    const mesh = new THREE.InstancedMesh(geo, mat, count);
    if (colors) for (let i = 0; i < count; i++) mesh.setColorAt(i, colors(i));
    materials.push(mat);
    root.add(mesh);
    const state = Array.from({ length: count }, () => ({
      p: new THREE.Vector3((r() - 0.5) * 30, (r() - 0.5) * 16, (r() - 0.5) * 26),
      v: new THREE.Vector3((r() - 0.5) * 0.6, (r() - 0.5) * 0.3, (r() - 0.5) * 0.6),
      rot: new THREE.Euler(r() * 6, r() * 6, r() * 6),
      s: 0.5 + r(),
    }));
    return { mesh, state };
  };
  const write = (f: ReturnType<typeof field>) => {
    f.state.forEach((s, i) => {
      dummy.position.copy(s.p);
      dummy.rotation.copy(s.rot);
      dummy.scale.setScalar(s.s);
      dummy.updateMatrix();
      f.mesh.setMatrixAt(i, dummy.matrix);
    });
    f.mesh.instanceMatrix.needsUpdate = true;
  };
  const wrap = (p: THREE.Vector3) => {
    if (p.x > 15) p.x = -15; if (p.x < -15) p.x = 15;
    if (p.y > 8) p.y = -8; if (p.y < -8) p.y = 8;
    if (p.z > 13) p.z = -13; if (p.z < -13) p.z = 13;
  };
  const mat = (color: string, opacity = 0.9, extra: THREE.MeshStandardMaterialParameters = {}) =>
    new THREE.MeshStandardMaterial({ color, transparent: true, opacity, roughness: 0.15, side: THREE.DoubleSide, depthWrite: false, ...extra });

  let update: Updater = () => {};
  if (look === "shards") {
    const f = field(110, new THREE.TetrahedronGeometry(0.3), mat("#ffffff", 0.95, { flatShading: true, emissive: "#ffffff", emissiveIntensity: 0.5 }));
    f.state.forEach((s) => { s.s = 0.35 + r() * 0.7; s.v.copy(s.p).normalize().multiplyScalar(0.4 + r() * 0.6); }); // exploding outward
    update = (t, dt) => { f.state.forEach((s) => { s.p.addScaledVector(s.v, dt); s.rot.x += dt * 0.6; s.rot.y += dt * 0.4; if (s.p.length() > 18) s.p.setLength(1); }); write(f); };
  } else if (look === "hexcity") {
    const plates = field(36, new THREE.CylinderGeometry(0.8, 0.8, 0.12, 6), mat("#AEB4BD", 0.85));
    const rings = field(14, new THREE.TorusGeometry(1.2, 0.03, 6, 64), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.9 }), (i) => new THREE.Color(["#FF5A1F", "#FFC400", "#FF3D8B", "#3DFF8F"][i % 4]));
    plates.state.forEach((s) => s.rot.set(0, s.rot.y, 0));
    update = (t, dt) => {
      plates.state.forEach((s) => { s.p.y += Math.sin(t + s.s * 5) * dt * 0.2; s.rot.y += dt * 0.1; }); write(plates);
      rings.state.forEach((s, i) => { s.rot.x += dt * 0.3 * (i % 2 ? 1 : -1); s.rot.y += dt * 0.2; }); write(rings);
    };
  } else if (look === "transit") {
    const f = field(70, new THREE.BoxGeometry(3, 0.04, 1.6), mat("#3DFF8F", 0.32));
    f.state.forEach((s) => { s.rot.set(0, 0, 0); s.v.set(2 + r() * 3, 0, 0); });
    update = (t, dt) => { f.state.forEach((s) => { s.p.addScaledVector(s.v, dt); wrap(s.p); }); write(f); };
  } else if (look === "sky") {
    const birds = field(48, new THREE.BoxGeometry(0.5, 0.02, 0.12), new THREE.MeshBasicMaterial({ color: "#2a2a35", transparent: true, opacity: 0.85 }));
    const arcs = field(8, new THREE.TorusGeometry(6, 0.05, 6, 120, Math.PI * 0.8), mat("#F5B700", 0.9, { emissive: "#7a5200" }));
    birds.state.forEach((s) => s.v.set(1 + r(), 0.1, 0));
    update = (t, dt) => {
      birds.state.forEach((s, i) => { s.p.addScaledVector(s.v, dt); s.rot.set(0, 0, Math.sin(t * 7 + i) * 0.6); wrap(s.p); }); write(birds);
      arcs.state.forEach((s, i) => { s.rot.z += dt * 0.08 * (i % 2 ? 1 : -1); }); write(arcs);
    };
  } else if (look === "stack") {
    const blocks = field(90, new THREE.BoxGeometry(1, 1, 1), mat("#1636C8", 0.85), (i) => new THREE.Color(["#0B2A9A", "#1636C8", "#3B5BFF"][i % 3]));
    const avatars = field(260, new THREE.SphereGeometry(0.09, 6, 6), new THREE.MeshBasicMaterial({ transparent: true, opacity: 1 }), () => RAINBOW(r()));
    blocks.state.forEach((s) => { s.rot.set(0, 0, 0); s.s = 0.6 + r() * 1.6; });
    update = (t, dt) => {
      blocks.state.forEach((s, i) => { s.p.y += Math.sin(t * 0.5 + i) * dt * 0.15; }); write(blocks);
      avatars.state.forEach((s, i) => { s.p.x += Math.cos(t * 0.8 + i) * dt * 1.2; s.p.z += Math.sin(t * 0.7 + i * 1.3) * dt * 1.2; s.p.y += Math.sin(t * 1.3 + i) * dt * 0.4; wrap(s.p); }); write(avatars);
    };
  } else if (look === "arena") {
    const rings = Array.from({ length: 6 }, (_, i) => {
      const ring = rainbowTorus(5 + i * 2.2, 0.08 + i * 0.02, 0.9);
      ring.rotation.x = Math.PI / 2 + (i % 2 ? 0.15 : -0.15);
      materials.push(ring.material as THREE.Material);
      root.add(ring);
      return ring;
    });
    update = (t) => rings.forEach((ring, i) => { ring.rotation.z = t * 0.1 * (i % 2 ? 1 : -1); });
  } else if (look === "wing") {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.quadraticCurveTo(0.3, 1, 0, 2.2);
    shape.quadraticCurveTo(-0.2, 1, 0, 0);
    const f = field(90, new THREE.ShapeGeometry(shape), mat("#ffffff", 0.95, { emissive: "#ffffff", emissiveIntensity: 0.5 }));
    f.state.forEach((s) => s.v.set((r() - 0.5) * 0.5, (r() - 0.5) * 0.3, 3 + r() * 4)); // bursting forward
    const ring = rainbowTorus(7, 0.12, 0.9);
    materials.push(ring.material as THREE.Material);
    root.add(ring);
    update = (t, dt) => { ring.rotation.z = t * 0.15; f.state.forEach((s) => { s.p.addScaledVector(s.v, dt); s.rot.z += dt * 0.5; wrap(s.p); }); write(f); };
  }
  materials.forEach((m) => { m.transparent = true; m.userData.full = (m as THREE.MeshBasicMaterial).opacity ?? 1; (m as THREE.MeshBasicMaterial).opacity = 0; });
  root.visible = false;
  return { root, materials, update };
}

// ---------- The scene ----------

export class WorldScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2(0, 0);
  private pointerActive = false;
  private updaters: Updater[] = [];
  private islands = new Map<string, { group: THREE.Group; base: THREE.Vector3; phase: number; scale: number }>();
  private headmasters = new Map<string, { group: THREE.Group; base: THREE.Vector3 }>();
  private pickables: THREE.Object3D[] = [];
  private labels: Map<string, HTMLElement>;
  private envs = new Map<Look, Env>();
  private activeEnv: Env | null = null;
  private envFade = 0;
  private hovered: string | null = null;
  private focused: string | null = null;
  private camFrom = HOME_CAMERA.clone();
  private camTo = HOME_CAMERA.clone();
  private targetFrom = new THREE.Vector3();
  private targetTo = HOME_TARGET.clone();
  private target = HOME_TARGET.clone();
  private flight = 1;
  private skyTop = new THREE.Color(WORLD_SKY.top);
  private skyBottom = new THREE.Color(WORLD_SKY.bottom);
  private skyTopTo = this.skyTop.clone();
  private skyBottomTo = this.skyBottom.clone();
  private skyCanvas = document.createElement("canvas");
  private skyTexture: THREE.CanvasTexture;
  private raf = 0;
  private timer = new THREE.Timer();
  private resizeObserver: ResizeObserver;
  private slowFrames = 0;
  private disposed = false;

  constructor(
    private canvas: HTMLCanvasElement,
    labels: Map<string, HTMLElement>,
    private districts: SceneDistrict[],
    headmasters: SceneHeadmaster[],
    private cb: SceneCallbacks,
  ) {
    this.labels = labels;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.skyCanvas.width = 2;
    this.skyCanvas.height = 256;
    this.skyTexture = new THREE.CanvasTexture(this.skyCanvas);
    this.paintSky();
    this.scene.background = this.skyTexture;
    this.scene.fog = new THREE.Fog(WORLD_SKY.bottom, 26, 70);

    this.scene.add(new THREE.HemisphereLight("#ffffff", "#c9d1e0", 1.25));
    const sun = new THREE.DirectionalLight("#ffffff", 1.4);
    sun.position.set(6, 12, 8);
    this.scene.add(sun);

    this.buildBlueprint();
    this.buildDistricts();
    this.buildHeadmasters(headmasters);
    this.buildParticles();

    this.camera.position.copy(HOME_CAMERA);
    this.camera.lookAt(HOME_TARGET);

    canvas.addEventListener("pointermove", this.onPointerMove);
    canvas.addEventListener("pointerleave", this.onPointerLeave);
    canvas.addEventListener("click", this.onClick);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas.parentElement ?? canvas);
    this.resize();
    this.loop();
  }

  // ----- public API -----

  focus(id: string) {
    const d = this.districts.find((x) => x.id === id);
    if (!d) return;
    this.focused = id;
    const p = new THREE.Vector3(d.space.x, d.space.y, d.space.z);
    this.startFlight(p.clone().add(new THREE.Vector3(0, 2.6, 8.5)), p.clone().add(new THREE.Vector3(0, 0.9, 0)));
    this.skyTopTo.set(d.theme.skyTop);
    this.skyBottomTo.set(d.theme.skyBottom);
    let env = this.envs.get(d.theme.look);
    if (!env) {
      env = buildEnvironment(d.theme.look);
      this.envs.set(d.theme.look, env);
      this.scene.add(env.root);
    }
    env.root.position.copy(p);
    if (this.activeEnv && this.activeEnv !== env) this.activeEnv.root.visible = false;
    this.activeEnv = env;
    this.envFade = 0;
    env.root.visible = true;
  }

  unfocus() {
    this.focused = null;
    this.startFlight(HOME_CAMERA.clone(), HOME_TARGET.clone());
    this.skyTopTo.set(WORLD_SKY.top);
    this.skyBottomTo.set(WORLD_SKY.bottom);
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.timer.dispose();
    this.resizeObserver.disconnect();
    this.canvas.removeEventListener("pointermove", this.onPointerMove);
    this.canvas.removeEventListener("pointerleave", this.onPointerLeave);
    this.canvas.removeEventListener("click", this.onClick);
    this.scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      mesh.geometry?.dispose();
      const m = mesh.material as THREE.Material | THREE.Material[] | undefined;
      (Array.isArray(m) ? m : m ? [m] : []).forEach((x) => x.dispose());
    });
    this.renderer.dispose();
  }

  // ----- build -----

  private buildBlueprint() {
    const floor = new THREE.GridHelper(200, 100, "#b9c2d3", "#d9dfea");
    floor.position.y = -6;
    floor.rotation.x = 0.03;
    const back = new THREE.GridHelper(200, 60, "#c3cad8", "#e1e5ee");
    back.rotation.x = Math.PI / 2 - 0.25; // tilting into the distance
    back.position.set(0, 10, -45);
    for (const grid of [floor, back]) {
      (grid.material as THREE.Material).transparent = true;
      (grid.material as THREE.Material).opacity = 0.7;
      this.scene.add(grid);
    }

    // Orbit rings around downtown.
    const orbits = [13, 19, 26].map((radius, i) => {
      const curve = new THREE.EllipseCurve(0, 0, radius, radius * 0.62, 0, Math.PI * 2);
      const geo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(160).map((p) => new THREE.Vector3(p.x, 0, p.y)));
      const line = new THREE.LineLoop(geo, new THREE.LineDashedMaterial({ color: "#7b8496", dashSize: 0.6, gapSize: 0.5, transparent: true, opacity: 0.45 }));
      line.computeLineDistances();
      line.rotation.x = (i - 1) * 0.08;
      line.position.y = -1 + i * 0.6;
      this.scene.add(line);
      return line;
    });
    this.updaters.push((t) => orbits.forEach((o, i) => { o.rotation.y = t * 0.015 * (i % 2 ? -1 : 1); }));
  }

  private buildDistricts() {
    const shadow = shadowTexture();
    const glow = glowTexture();
    const downtown = this.districts.find((d) => d.status === "live") ?? this.districts[0];
    const from = new THREE.Vector3(downtown.space.x, downtown.space.y + 1, downtown.space.z);

    this.districts.forEach((d, i) => {
      const island = buildIsland(d.theme.look, d.color);
      const base = new THREE.Vector3(d.space.x, d.space.y, d.space.z);
      island.group.position.copy(base);
      island.group.userData.pickId = d.id;
      if (d.status === "soon") island.group.scale.setScalar(0.9);
      this.scene.add(island.group);
      this.pickables.push(island.group);
      this.islands.set(d.id, { group: island.group, base, phase: i * 1.3, scale: island.group.scale.x });
      this.updaters.push(island.update);

      const sh = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.MeshBasicMaterial({ map: shadow, transparent: true, depthWrite: false }));
      sh.rotation.x = -Math.PI / 2;
      sh.position.set(base.x, -5.95, base.z);
      this.scene.add(sh);

      if (d === downtown) return;
      // Arc from downtown with a pulse of light travelling along it.
      const to = new THREE.Vector3(base.x, base.y + 0.8, base.z);
      const mid = from.clone().lerp(to, 0.5).add(new THREE.Vector3(0, 4 + i * 0.3, 0));
      const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
      const lineMat = new THREE.LineBasicMaterial({ color: d.color, transparent: true, opacity: 0.55 });
      this.scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(60)), lineMat));
      const pulse = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: d.color, transparent: true, depthWrite: false }));
      pulse.scale.setScalar(0.9);
      this.scene.add(pulse);
      this.updaters.push((t) => {
        const k = (t * 0.18 + i * 0.17) % 1;
        pulse.position.copy(curve.getPoint(k));
        lineMat.opacity = 0.35 + 0.3 * Math.sin(t * 2 + i);
      });
    });
  }

  private buildHeadmasters(list: SceneHeadmaster[]) {
    list.forEach((h, i) => {
      const g = new THREE.Group();
      const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.75, 1), new THREE.MeshStandardMaterial({ color: h.color, emissive: h.color, emissiveIntensity: 0.35, flatShading: true, roughness: 0.2 }));
      g.add(core);
      const halo = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.035, 8, 96), new THREE.MeshBasicMaterial({ color: "#1b1e28" }));
      halo.rotation.x = Math.PI / 2.4;
      g.add(halo);
      const sats = Array.from({ length: 5 }, () => {
        const s = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.14), new THREE.MeshBasicMaterial({ color: h.color }));
        g.add(s);
        return s;
      });
      // A faint beam down toward the districts they oversee.
      const beam = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, -0.8, 0), new THREE.Vector3(0, -h.space.y - 4, 0)]),
        new THREE.LineDashedMaterial({ color: h.color, dashSize: 0.25, gapSize: 0.25, transparent: true, opacity: 0.6 }),
      );
      beam.computeLineDistances();
      g.add(beam);
      const base = new THREE.Vector3(h.space.x, h.space.y, h.space.z);
      g.position.copy(base);
      g.userData.pickId = `hm:${h.id}`;
      this.scene.add(g);
      this.pickables.push(g);
      this.headmasters.set(h.id, { group: g, base });
      this.updaters.push((t) => {
        core.rotation.y = t * 0.5 + i;
        core.rotation.x = t * 0.3;
        halo.rotation.z = t * (i ? -0.6 : 0.6);
        sats.forEach((s, k) => {
          const a = t * 0.9 + (k / sats.length) * Math.PI * 2;
          s.position.set(Math.cos(a) * 1.25, Math.sin(a * 2) * 0.2, Math.sin(a) * 1.25 * 0.42);
        });
        g.position.y = base.y + Math.sin(t * 0.7 + i * 2) * 0.3;
      });
    });
  }

  private buildParticles() {
    const count = 420;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const r = seeded(42);
    const palette = ["#FF3D8B", "#00C2FF", "#FFC400", "#3DFF8F", "#B46CFF"].map((c) => new THREE.Color(c));
    for (let i = 0; i < count; i++) {
      positions.set([(r() - 0.5) * 60, (r() - 0.5) * 24, (r() - 0.5) * 50], i * 3);
      palette[i % palette.length].toArray(colors, i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const points = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.14, map: glowTexture(), vertexColors: true, transparent: true, depthWrite: false, opacity: 0.9 }));
    this.scene.add(points);
    this.updaters.push((t, dt) => {
      const p = geo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < count; i++) {
        let y = p.getY(i) + dt * (0.25 + (i % 5) * 0.06);
        if (y > 12) y = -12;
        p.setY(i, y);
        p.setX(i, p.getX(i) + Math.sin(t * 0.3 + i) * dt * 0.05);
      }
      p.needsUpdate = true;
    });
  }

  // ----- interaction -----

  private onPointerMove = (e: PointerEvent) => {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.pointerActive = true;
  };

  private onPointerLeave = () => {
    this.pointerActive = false;
    this.setHovered(null);
  };

  private onClick = () => {
    if (this.hovered) this.cb.onSelect(this.hovered);
  };

  private setHovered(id: string | null) {
    if (id === this.hovered) return;
    this.hovered = id;
    this.canvas.style.cursor = id ? "pointer" : "default";
    this.cb.onHover(id);
  }

  private pick() {
    if (!this.pointerActive) return;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hit = this.raycaster.intersectObjects(this.pickables, true)[0];
    let o: THREE.Object3D | null = hit?.object ?? null;
    while (o && !o.userData.pickId) o = o.parent;
    this.setHovered((o?.userData.pickId as string) ?? null);
  }

  private startFlight(cam: THREE.Vector3, target: THREE.Vector3) {
    this.camFrom.copy(this.camera.position);
    this.camTo.copy(cam);
    this.targetFrom.copy(this.target);
    this.targetTo.copy(target);
    this.flight = 0;
  }

  // ----- frame -----

  private paintSky() {
    const g = this.skyCanvas.getContext("2d")!;
    const grad = g.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, `#${this.skyTop.getHexString()}`);
    grad.addColorStop(1, `#${this.skyBottom.getHexString()}`);
    g.fillStyle = grad;
    g.fillRect(0, 0, 2, 256);
    if (this.skyTexture) this.skyTexture.needsUpdate = true;
  }

  private resize() {
    const parent = this.canvas.parentElement ?? this.canvas;
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  private loop = (now?: number) => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    if (document.hidden) return;
    this.timer.update(now);
    const dt = Math.min(this.timer.getDelta(), 0.05);
    const t = this.timer.getElapsed();

    // Adaptive quality: drop resolution if frames are consistently slow.
    this.slowFrames = dt > 0.034 ? this.slowFrames + 1 : Math.max(0, this.slowFrames - 1);
    if (this.slowFrames > 90 && this.renderer.getPixelRatio() > 1) {
      this.renderer.setPixelRatio(1);
      this.resize();
      this.slowFrames = 0;
    }

    this.updaters.forEach((u) => u(t, dt));

    const ease = 1 - Math.exp(-dt * 7); // same feel at 30 or 144 fps
    const slow = 1 - Math.exp(-dt * 3);

    // Islands bob, rotate and bloom open on hover.
    this.islands.forEach((isl, id) => {
      const hover = id === this.hovered || id === this.focused;
      isl.group.position.y = isl.base.y + Math.sin(t * 0.6 + isl.phase) * 0.28;
      if (!isl.group.userData.facesForward) isl.group.rotation.y += dt * 0.08;
      const s = THREE.MathUtils.lerp(isl.group.scale.x, isl.scale * (hover ? 1.16 : 1), ease);
      isl.group.scale.setScalar(s);
      const spread = hover ? 1.28 : 1;
      isl.group.children.forEach((c) => {
        const b = c.userData.base as THREE.Vector3 | undefined;
        if (b) c.position.lerp(new THREE.Vector3(b.x * spread, b.y * (hover ? 1.15 : 1), b.z * spread), ease);
      });
    });
    this.headmasters.forEach((hm, id) => {
      const s = THREE.MathUtils.lerp(hm.group.scale.x, this.hovered === `hm:${id}` ? 1.2 : 1, ease);
      hm.group.scale.setScalar(s);
    });

    // Camera flight, with mouse parallax on top.
    let k = 1;
    if (this.flight < 1) {
      this.flight = Math.min(1, this.flight + dt / 1.4);
      k = this.flight < 0.5 ? 4 * this.flight ** 3 : 1 - (-2 * this.flight + 2) ** 3 / 2;
      this.target.lerpVectors(this.targetFrom, this.targetTo, k);
    }
    const base = new THREE.Vector3().lerpVectors(this.camFrom, this.camTo, k);
    const sway = this.focused ? 0.6 : 2.2;
    const px = this.pointerActive ? this.pointer.x : Math.sin(t * 0.2) * 0.3;
    const py = this.pointerActive ? this.pointer.y : 0;
    this.camera.position.set(base.x + px * sway, base.y + py * sway * 0.5, base.z);
    this.camera.lookAt(this.target);

    // Scene shifts into the focused district's look.
    if (!this.skyTop.equals(this.skyTopTo) || !this.skyBottom.equals(this.skyBottomTo)) {
      this.skyTop.lerp(this.skyTopTo, slow);
      this.skyBottom.lerp(this.skyBottomTo, slow);
      if (Math.abs(this.skyTop.r - this.skyTopTo.r) + Math.abs(this.skyTop.g - this.skyTopTo.g) + Math.abs(this.skyTop.b - this.skyTopTo.b) < 0.003) {
        this.skyTop.copy(this.skyTopTo);
        this.skyBottom.copy(this.skyBottomTo);
      }
      this.paintSky();
      (this.scene.fog as THREE.Fog).color.copy(this.skyBottom);
    }
    if (this.activeEnv) {
      const want = this.focused ? 1 : 0;
      this.envFade = THREE.MathUtils.lerp(this.envFade, want, slow);
      this.activeEnv.materials.forEach((m) => ((m as THREE.MeshBasicMaterial).opacity = (m.userData.full as number) * this.envFade));
      this.activeEnv.update(t, dt);
      if (!this.focused && this.envFade < 0.01) {
        this.activeEnv.root.visible = false;
        this.activeEnv = null;
      }
    }

    this.pick();
    this.renderer.render(this.scene, this.camera);
    this.placeLabels();
  };

  /** Pin each HTML label to its island; far ones fade and soften. */
  private placeLabels() {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    const v = new THREE.Vector3();
    const place = (id: string, obj: THREE.Object3D, lift: number) => {
      const el = this.labels.get(id);
      if (!el) return;
      v.copy(obj.position).add(new THREE.Vector3(0, lift, 0));
      const dist = v.distanceTo(this.camera.position);
      v.project(this.camera);
      const hidden = v.z > 1 || (this.focused !== null && id !== this.focused);
      el.style.transform = `translate3d(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px, 0) translate(-50%, 0)`;
      el.style.opacity = hidden ? "0" : String(THREE.MathUtils.clamp(1.6 - dist / 30, 0.45, 1));
      el.style.filter = dist > 32 ? "blur(0.6px)" : "none";
      el.style.pointerEvents = hidden ? "none" : "auto";
    };
    this.islands.forEach((isl, id) => place(id, isl.group, -1.1));
    this.headmasters.forEach((hm, id) => place(`hm:${id}`, hm.group, 1.6));
  }
}
