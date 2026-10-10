// A small turntable view of the player's avatar for the character creator: the same voxel figure as in the game,
// standing on a block of grass, turning slowly. Drag to spin it.

import * as THREE from "three";
import type { Appearance } from "@/walk/content";
import { VoxelBuilder } from "./builder";
import { applyPose, buildPerson, createBones, puppetKind } from "./puppet";
import { makeTexture } from "./textures";

export interface AvatarView {
  setAppearance(appearance: Appearance): void;
  destroy(): void;
}

/** Mount the view in `parent`, filling it. Throws if WebGL isn't available. */
export function createAvatarView(parent: HTMLElement, appearance: Appearance): AvatarView {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  const canvas = renderer.domElement;
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

  const textures = (["cloth", "grass", "grassSide", "dirt"] as const).map((k) => makeTexture(k));
  const [cloth, grass, grassSide, dirt] = textures;
  const materials = {
    cloth: new THREE.MeshLambertMaterial({ map: cloth, vertexColors: true }),
    grass: new THREE.MeshLambertMaterial({ map: grass, vertexColors: true }),
    grassSide: new THREE.MeshLambertMaterial({ map: grassSide, vertexColors: true }),
    dirt: new THREE.MeshLambertMaterial({ map: dirt, vertexColors: true }),
  };

  // The grass block the avatar stands on, with a tuft and a flower.
  const turntable = new THREE.Group();
  scene.add(turntable);
  const block = new VoxelBuilder();
  block.box("grass", [-0.5, 0, -0.5], [0.5, 0, 0.5], 0xffffff, { skip: 59 });
  block.box("grassSide", [-0.5, -0.5, -0.5], [0.5, 0, 0.5], 0xffffff, { skip: 4, uvOffset: [0, 1] });
  block.box("dirt", [-0.5, -0.62, -0.5], [0.5, -0.5, 0.5], 0xffffff, { skip: 4 });
  block.box("cloth", [0.3, 0, 0.28], [0.35, 0.16, 0.33], 0x6f9e44);
  block.box("cloth", [0.36, 0, 0.3], [0.41, 0.11, 0.35], 0x6f9e44);
  block.box("cloth", [-0.36, 0, 0.3], [-0.33, 0.14, 0.33], 0x5f8a3b);
  block.box("cloth", [-0.39, 0.13, 0.27], [-0.3, 0.2, 0.36], 0xe0483e);
  const blockMeshes: THREE.Mesh[] = [];
  for (const [key, geometry] of block.build()) {
    const mesh = new THREE.Mesh(geometry, materials[key as keyof typeof materials]);
    turntable.add(mesh);
    blockMeshes.push(mesh);
  }

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

  // Size to the parent.
  const resize = () => {
    const w = parent.clientWidth || 160;
    const h = parent.clientHeight || 160;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(parent);

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
    renderer.render(scene, camera);
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
      if (figure) {
        figure.mesh.geometry.dispose();
        figure.mesh.skeleton.dispose();
      }
      for (const m of blockMeshes) m.geometry.dispose();
      for (const m of Object.values(materials)) m.dispose();
      for (const tex of textures) tex.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
