import * as THREE from "three";
import type { Look } from "@/content/world";
import { buildEnvironment, type Env } from "./environments";
import { buildIsland } from "./islands";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { glowTexture, seeded, solid, type Updater } from "./kit";
import { hudRing, type Linework, orbit, rail } from "./lines";

export interface SceneDistrict {
  id: string;
  code: string;
  kicker: string;
  color: string;
  status: "open" | "live" | "soon";
  space: { x: number; y: number; z: number };
  theme: { look: Look; skyTop: string; skyBottom: string };
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

const WORLD_SKY = { top: "#F7F8FB", bottom: "#E5E9F1" };
const HOME_CAMERA = new THREE.Vector3(0, 8.5, 24);
const HOME_TARGET = new THREE.Vector3(0, 0.5, 0);

// ---------- The scene ----------

export class WorldScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2(0, 0);
  private pointerActive = false;
  private updaters: Updater[] = [];
  private islands = new Map<string, { group: THREE.Group; base: THREE.Vector3; phase: number; scale: number; bloom: number }>();
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

    // High-key anime light: a white sun for the lit band and a saturated blue fill, so half-lit faces
    // go light blue and shadows a clear mid blue. Soft room reflections for the glass.
    this.scene.add(new THREE.AmbientLight("#5E8BFF", 1.8));
    const sun = new THREE.DirectionalLight("#ffffff", 2.6);
    sun.position.set(-4, 12, 9);
    this.scene.add(sun);
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

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
    const floor = new THREE.GridHelper(200, 100, "#c9d1e0", "#e3e8f1");
    floor.position.y = -6;
    floor.rotation.x = 0.03;
    const back = new THREE.GridHelper(200, 60, "#cfd5e2", "#e8ebf2");
    back.rotation.x = Math.PI / 2 - 0.25; // tilting into the distance
    back.position.set(0, 10, -45);
    for (const grid of [floor, back]) {
      (grid.material as THREE.Material).transparent = true;
      (grid.material as THREE.Material).opacity = 0.7;
      this.scene.add(grid);
    }

    // Orbit lines around downtown: a cyan and a yellow one drawn as crisp thin tubes, and a dashed outer one.
    const outer = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(new THREE.EllipseCurve(0, 0, 26, 26 * 0.62).getPoints(160).map((p) => new THREE.Vector3(p.x, 0, p.y))),
      new THREE.LineDashedMaterial({ color: "#7b8496", dashSize: 0.6, gapSize: 0.5, transparent: true, opacity: 0.45 }),
    );
    outer.computeLineDistances();
    const orbits = [orbit(13, 0.62, 0.02, "#1FB6FF"), orbit(19, 0.62, 0.022, "#FFC400"), outer];
    orbits.forEach((o, i) => {
      o.rotation.x = (i - 1) * 0.08;
      o.position.y = -1 + i * 0.6;
      this.scene.add(o);
    });
    this.updaters.push((t) => orbits.forEach((o, i) => (o.rotation.y = t * 0.015 * (i % 2 ? -1 : 1))));

    // A big HUD ring framing the world, and the magenta rail cutting across it.
    const frame = hudRing({ radius: 9, seed: 1, text: "FU://WORLD/01 · 7 DISTRICTS · 2 HEADMASTERS · EDUCATION ONLY · NO FINANCIAL ADVICE · " });
    frame.group.position.set(2.5, 4, -10);
    frame.group.rotation.set(-0.12, -0.3, 0.08);
    this.addLinework(frame);
    this.addLinework(rail(new THREE.Vector3(-34, -3.2, 16), new THREE.Vector3(34, 2.4, -26)));
  }

  private addLinework(work: Linework) {
    this.scene.add(work.group);
    this.updaters.push(work.update);
  }

  private buildDistricts() {
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
      this.pickables.push(island.group.userData.proxy as THREE.Object3D);
      this.islands.set(d.id, { group: island.group, base, phase: i * 1.3, scale: island.group.scale.x, bloom: 0 });
      this.updaters.push(island.update);

      // HUD rings around the city and the live district, like targeting overlays.
      const coords = `${(35.68 + d.space.x / 100).toFixed(4)}N ${(139.69 + d.space.z / 100).toFixed(4)}E`;
      const hud = d.theme.look === "hexcity" ? { radius: 3.9, tilt: -0.3 } : d.status === "live" ? { radius: 4.8, tilt: -Math.PI / 2 + 0.38 } : null;
      if (hud) {
        const ring = hudRing({ radius: hud.radius, seed: i + 2, text: `${d.code} · ${d.kicker.toUpperCase()} · ${coords} · ` });
        ring.group.position.copy(base).add(new THREE.Vector3(0, 1.1, 0));
        ring.group.rotation.x = hud.tilt;
        this.addLinework(ring);
      }

      if (d === downtown) return;
      // A bundle of curves from downtown, one thicker, with a pulse of light travelling along it.
      const to = new THREE.Vector3(base.x, base.y + 0.8, base.z);
      const mid = from.clone().lerp(to, 0.5).add(new THREE.Vector3(0, 4 + i * 0.3, 0));
      const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
      const lineMat = new THREE.MeshBasicMaterial({ color: d.color, transparent: true, opacity: 0.8 });
      this.scene.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 64, 0.03, 5), lineMat));
      const strands = [1, 2, 3, 4].map((k) => {
        const off = new THREE.Vector3(Math.sin(k * 2.1), Math.cos(k * 1.3), Math.sin(k * 0.7)).multiplyScalar(0.5 + k * 0.25);
        return new THREE.QuadraticBezierCurve3(from, mid.clone().add(off), to);
      });
      const strandMat = new THREE.LineBasicMaterial({ color: d.color, transparent: true, opacity: 0.45 });
      strands.forEach((c) => this.scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(c.getPoints(60)), strandMat)));
      const pulse = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: d.color, transparent: true, depthWrite: false }));
      pulse.scale.setScalar(0.9);
      this.scene.add(pulse);
      this.updaters.push((t) => {
        const k = (t * 0.18 + i * 0.17) % 1;
        pulse.position.copy(curve.getPoint(k));
        lineMat.opacity = 0.6 + 0.3 * Math.sin(t * 2 + i);
      });
    });
  }

  private buildHeadmasters(list: SceneHeadmaster[]) {
    list.forEach((h, i) => {
      const g = new THREE.Group();
      const facets = new THREE.IcosahedronGeometry(0.75, 1);
      facets.computeVertexNormals(); // one normal per face: flat facets
      const core = new THREE.Mesh(facets, solid(h.color));
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
    // Mostly pale specks, with the odd saturated one.
    const palette = ["#FFFFFF", "#CFE3FF", "#FFD6EA", "#C8F7E1", "#FFFFFF", "#CFE3FF", "#FF3D8B", "#00C2FF"].map((c) => new THREE.Color(c));
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
    const dt = Math.min(this.timer.getDelta(), 0.1);
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

    // Islands bob and turn, and bloom open on hover: their layers lift apart and spread out.
    this.islands.forEach((isl, id) => {
      isl.bloom = THREE.MathUtils.lerp(isl.bloom, id === this.hovered || id === this.focused ? 1 : 0, ease);
      isl.group.position.y = isl.base.y + Math.sin(t * 0.6 + isl.phase) * 0.28;
      if (!isl.group.userData.facesForward) isl.group.rotation.y += dt * 0.08;
      isl.group.scale.setScalar(isl.scale * (1 + 0.06 * isl.bloom));
      isl.group.children.forEach((c) => {
        const bloom = c.userData.bloom as { lift: number; spread: number } | undefined;
        const base = c.userData.base as THREE.Vector3 | undefined;
        if (!bloom || !base) return;
        const k = 1 + (bloom.spread - 1) * isl.bloom;
        c.position.set(base.x * k, base.y + bloom.lift * isl.bloom, base.z * k);
        c.scale.setScalar(k);
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
