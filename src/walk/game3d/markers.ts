// Things drawn on the world to guide the player: the golden quest marker, soft rings where you can pray, read,
// rest or help, a ring where you tapped, and the round shadows that keep everyone standing on the ground.

import * as THREE from "three";
import { getActivity } from "@/walk/life/activities";
import { NEED_INFO } from "@/walk/life/needs";
import type { Need } from "@/walk/life/types";
import { VoxelBuilder } from "./builder";
import { makeGlowTexture } from "./textures";

const MAX_RINGS = 24;
const DEFAULT_RING = 0xf2d68a;
const ringColors = new Map<string, number>();

/**
 * A ring's colour: the colour of the need its activity feeds most (the same as that need's meter in the HUD),
 * lightened so it glows. Anything unknown glows a soft gold.
 */
export function activityColor(activity: string): number {
  let color = ringColors.get(activity);
  if (color === undefined) {
    color = needColor(activity);
    ringColors.set(activity, color);
  }
  return color;
}

function needColor(activity: string): number {
  const def = getActivity(activity);
  const gains = def ? (Object.entries(def.needs) as [Need, number][]).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]) : [];
  if (gains.length === 0) return DEFAULT_RING;
  const c = parseInt(NEED_INFO[gains[0][0]].color.slice(1), 16);
  const lift = (shift: number) => {
    const v = (c >> shift) & 255;
    return Math.round(v + (255 - v) * 0.35);
  };
  return (lift(16) << 16) | (lift(8) << 8) | lift(0);
}

export class Markers {
  readonly group = new THREE.Group();
  private ringTexture = makeGlowTexture(64, true);
  private blobTexture = makeGlowTexture(32);
  private quest: THREE.Group;
  private questGem: THREE.Mesh;
  private questHalo: THREE.Sprite;
  private questMaterial = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
  private questRing: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private rings: THREE.InstancedMesh;
  private ringMaterial: THREE.MeshBasicMaterial;
  private tap: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private tapAge = Infinity;
  private shadows: THREE.InstancedMesh;
  private shadowMaterial: THREE.MeshBasicMaterial;
  private shadowCount = 0;
  private plane = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  private readonly matrix = new THREE.Matrix4();
  private readonly color = new THREE.Color();

  constructor(private readonly maxShadows: number) {
    // A golden gem, stepped like a voxel diamond.
    const b = new VoxelBuilder();
    const layers: [number, number, number][] = [
      [0, 0.12, 0.08],
      [0.12, 0.28, 0.2],
      [0.28, 0.46, 0.3],
      [0.46, 0.62, 0.2],
      [0.62, 0.72, 0.1],
    ];
    for (const [y0, y1, r] of layers) b.box("gem", [-r, y0, -r], [r, y1, r], y0 < 0.3 ? 0xf0a830 : 0xffe080, { bottom: true });
    this.questGem = new THREE.Mesh(b.build().get("gem")!, this.questMaterial);
    this.questGem.position.y = 2;
    // A soft halo round the gem, so it catches the eye from across town.
    this.questHalo = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: this.blobTexture, color: 0xffd36a, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
    );
    this.questHalo.scale.setScalar(1.6);
    this.questRing = new THREE.Mesh(
      this.plane,
      new THREE.MeshBasicMaterial({ map: this.ringTexture, color: 0xffd36a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
    );
    this.questRing.scale.setScalar(2.4);
    this.questRing.position.y = 0.04;
    this.quest = new THREE.Group();
    this.quest.add(this.questGem, this.questHalo, this.questRing);
    this.quest.visible = false;
    this.group.add(this.quest);

    this.ringMaterial = new THREE.MeshBasicMaterial({
      map: this.ringTexture,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    this.rings = new THREE.InstancedMesh(this.plane, this.ringMaterial, MAX_RINGS);
    this.rings.count = 0;
    this.rings.frustumCulled = false;
    this.rings.renderOrder = 2;
    this.group.add(this.rings);

    this.tap = new THREE.Mesh(
      this.plane,
      new THREE.MeshBasicMaterial({ map: this.ringTexture, color: 0xffffff, transparent: true, depthWrite: false, opacity: 0, toneMapped: false }),
    );
    this.tap.renderOrder = 3;
    this.group.add(this.tap);

    this.shadowMaterial = new THREE.MeshBasicMaterial({
      map: this.blobTexture,
      color: 0x000000,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    this.shadows = new THREE.InstancedMesh(this.plane, this.shadowMaterial, Math.max(1, maxShadows));
    this.maxShadows = Math.max(1, maxShadows);
    this.shadows.count = 0;
    this.shadows.frustumCulled = false;
    this.shadows.renderOrder = 1;
    this.group.add(this.shadows);
  }

  /** Show the quest marker at a point (or hide it with null). */
  setQuest(at: THREE.Vector3 | null, t: number) {
    this.quest.visible = Boolean(at);
    if (!at) return;
    this.quest.position.copy(at);
    this.questGem.position.y = 2 + Math.sin(t * 2.6) * 0.15;
    this.questGem.rotation.y = t * 1.4;
    this.questHalo.position.y = this.questGem.position.y + 0.36;
    this.questHalo.material.opacity = 0.45 + Math.sin(t * 3) * 0.12;
    this.questRing.material.opacity = 0.55 + Math.sin(t * 3) * 0.3;
  }

  /** Activity rings near the player: position, colour, and how strongly each glows (0..1). */
  setRings(rings: { x: number; y: number; z: number; radius: number; color: number; strength: number }[], t: number) {
    const n = Math.min(rings.length, MAX_RINGS);
    for (let i = 0; i < n; i++) {
      const r = rings[i];
      const pulse = 1 + Math.sin(t * 2 + i) * 0.06;
      const size = Math.max(1.2, r.radius * 1.4) * pulse;
      this.matrix.makeScale(size, 1, size).setPosition(r.x, r.y + 0.05, r.z);
      this.rings.setMatrixAt(i, this.matrix);
      this.color.setHex(r.color).multiplyScalar(r.strength * (0.55 + Math.sin(t * 2 + i) * 0.15));
      this.rings.setColorAt(i, this.color);
    }
    this.rings.count = n;
    this.rings.instanceMatrix.needsUpdate = true;
    if (this.rings.instanceColor) this.rings.instanceColor.needsUpdate = true;
  }

  /** Mark where the player tapped. */
  showTap(at: THREE.Vector3, color = 0xffffff) {
    this.tap.position.copy(at).setY(at.y + 0.06);
    this.tap.material.color.setHex(color);
    this.tapAge = 0;
  }

  /** Round shadows under people and sheep: begin, add each, then end. */
  beginShadows() {
    this.shadowCount = 0;
  }

  addShadow(x: number, y: number, z: number, size: number) {
    if (this.shadowCount >= this.maxShadows) return;
    this.matrix.makeScale(size, 1, size).setPosition(x, y + 0.03, z);
    this.shadows.setMatrixAt(this.shadowCount, this.matrix);
    this.shadowCount++;
  }

  endShadows() {
    this.shadows.count = this.shadowCount;
    this.shadows.instanceMatrix.needsUpdate = true;
  }

  /** Softer round shadows when the sun casts real ones too. */
  setShadowStrength(opacity: number) {
    this.shadowMaterial.opacity = opacity;
  }

  update(dt: number) {
    this.tapAge += dt;
    const k = Math.min(1, this.tapAge / 0.6);
    this.tap.visible = k < 1;
    if (this.tap.visible) {
      this.tap.scale.setScalar(0.5 + k * 0.9);
      this.tap.material.opacity = (1 - k) * 0.9;
    }
  }

  dispose() {
    this.questGem.geometry.dispose();
    this.questMaterial.dispose();
    this.questRing.material.dispose();
    this.questHalo.material.dispose();
    this.ringMaterial.dispose();
    this.rings.dispose();
    this.tap.material.dispose();
    this.shadowMaterial.dispose();
    this.shadows.dispose();
    this.plane.dispose();
    this.ringTexture.dispose();
    this.blobTexture.dispose();
  }
}
