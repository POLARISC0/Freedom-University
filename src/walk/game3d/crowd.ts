// Everyone in the world as puppets: all the townsfolk, disciples and sheep share one skinned mesh (one draw call),
// and the player has their own so a new look only rebuilds one figure. Each frame the puppets follow the world
// model: where they stand, which way they turn, and what they are doing.

import * as THREE from "three";
import type { Appearance } from "@/walk/content";
import type { Facing, Pose } from "@/walk/world/types";
import type { NpcState, Walker } from "@/walk/world/world";
import { VoxelBuilder } from "./builder";
import { damp } from "./camera";
import { groundHeight, type HeightField } from "./heights";
import type { Markers } from "./markers";
import { applyPose, BONES_PER_PUPPET, buildPerson, buildSheep, createBones, puppetHeight, puppetKind, type Motion, type PuppetKind } from "./puppet";

const FACING_YAW: Record<Facing, number> = { down: 0, up: Math.PI, right: Math.PI / 2, left: -Math.PI / 2 };
const BLEND_SECONDS = 0.28;
/** Tiles walked per full stride (two steps). */
const STRIDE = { person: 1.25, child: 0.9, sheep: 0.7 };

export interface Actor {
  /** The NPC id, or "player". */
  id: string;
  walker: Walker & { visible?: boolean };
  npc: NpcState | null;
  kind: PuppetKind;
  bones: THREE.Bone[];
  seed: number;
  /** World position of the feet (x east, y up, z south). */
  position: THREE.Vector3;
  yaw: number;
  motion: Motion;
  previous: Motion;
  blend: number;
  phase: number;
  last: { x: number; y: number } | null;
  shown: boolean;
}

/** Shortest signed difference between two angles. */
export function angleDelta(from: number, to: number): number {
  let d = (to - from) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export class Crowd {
  readonly group = new THREE.Group();
  readonly actors: Actor[] = [];
  readonly player: Actor;
  private crowdMesh: THREE.SkinnedMesh;
  private playerMesh: THREE.SkinnedMesh;
  private time = 0;

  constructor(
    npcs: NpcState[],
    player: Walker,
    appearance: Appearance,
    private material: THREE.Material,
    private field: HeightField,
    shadows: boolean,
  ) {
    const b = new VoxelBuilder({ skinned: true });
    const bones: THREE.Bone[] = [];
    npcs.forEach((npc, i) => {
      const kind = puppetKind(npc.def.appearance, npc.def.species);
      const base = i * BONES_PER_PUPPET;
      if (kind === "sheep") buildSheep(b, base);
      else buildPerson(b, base, npc.def.appearance);
      const actorBones = createBones(kind);
      bones.push(...actorBones);
      this.actors.push(this.actor(npc.def.id, npc, npc, kind, actorBones, i));
    });
    this.crowdMesh = this.skinnedMesh(b, bones, shadows);
    this.group.add(this.crowdMesh);

    const playerBones = createBones(puppetKind(appearance));
    this.player = this.actor("player", player, null, puppetKind(appearance), playerBones, npcs.length + 1);
    this.playerMesh = this.buildPlayerMesh(appearance, playerBones, shadows);
    this.group.add(this.playerMesh);
  }

  private actor(id: string, walker: Walker, npc: NpcState | null, kind: PuppetKind, bones: THREE.Bone[], index: number): Actor {
    return {
      id,
      walker,
      npc,
      kind,
      bones,
      seed: (index * 2.39) % (Math.PI * 2),
      position: new THREE.Vector3(),
      yaw: FACING_YAW[walker.facing] ?? 0,
      motion: "stand",
      previous: "stand",
      blend: 1,
      phase: 0,
      last: null,
      shown: true,
    };
  }

  private skinnedMesh(b: VoxelBuilder, bones: THREE.Bone[], shadows: boolean): THREE.SkinnedMesh {
    const geometry = b.build().get("cloth") ?? new THREE.BufferGeometry();
    const mesh = new THREE.SkinnedMesh(geometry, this.material);
    // Geometry is built in each bone's own space, so every bind matrix is the identity.
    const skeleton = new THREE.Skeleton(
      bones,
      bones.map(() => new THREE.Matrix4()),
    );
    for (let i = 0; i < bones.length; i += BONES_PER_PUPPET) mesh.add(bones[i]);
    mesh.bind(skeleton, new THREE.Matrix4());
    mesh.frustumCulled = false;
    mesh.castShadow = shadows;
    mesh.receiveShadow = shadows;
    return mesh;
  }

  private buildPlayerMesh(appearance: Appearance, bones: THREE.Bone[], shadows: boolean): THREE.SkinnedMesh {
    const b = new VoxelBuilder({ skinned: true });
    buildPerson(b, 0, appearance);
    return this.skinnedMesh(b, bones, shadows);
  }

  /** Rebuild the player's figure with a new look, keeping where they are and what they're doing. */
  setPlayerAppearance(appearance: Appearance) {
    const shadows = this.playerMesh.castShadow;
    this.group.remove(this.playerMesh);
    this.playerMesh.geometry.dispose();
    this.playerMesh.skeleton.dispose();
    const kind = puppetKind(appearance);
    const bones = createBones(kind);
    this.player.kind = kind;
    this.player.bones = bones;
    this.playerMesh = this.buildPlayerMesh(appearance, bones, shadows);
    this.group.add(this.playerMesh);
  }

  update(dt: number, markers: Markers) {
    this.time += dt;
    markers.beginShadows();
    for (const actor of this.actors) this.updateActor(actor, dt, markers);
    this.updateActor(this.player, dt, markers);
    markers.endShadows();
  }

  private updateActor(a: Actor, dt: number, markers: Markers) {
    const w = a.walker;
    const visible = a.npc ? a.npc.visible : true;
    const root = a.bones[0];
    if (!visible) {
      if (a.shown) root.scale.setScalar(0);
      a.shown = false;
      a.last = null;
      return;
    }
    if (!a.shown) root.scale.setScalar(1);
    a.shown = true;

    // Turn smoothly towards the way they're walking, or the way they face when still.
    const moved = a.last ? Math.hypot(w.pos.x - a.last.x, w.pos.y - a.last.y) : 0;
    let wantYaw = FACING_YAW[w.facing] ?? a.yaw;
    if (w.moving && a.last && moved > 1e-4) wantYaw = Math.atan2(w.pos.x - a.last.x, w.pos.y - a.last.y);
    const firstFrame = a.last === null;
    a.yaw = firstFrame ? wantYaw : a.yaw + angleDelta(a.yaw, wantYaw) * (1 - Math.exp(-12 * dt));
    a.last = { x: w.pos.x, y: w.pos.y };

    // What they're doing, blending from one motion into the next.
    const motion: Motion = w.moving ? "walk" : ((w.pose as Pose) ?? "stand");
    if (motion !== a.motion) {
      a.previous = a.motion;
      a.motion = motion;
      a.blend = 0;
    }
    a.blend = Math.min(1, a.blend + dt / BLEND_SECONDS);
    if (w.moving) a.phase += (moved / STRIDE[a.kind]) * Math.PI * 2;

    // Feet on the ground, easing over the half-block steps.
    const ground = groundHeight(this.field, w.pos.x, w.pos.y);
    a.position.set(w.pos.x, firstFrame ? ground : damp(a.position.y, ground, 14, dt), w.pos.y);
    root.position.copy(a.position);
    root.rotation.y = a.yaw;
    applyPose(a.bones, a.kind, a.previous, a.motion, a.blend, this.time, a.phase, a.seed);

    const size = a.kind === "sheep" ? 0.95 : a.kind === "child" ? 0.6 : motion === "sleep" ? 1.3 : 0.8;
    markers.addShadow(a.position.x, a.position.y, a.position.z, size);
  }

  /** Top of an actor's head, for name tags. */
  headHeight(a: Actor): number {
    return a.motion === "sleep" ? 0.5 : a.motion === "sit" || a.motion === "kneel" ? puppetHeight(a.kind) * 0.65 : puppetHeight(a.kind);
  }

  setShadows(enabled: boolean) {
    for (const m of [this.crowdMesh, this.playerMesh]) {
      m.castShadow = enabled;
      m.receiveShadow = enabled;
    }
  }

  dispose() {
    for (const m of [this.crowdMesh, this.playerMesh]) {
      m.geometry.dispose();
      m.skeleton.dispose();
    }
  }
}
