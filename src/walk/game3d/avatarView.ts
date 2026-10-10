// A small turntable view of the player's avatar for the character creator: the same voxel figure as in the game,
// standing on a block of grass, turning slowly. Drag to spin it.
//
// Every view draws with one shared offscreen WebGL renderer and copies each frame onto its own 2D canvas. Making a
// WebGL context and compiling its shaders can hold up the page for seconds on a software GPU while the game is
// drawing too, so it happens once per page rather than each time the character creator opens: the renderer, its
// compiled materials and the grass block stay for the next view, and a view only ever frees its own figure.

import * as THREE from "three";
import type { Appearance } from "@/walk/content";
import { VoxelBuilder } from "./builder";
import { applyPose, buildPerson, createBones, puppetKind } from "./puppet";
import { makeTexture } from "./textures";

export interface AvatarView {
  setAppearance(appearance: Appearance): void;
  destroy(): void;
}

type MaterialKey = "cloth" | "grass" | "grassSide" | "dirt";

interface Shared {
  renderer: THREE.WebGLRenderer;
  materials: Record<MaterialKey, THREE.MeshLambertMaterial>;
  /** The grass block the avatar stands on, by material. */
  block: [MaterialKey, THREE.BufferGeometry][];
}

let shared: Shared | null = null;
let unavailable: unknown = null;

/** The renderer, materials and grass block every view shares, made on first use. Throws if WebGL isn't available. */
function sharedRenderer(): Shared {
  if (shared) return shared;
  if (unavailable) throw unavailable;
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch (error) {
    unavailable = error;
    throw error;
  }
  // Views size their own canvases in device pixels, so the shared buffer is in device pixels too.
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;

  const [cloth, grass, grassSide, dirt] = (["cloth", "grass", "grassSide", "dirt"] as const).map((k) => makeTexture(k));
  const materials = {
    cloth: new THREE.MeshLambertMaterial({ map: cloth, vertexColors: true }),
    grass: new THREE.MeshLambertMaterial({ map: grass, vertexColors: true }),
    grassSide: new THREE.MeshLambertMaterial({ map: grassSide, vertexColors: true }),
    dirt: new THREE.MeshLambertMaterial({ map: dirt, vertexColors: true }),
  };

  // The grass block, with a tuft and a flower.
  const b = new VoxelBuilder();
  b.box("grass", [-0.5, 0, -0.5], [0.5, 0, 0.5], 0xffffff, { skip: 59 });
  b.box("grassSide", [-0.5, -0.5, -0.5], [0.5, 0, 0.5], 0xffffff, { skip: 4, uvOffset: [0, 1] });
  b.box("dirt", [-0.5, -0.62, -0.5], [0.5, -0.5, 0.5], 0xffffff, { skip: 4 });
  b.box("cloth", [0.3, 0, 0.28], [0.35, 0.16, 0.33], 0x6f9e44);
  b.box("cloth", [0.36, 0, 0.3], [0.41, 0.11, 0.35], 0x6f9e44);
  b.box("cloth", [-0.36, 0, 0.3], [-0.33, 0.14, 0.33], 0x5f8a3b);
  b.box("cloth", [-0.39, 0.13, 0.27], [-0.3, 0.2, 0.36], 0xe0483e);
  const block = [...b.build()] as [MaterialKey, THREE.BufferGeometry][];

  shared = { renderer, materials, block };
  return shared;
}

/** Mount the view in `parent`, filling it. Throws if WebGL isn't available. */
export function createAvatarView(parent: HTMLElement, appearance: Appearance): AvatarView {
  const { renderer, materials, block } = sharedRenderer();
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) throw new Error("No 2D canvas for the avatar view");
  canvas.style.display = "block";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.touchAction = "none";
  canvas.style.cursor = "grab";
  parent.appendChild(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 50);
  scene.add(new THREE.HemisphereLight(0xe6f0ff, 0x8a7050, 1.6));
  const sun = new THREE.DirectionalLight(0xfff0dc, 2.6);
  sun.position.set(1.5, 3, 2.5);
  scene.add(sun);

  const turntable = new THREE.Group();
  scene.add(turntable);
  for (const [key, geometry] of block) turntable.add(new THREE.Mesh(geometry, materials[key]));

  let figure: { mesh: THREE.SkinnedMesh; bones: THREE.Bone[]; kind: ReturnType<typeof puppetKind> } | null = null;
  const build = (a: Appearance) => {
    if (figure) {
      turntable.remove(figure.mesh);
      figure.mesh.geometry.dispose();
      figure.mesh.skeleton.dispose();
    }
    const kind = puppetKind(a);
    const b = new VoxelBuilder({ skinned: true });
    buildPerson(b, 0, a);
    const bones = createBones(kind);
    const mesh = new THREE.SkinnedMesh(b.build().get("cloth")!, materials.cloth);
    mesh.add(bones[0]);
    mesh.bind(new THREE.Skeleton(bones, bones.map(() => new THREE.Matrix4())), new THREE.Matrix4());
    mesh.frustumCulled = false;
    turntable.add(mesh);
    figure = { mesh, bones, kind };
    // Frame the whole figure and its block; children are smaller, so come in a little closer.
    const child = kind === "child";
    camera.position.set(0, child ? 1.3 : 1.7, child ? 3.6 : 4.6);
    camera.lookAt(0, child ? 0.45 : 0.62, 0);
  };
  build(appearance);

  // Size to the parent, in device pixels.
  const resize = () => {
    const w = parent.clientWidth || 160;
    const h = parent.clientHeight || 160;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(w * ratio));
    canvas.height = Math.max(1, Math.round(h * ratio));
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(parent);

  /** Draw into the corner of the shared buffer (growing it if this view is the largest yet), then copy it here. */
  const draw = () => {
    const { width, height } = canvas;
    const source = renderer.domElement;
    if (source.width < width || source.height < height) renderer.setSize(Math.max(source.width, width), Math.max(source.height, height), false);
    renderer.setViewport(0, 0, width, height);
    renderer.render(scene, camera);
    context.clearRect(0, 0, width, height);
    // WebGL's viewport starts at the bottom-left of the buffer; the canvas's rows start at the top.
    context.drawImage(source, 0, source.height - height, width, height, 0, 0, width, height);
  };

  // Drag to spin; it carries on turning gently by itself a moment after you let go.
  let yaw = -0.5;
  let spin = 0;
  let dragging: { id: number; x: number } | null = null;
  let idleFor = 0;
  const down = (e: PointerEvent) => {
    dragging = { id: e.pointerId, x: e.clientX };
    canvas.setPointerCapture?.(e.pointerId);
    canvas.style.cursor = "grabbing";
  };
  const move = (e: PointerEvent) => {
    if (!dragging || dragging.id !== e.pointerId) return;
    const dx = e.clientX - dragging.x;
    dragging.x = e.clientX;
    yaw += dx * 0.012;
    spin = dx * 0.6;
  };
  const up = (e: PointerEvent) => {
    if (dragging?.id !== e.pointerId) return;
    dragging = null;
    idleFor = 0;
    canvas.style.cursor = "grab";
  };
  canvas.addEventListener("pointerdown", down);
  canvas.addEventListener("pointermove", move);
  canvas.addEventListener("pointerup", up);
  canvas.addEventListener("pointercancel", up);

  // Only draw while on screen and the tab is visible.
  let visible = true;
  const io = new IntersectionObserver((entries) => {
    visible = entries.some((e) => e.isIntersecting);
  });
  io.observe(parent);

  let raf = 0;
  let last = performance.now();
  let t = 0;
  const reduceMotion = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (!visible || document.hidden) return;
    t += dt;
    if (!dragging) {
      idleFor += dt;
      spin *= Math.exp(-4 * dt);
      yaw += spin * dt + (reduceMotion || idleFor < 1.5 ? 0 : dt * 0.45);
    }
    turntable.rotation.y = yaw;
    if (figure) applyPose(figure.bones, figure.kind, "stand", "stand", 1, t, 0, 0.7);
    draw();
  };
  raf = requestAnimationFrame(frame);

  return {
    setAppearance: (a) => build(a),
    destroy() {
      cancelAnimationFrame(raf);
      observer.disconnect();
      io.disconnect();
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
      // Only this view's figure: the renderer, materials and grass block are kept for the next view.
      if (figure) {
        figure.mesh.geometry.dispose();
        figure.mesh.skeleton.dispose();
        figure = null;
      }
      scene.clear();
      canvas.remove();
    },
  };
}
