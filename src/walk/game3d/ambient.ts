// Small life that makes the world feel lived in: gulls wheeling over the lake by day, now and then a fish jumping
// near you, and fireflies over the hillside at night. All of it is a few instances and points, cheap to draw.

import * as THREE from "three";
import { hash2 } from "@/walk/world/noise";
import { VoxelBuilder } from "./builder";
import { groundHeight, heightAt, WATER_LEVEL, type HeightField } from "./heights";
import { makeGlowTexture } from "./textures";

const GULLS = 6;
const FIREFLIES = 44;

export class AmbientLife {
  readonly group = new THREE.Group();
  private gulls: THREE.InstancedMesh;
  private gullMaterial = new THREE.MeshLambertMaterial({ vertexColors: true });
  private gullPaths: { cx: number; cz: number; r: number; y: number; speed: number; phase: number }[] = [];
  private fish: THREE.Mesh;
  private fishMaterial = new THREE.MeshLambertMaterial({ vertexColors: true });
  private splash: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private jump: { from: THREE.Vector3; heading: number; t: number } | null = null;
  private nextJump = 4;
  private fireflies: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
  private fireflyHomes: { x: number; y: number; z: number; phase: number }[] = [];
  private glowTexture: THREE.Texture;
  private ringTexture: THREE.Texture;
  private readonly matrix = new THREE.Matrix4();
  private readonly quat = new THREE.Quaternion();
  private readonly euler = new THREE.Euler();
  private readonly pos = new THREE.Vector3();
  private readonly scale = new THREE.Vector3();

  constructor(private field: HeightField) {
    // A gull: white body, grey-tipped wings in a shallow V. Flapping squashes the V.
    const b = new VoxelBuilder();
    b.box("gull", [-0.08, -0.06, -0.22], [0.08, 0.06, 0.2], 0xf6f6f2, { bottom: true });
    b.box("gull", [-0.05, -0.02, 0.2], [0.05, 0.05, 0.28], 0xf0b040, { bottom: true });
    for (const s of [1, -1]) {
      b.push(new THREE.Matrix4().makeRotationZ(s * 0.35).setPosition(s * 0.06, 0, 0));
      b.box("gull", [s > 0 ? 0 : -0.4, -0.015, -0.1], [s > 0 ? 0.4 : 0, 0.015, 0.08], 0xeeeeea, { bottom: true });
      b.box("gull", [s > 0 ? 0.32 : -0.48, -0.015, -0.1], [s > 0 ? 0.48 : -0.32, 0.015, 0.06], 0x5a5a5e, { bottom: true });
      b.pop();
    }
    this.gulls = new THREE.InstancedMesh(b.build().get("gull")!, this.gullMaterial, GULLS);
    this.gulls.frustumCulled = false;
    for (let i = 0; i < GULLS; i++) {
      this.gullPaths.push({
        cx: 18 + i * 10 + hash2(i, 1, 80) * 6,
        cz: 46 + (i % 3) * 3,
        r: 4 + hash2(i, 2, 80) * 5,
        y: 5 + hash2(i, 3, 80) * 3,
        speed: 0.25 + hash2(i, 4, 80) * 0.15,
        phase: hash2(i, 5, 80) * 6,
      });
    }
    this.group.add(this.gulls);

    const fb = new VoxelBuilder();
    fb.box("fish", [-0.04, -0.05, -0.16], [0.04, 0.05, 0.14], 0xa8b8c4, { bottom: true });
    fb.box("fish", [-0.01, -0.07, -0.26], [0.01, 0.07, -0.16], 0x8a9ca8, { bottom: true });
    this.fish = new THREE.Mesh(fb.build().get("fish")!, this.fishMaterial);
    this.fish.visible = false;
    this.group.add(this.fish);

    this.ringTexture = makeGlowTexture(64, true);
    this.splash = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ map: this.ringTexture, transparent: true, depthWrite: false, opacity: 0, color: 0xeef6f8 }),
    );
    this.splash.rotation.x = -Math.PI / 2;
    this.splash.renderOrder = 3;
    this.group.add(this.splash);

    // Fireflies over the hillside and the olive grove.
    this.glowTexture = makeGlowTexture(32);
    const positions = new Float32Array(FIREFLIES * 3);
    for (let i = 0; i < FIREFLIES; i++) {
      const x = 2 + hash2(i, 1, 90) * 36;
      const z = 2 + hash2(i, 2, 90) * 28;
      this.fireflyHomes.push({ x, z, y: heightAt(field, x, z) + 0.5 + hash2(i, 3, 90) * 1.2, phase: hash2(i, 4, 90) * 10 });
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    this.fireflies = new THREE.Points(
      geometry,
      new THREE.PointsMaterial({
        map: this.glowTexture,
        color: 0xd8ff7a,
        size: 0.5,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        opacity: 0,
      }),
    );
    this.fireflies.frustumCulled = false;
    this.group.add(this.fireflies);
  }

  /** `daylight` and `night` are 0..1; `near` is the point the camera looks at. */
  update(t: number, dt: number, daylight: number, night: number, wind: number, near: THREE.Vector3) {
    // Gulls by day: circling, banking into the turn, flapping now and then between glides.
    const showGulls = daylight > 0.05;
    this.gulls.visible = showGulls;
    if (showGulls) {
      this.gullPaths.forEach((g, i) => {
        const a = t * g.speed + g.phase;
        this.pos.set(g.cx + Math.cos(a) * g.r, g.y + Math.sin(a * 2.3) * 0.4, g.cz + Math.sin(a) * g.r * 0.6);
        const heading = Math.atan2(-Math.sin(a) * g.r, Math.cos(a) * g.r * 0.6);
        this.euler.set(0, heading, -0.35);
        this.quat.setFromEuler(this.euler);
        const flap = Math.sin(t * 9 + i) > 0.2 ? 0.4 + Math.abs(Math.sin(t * 9 + i)) * 0.6 : 1;
        const s = daylight;
        this.scale.set(s, s * flap * (1 + wind * 0.2), s);
        this.matrix.compose(this.pos, this.quat, this.scale);
        this.gulls.setMatrixAt(i, this.matrix);
      });
      this.gulls.instanceMatrix.needsUpdate = true;
    }

    // A fish leaps somewhere near the camera's focus every so often.
    this.nextJump -= dt;
    if (!this.jump && this.nextJump <= 0) {
      this.nextJump = 4 + Math.random() * 7;
      for (let tries = 0; tries < 12; tries++) {
        const x = near.x + (Math.random() - 0.5) * 18;
        const z = near.z + (Math.random() - 0.5) * 14;
        if (heightAt(this.field, x, z) < WATER_LEVEL - 0.8 && groundHeight(this.field, x + 1, z) < WATER_LEVEL) {
          this.jump = { from: new THREE.Vector3(x, WATER_LEVEL, z), heading: Math.random() * Math.PI * 2, t: 0 };
          break;
        }
      }
    }
    if (this.jump) {
      const j = this.jump;
      j.t += dt / 0.9;
      const k = Math.min(1, j.t);
      const along = k * 0.9;
      this.fish.visible = k < 1;
      this.fish.position.set(j.from.x + Math.sin(j.heading) * along, WATER_LEVEL - 0.1 + Math.sin(k * Math.PI) * 0.75, j.from.z + Math.cos(j.heading) * along);
      this.fish.rotation.set(-Math.cos(k * Math.PI) * 1.1, j.heading, 0);
      // A ring spreads where it went in.
      const ringAge = Math.max(0, j.t - 0.95);
      this.splash.position.set(j.from.x + Math.sin(j.heading) * 0.9, WATER_LEVEL + 0.03, j.from.z + Math.cos(j.heading) * 0.9);
      this.splash.scale.setScalar(0.4 + ringAge * 2.2);
      this.splash.material.opacity = j.t > 0.95 ? Math.max(0, 0.8 - ringAge * 0.9) : 0;
      if (j.t > 1.9) {
        this.jump = null;
        this.splash.material.opacity = 0;
      }
    }

    // Fireflies blink and wander a little around where they live.
    this.fireflies.material.opacity = night;
    this.fireflies.visible = night > 0.02;
    if (this.fireflies.visible) {
      const p = this.fireflies.geometry.attributes.position as THREE.BufferAttribute;
      this.fireflyHomes.forEach((f, i) => {
        const s = t * 0.6 + f.phase;
        const blink = Math.max(0, Math.sin(t * 2.1 + f.phase * 3));
        p.setXYZ(i, f.x + Math.sin(s * 0.7) * 0.8, f.y + Math.sin(s * 1.3) * 0.25 - (blink > 0 ? 0 : 400), f.z + Math.cos(s * 0.9) * 0.6);
      });
      p.needsUpdate = true;
    }
  }

  dispose() {
    this.gulls.geometry.dispose();
    this.gulls.dispose();
    this.gullMaterial.dispose();
    this.fish.geometry.dispose();
    this.fishMaterial.dispose();
    this.splash.geometry.dispose();
    this.splash.material.dispose();
    this.fireflies.geometry.dispose();
    this.fireflies.material.dispose();
    this.glowTexture.dispose();
    this.ringTexture.dispose();
  }
}
