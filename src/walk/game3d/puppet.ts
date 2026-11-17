// People and sheep as blocky, Minecraft-proportioned puppets. Each puppet is a small skeleton of eight bones with
// box geometry bound rigidly to them, so a whole crowd shares one skinned mesh and one draw call, and every pose
// (walking, praying, sitting, working, sleeping) is just a few joint angles.

import * as THREE from "three";
import type { Appearance } from "@/walk/content";
import { css, hex, mix, shade } from "@/walk/game/art/color";
import { hash2 } from "@/walk/world/noise";
import type { Pose } from "@/walk/world/types";
import type { VoxelBuilder } from "./builder";

/** One model pixel, in blocks. A grown-up is 32 pixels tall: 1.6 blocks. */
export const PX = 0.05;
export const BONES_PER_PUPPET = 8;

export const Bone = { Root: 0, Hips: 1, Torso: 2, Head: 3, ArmL: 4, ArmR: 5, LegL: 6, LegR: 7 } as const;
export type Bone = (typeof Bone)[keyof typeof Bone];

export type PuppetKind = "person" | "child" | "sheep";

interface Dims {
  leg: number;
  torso: number;
  torsoW: number;
  torsoD: number;
  head: number;
  arm: number;
  armW: number;
  legW: number;
}

const ADULT: Dims = { leg: 12, torso: 12, torsoW: 8, torsoD: 4.6, head: 8, arm: 12, armW: 3.6, legW: 4.2 };
const CHILD: Dims = { leg: 7.5, torso: 8, torsoW: 6.4, torsoD: 4, head: 7, arm: 8.5, armW: 3, legW: 3.3 };

/** Height of the top of the head above the feet, in blocks, for name tags and tap targets. */
export function puppetHeight(kind: PuppetKind): number {
  if (kind === "sheep") return 0.75;
  const d = kind === "child" ? CHILD : ADULT;
  return (d.leg + d.torso + d.head + 1) * PX;
}

export function puppetKind(appearance: Appearance, species?: "sheep"): PuppetKind {
  if (species === "sheep") return "sheep";
  return appearance.build === "child" ? "child" : "person";
}

type Box = [number, number, number, number, number, number];

/** Add a box given in model pixels, bound to a bone of the puppet starting at bone index `base`. */
function px(b: VoxelBuilder, base: number, bone: Bone, [x0, y0, z0, x1, y1, z1]: Box, color: THREE.ColorRepresentation, bottom = false) {
  b.bone = base + bone;
  b.box("cloth", [x0 * PX, y0 * PX, z0 * PX], [x1 * PX, y1 * PX, z1 * PX], color, { uvScale: 1.25, bottom });
}

/** Geometry for a person in their resting pose, each part in its bone's own space. */
export function buildPerson(b: VoxelBuilder, base: number, a: Appearance) {
  const d = a.build === "child" ? CHILD : ADULT;
  const hw = d.torsoW / 2;
  const hd = d.torsoD / 2;
  const hh = d.head / 2;
  const robe = a.robe;
  const robeDark = shade(robe, -0.18);
  const under = shade(robe, -0.3);
  const skin = a.skin;
  const skinDark = shade(skin, -0.16);
  const hairBase = a.grey ? css(mix(a.hair, "#b0aaa0", 0.55)) : a.hair;
  const streak = a.grey ? css(mix(a.hair, "#d8d4cc", 0.75)) : shade(a.hair, 0.12);
  const sandal = "#6a4528";
  const seed = hex(a.robe)[0] + hex(a.skin)[1] * 3 + hex(a.hair)[2] * 7;

  // Legs: the under-robe down to the ankle, then sandalled feet.
  for (const bone of [Bone.LegL, Bone.LegR]) {
    const lw = d.legW / 2;
    px(b, base, bone, [-lw, -d.leg + 2, -hd + 0.2, lw, 0, hd - 0.2], under);
    px(b, base, bone, [-lw + 0.4, -d.leg + 0.5, -1.8, lw - 0.4, -d.leg + 2, 1.9], skinDark);
    px(b, base, bone, [-lw + 0.2, -d.leg, -2, lw - 0.2, -d.leg + 0.6, 2.6], sandal, true);
    px(b, base, bone, [-lw + 0.3, -d.leg + 1.3, 0.4, lw - 0.3, -d.leg + 1.8, 2.0], sandal);
  }

  // The outer robe from the waist to below the knee, a little wider than the body.
  const hem = -d.leg * 0.62;
  px(b, base, Bone.Hips, [-hw - 0.5, hem, -hd - 0.4, hw + 0.5, 0.6, hd + 0.4], robe);
  px(b, base, Bone.Hips, [-hw - 0.55, hem, -hd - 0.45, hw + 0.55, hem + 0.8, hd + 0.45], robeDark);

  // Body: robe, the two stripes woven into tunics of the time, the sash, and the neck opening.
  px(b, base, Bone.Torso, [-hw, 0, -hd, hw, d.torso, hd], robe);
  px(b, base, Bone.Torso, [-hw * 0.62, 1, hd, -hw * 0.38, d.torso - 0.2, hd + 0.12], robeDark);
  px(b, base, Bone.Torso, [hw * 0.38, 1, hd, hw * 0.62, d.torso - 0.2, hd + 0.12], robeDark);
  px(b, base, Bone.Torso, [-hw - 0.3, 0, -hd - 0.3, hw + 0.3, 1.8, hd + 0.3], a.sash);
  px(b, base, Bone.Torso, [hw * 0.15, -1.6, hd + 0.1, hw * 0.45, 0.2, hd + 0.5], a.sash);
  px(b, base, Bone.Torso, [-1.2, d.torso - 2.2, hd, 1.2, d.torso, hd + 0.1], skinDark);

  // Arms: sleeves and hands.
  const aw = d.armW / 2;
  for (const bone of [Bone.ArmL, Bone.ArmR]) {
    px(b, base, bone, [-aw, -d.arm + 3, -aw, aw, 1, aw], robe);
    px(b, base, bone, [-aw - 0.2, -d.arm + 3, -aw - 0.2, aw + 0.2, -d.arm + 4, aw + 0.2], robeDark);
    px(b, base, bone, [-aw + 0.25, -d.arm, -aw + 0.25, aw - 0.25, -d.arm + 3, aw - 0.25], skin, true);
  }

  // A mantle (cloak) over the shoulders and down the back, open at the front.
  if (a.mantle) {
    const m = a.mantle;
    px(b, base, Bone.Torso, [-hw - 0.45, 1.5, -hd - 0.9, hw + 0.45, d.torso + 0.5, -hd + 0.3], m);
    px(b, base, Bone.Torso, [-hw - 0.45, d.torso - 1.6, -hd - 0.9, hw + 0.45, d.torso + 0.55, hd + 0.35], m);
    px(b, base, Bone.Torso, [hw - 1.7, 2, hd - 0.2, hw + 0.45, d.torso - 1.5, hd + 0.45], m);
    px(b, base, Bone.Torso, [-hw - 0.45, 2, hd - 0.2, -hw + 1.7, d.torso - 1.5, hd + 0.45], m);
    px(b, base, Bone.Hips, [-hw - 0.6, hem + 1, -hd - 1.3, hw + 0.6, 0.8, -hd - 0.2], shade(m, -0.06));
    for (const bone of [Bone.ArmL, Bone.ArmR]) px(b, base, bone, [-aw - 0.35, -3.5, -aw - 0.35, aw + 0.35, 1.3, aw + 0.35], m);
  }

  // Head: face, eyes, brows and nose.
  px(b, base, Bone.Head, [-hh, 0, -hh, hh, d.head, hh], skin);
  const eyeY = d.head * 0.42;
  for (const s of [1, -1]) {
    const inner = s * 0.7;
    const outer = s * 2.5;
    px(b, base, Bone.Head, [Math.min(inner, outer), eyeY, hh, Math.max(inner, outer), eyeY + 1.3, hh + 0.08], "#f4efe6");
    const pupil = s * 1.6;
    px(b, base, Bone.Head, [Math.min(inner, pupil), eyeY, hh + 0.04, Math.max(inner, pupil), eyeY + 1.3, hh + 0.12], "#2a1e16");
    px(b, base, Bone.Head, [Math.min(s * 0.5, s * 2.8), eyeY + 1.7, hh, Math.max(s * 0.5, s * 2.8), eyeY + 2.3, hh + 0.1], hairBase);
  }
  px(b, base, Bone.Head, [-0.55, eyeY - 1.6, hh, 0.55, eyeY + 0.2, hh + 0.6], skinDark);

  // Beard, or a small mouth.
  if (a.beard !== "none" && a.build !== "child") {
    const full = a.beard === "full";
    px(b, base, Bone.Head, [-hh - 0.15, full ? -1.8 : -0.4, hh - 2.6, hh + 0.15, eyeY - 1.9, hh + 0.2], hairBase);
    px(b, base, Bone.Head, [-hh - 0.15, -0.2, -0.6, hh + 0.15, eyeY - 0.4, hh - 2.4], hairBase);
    px(b, base, Bone.Head, [-2.1, eyeY - 2.1, hh, 2.1, eyeY - 1.4, hh + 0.28], hairBase);
    px(b, base, Bone.Head, [-1, eyeY - 3.1, hh + 0.2, 1, eyeY - 2.6, hh + 0.3], shade(hairBase, -0.35));
    if (full) px(b, base, Bone.Head, [-2.6, -2.6, hh - 2, 2.6, -1.6, hh + 0.1], hairBase);
    if (a.grey) px(b, base, Bone.Head, [-1.5, full ? -1.8 : -0.4, hh + 0.2, -0.5, eyeY - 2.4, hh + 0.26], streak);
  } else {
    px(b, base, Bone.Head, [-1, eyeY - 2.8, hh, 1, eyeY - 2.3, hh + 0.08], shade(skin, -0.32));
  }

  // Hair, unless a head covering hides it.
  const style = a.hairStyle ?? "short";
  const covered = Boolean(a.headcloth);
  if (!covered) {
    if (style !== "bald") {
      px(b, base, Bone.Head, [-hh - 0.3, d.head - 1.6, -hh - 0.3, hh + 0.3, d.head + 0.5, hh + 0.3], hairBase);
      px(b, base, Bone.Head, [-hh - 0.3, 2.4, -hh - 0.3, hh + 0.3, d.head, -hh + 1.6], hairBase);
      px(b, base, Bone.Head, [-hh - 0.3, eyeY + 0.4, -hh, -hh, d.head, 1.2], hairBase);
      px(b, base, Bone.Head, [hh, eyeY + 0.4, -hh, hh + 0.3, d.head, 1.2], hairBase);
    } else {
      // A fringe around the back and sides of the head.
      px(b, base, Bone.Head, [-hh - 0.25, 2.6, -hh - 0.25, hh + 0.25, eyeY + 1.6, -hh + 1.2], hairBase);
      px(b, base, Bone.Head, [-hh - 0.25, 2.6, -hh, -hh, eyeY + 1.6, 1], hairBase);
      px(b, base, Bone.Head, [hh, 2.6, -hh, hh + 0.25, eyeY + 1.6, 1], hairBase);
    }
    if (style === "long") {
      px(b, base, Bone.Head, [-hh - 0.35, -3.2, -hh - 0.45, hh + 0.35, d.head - 1, -hh + 1.3], hairBase);
      px(b, base, Bone.Head, [-hh - 0.4, -1.5, -hh, -hh + 0.1, eyeY + 0.5, 2.4], hairBase);
      px(b, base, Bone.Head, [hh - 0.1, -1.5, -hh, hh + 0.4, eyeY + 0.5, 2.4], hairBase);
    }
    if (style === "curly") {
      for (let i = 0; i < 12; i++) {
        const u = hash2(i, seed, 3);
        const v = hash2(i, seed, 4);
        const onTop = i < 7;
        const x = -hh + u * (d.head - 1.4);
        const z = onTop ? -hh + v * (d.head - 1.4) : -hh - 0.6;
        const y = onTop ? d.head + 0.1 : 2.6 + v * (d.head - 3.6);
        px(b, base, Bone.Head, [x, y, z, x + 1.5, y + 1.1, z + 1.5], i % 3 === 0 ? streak : hairBase);
      }
    }
    if (a.grey && style !== "bald") {
      px(b, base, Bone.Head, [-hh * 0.4, d.head + 0.5, -hh - 0.3, -hh * 0.1, d.head + 0.6, hh + 0.3], streak);
      px(b, base, Bone.Head, [hh + 0.3, eyeY + 0.6, -hh * 0.6, hh + 0.35, d.head - 0.4, 0], streak);
      px(b, base, Bone.Head, [-hh - 0.35, eyeY + 0.6, -hh * 0.6, -hh - 0.3, d.head - 0.4, 0], streak);
    }
  } else {
    // Fringe under the cloth, then the cloth draping over the head, down the back and over the shoulders.
    if (style !== "bald") px(b, base, Bone.Head, [-hh + 0.4, d.head - 1.5, hh - 0.6, hh - 0.4, d.head - 0.6, hh + 0.12], hairBase);
    const cloth = a.headcloth!;
    const fold = shade(cloth, -0.14);
    px(b, base, Bone.Head, [-hh - 0.5, d.head - 1.2, -hh - 0.6, hh + 0.5, d.head + 0.9, hh + 0.5], cloth);
    px(b, base, Bone.Head, [-hh - 0.6, -3, -hh - 0.9, hh + 0.6, d.head - 0.6, -hh + 1.8], fold);
    px(b, base, Bone.Head, [-hh - 0.6, -2.4, -hh, -hh, d.head - 0.6, hh - 2], cloth);
    px(b, base, Bone.Head, [hh, -2.4, -hh, hh + 0.6, d.head - 0.6, hh - 2], cloth);
    // Men tie theirs with a cord.
    if (a.beard !== "none") px(b, base, Bone.Head, [-hh - 0.6, d.head - 1.3, -hh - 0.7, hh + 0.6, d.head - 0.6, hh + 0.6], shade(a.sash, -0.1));
  }
}

/** A sheep: a woolly block with a dark face and legs. */
export function buildSheep(b: VoxelBuilder, base: number) {
  const wool = "#ece6d6";
  const woolShade = "#d8d0bc";
  const face = "#3b332c";
  px(b, base, Bone.Torso, [-4.5, -3, -7, 4.5, 4.5, 6], wool);
  // Tufts so the fleece looks fluffy rather than boxy.
  for (let i = 0; i < 10; i++) {
    const u = hash2(i, base, 1);
    const v = hash2(i, base, 2);
    const x = -4.8 + u * 8;
    const z = -7.2 + v * 12;
    px(b, base, Bone.Torso, [x, 4, z, x + 1.8, 5.1, z + 1.8], i % 2 ? wool : woolShade);
  }
  px(b, base, Bone.Torso, [-1, -1, -7.8, 1, 2, -6.8], woolShade);
  px(b, base, Bone.Head, [-2.2, -2.6, 0, 2.2, 2, 4.4], face);
  px(b, base, Bone.Head, [-2.6, 1, -0.2, 2.6, 3, 2.6], wool);
  px(b, base, Bone.Head, [2.2, 0, 0.6, 3.8, 1, 1.8], face);
  px(b, base, Bone.Head, [-3.8, 0, 0.6, -2.2, 1, 1.8], face);
  px(b, base, Bone.Head, [1, 0, 4.4, 1.8, 0.8, 4.5], "#e8e0c8");
  px(b, base, Bone.Head, [-1.8, 0, 4.4, -1, 0.8, 4.5], "#e8e0c8");
  for (const bone of [Bone.ArmL, Bone.ArmR, Bone.LegL, Bone.LegR]) px(b, base, bone, [-1, -6.5, -1, 1, 0, 1], face, true);
}

/** The skeleton for one puppet, with every bone at its resting place. */
export function createBones(kind: PuppetKind): THREE.Bone[] {
  const bones = Array.from({ length: BONES_PER_PUPPET }, () => new THREE.Bone());
  const [root, hips, torso, head, armL, armR, legL, legR] = bones;
  root.add(hips);
  if (kind === "sheep") {
    hips.position.set(0, 9 * PX, 0);
    hips.add(torso, head, armL, armR, legL, legR);
    head.position.set(0, 2 * PX, 6.5 * PX);
    armL.position.set(2.8 * PX, -2.5 * PX, 4.5 * PX);
    armR.position.set(-2.8 * PX, -2.5 * PX, 4.5 * PX);
    legL.position.set(2.8 * PX, -2.5 * PX, -4.8 * PX);
    legR.position.set(-2.8 * PX, -2.5 * PX, -4.8 * PX);
  } else {
    const d = kind === "child" ? CHILD : ADULT;
    hips.position.set(0, d.leg * PX, 0);
    hips.add(torso, legL, legR);
    torso.add(head, armL, armR);
    head.position.set(0, d.torso * PX, 0);
    const shoulder = (d.torsoW / 2 + d.armW / 2) * PX;
    armL.position.set(shoulder, (d.torso - 1) * PX, 0);
    armR.position.set(-shoulder, (d.torso - 1) * PX, 0);
    legL.position.set((d.legW / 2) * PX, 0, 0);
    legR.position.set((-d.legW / 2) * PX, 0, 0);
  }
  return bones;
}

// ---- Poses ----------------------------------------------------------------------------------------------------

/** Joint values for a moment of a pose. Angles in radians; offsets in model pixels. */
interface JointValues {
  hipsY: number;
  hipsZ: number;
  hipsPitch: number;
  hipsYaw: number;
  torsoPitch: number;
  breath: number;
  headPitch: number;
  headYaw: number;
  armLPitch: number;
  armLRoll: number;
  armRPitch: number;
  armRRoll: number;
  legLPitch: number;
  legRPitch: number;
}

const KEYS = [
  "hipsY",
  "hipsZ",
  "hipsPitch",
  "hipsYaw",
  "torsoPitch",
  "breath",
  "headPitch",
  "headYaw",
  "armLPitch",
  "armLRoll",
  "armRPitch",
  "armRRoll",
  "legLPitch",
  "legRPitch",
] as const;

export type Motion = Pose | "walk";

function neutral(): JointValues {
  return {
    hipsY: 0,
    hipsZ: 0,
    hipsPitch: 0,
    hipsYaw: 0,
    torsoPitch: 0,
    breath: 1,
    headPitch: 0,
    headYaw: 0,
    armLPitch: 0,
    armLRoll: 0.06,
    armRPitch: 0,
    armRRoll: -0.06,
    legLPitch: 0,
    legRPitch: 0,
  };
}

/**
 * Joint values for a pose at time `t` (seconds). `phase` runs the walk cycle; `seed` staggers idle motion so a
 * crowd doesn't breathe in unison. Pure, so it can be tested.
 */
export function poseJoints(kind: PuppetKind, motion: Motion, t: number, phase: number, seed: number, out = neutral()): JointValues {
  Object.assign(out, neutral());
  const leg = kind === "child" ? CHILD.leg : ADULT.leg;
  if (kind === "sheep") return sheepJoints(motion, t, phase, seed, out);
  const s = Math.sin(phase);
  switch (motion) {
    case "walk":
      out.legLPitch = -s * 0.55;
      out.legRPitch = s * 0.55;
      out.armLPitch = s * 0.5;
      out.armRPitch = -s * 0.5;
      out.hipsY = Math.abs(Math.cos(phase)) * 0.7 - 0.35;
      out.hipsYaw = s * 0.06;
      out.torsoPitch = 0.05;
      out.headPitch = 0.04;
      break;
    case "kneel":
      // Kneeling in prayer: knees down, hands together, head bowed.
      out.hipsY = -(leg - 3.2);
      out.legLPitch = 1.42;
      out.legRPitch = 1.42;
      out.torsoPitch = 0.08 + Math.sin(t * 0.9 + seed) * 0.015;
      out.headPitch = 0.38;
      out.armLPitch = -0.95;
      out.armLRoll = -0.36;
      out.armRPitch = -0.95;
      out.armRRoll = 0.36;
      out.breath = 1 + Math.sin(t * 1.6 + seed) * 0.01;
      break;
    case "sit":
      // Sitting on the ground, legs out in front, hands resting on the knees.
      out.hipsY = -(leg - 2.4);
      out.legLPitch = -1.45;
      out.legRPitch = -1.45;
      out.torsoPitch = -0.04;
      out.armLPitch = -0.55;
      out.armLRoll = 0.1;
      out.armRPitch = -0.55;
      out.armRRoll = -0.1;
      out.headPitch = 0.08 + Math.sin(t * 0.5 + seed) * 0.05;
      out.headYaw = Math.sin(t * 0.3 + seed) * 0.25;
      out.breath = 1 + Math.sin(t * 1.8 + seed) * 0.012;
      break;
    case "work": {
      // Bent to the task, arms hauling in turn: nets, water jars, a plank.
      const pull = Math.sin(t * 3.4 + seed);
      out.torsoPitch = 0.36 + pull * 0.05;
      out.headPitch = 0.22;
      out.armLPitch = -0.95 + pull * 0.45;
      out.armRPitch = -0.95 - pull * 0.45;
      out.armLRoll = -0.12;
      out.armRRoll = 0.12;
      out.hipsY = -0.6 + Math.abs(pull) * 0.3;
      out.legLPitch = -0.12;
      out.legRPitch = 0.1;
      break;
    }
    case "sleep":
      // Lying on their back, breathing slowly.
      out.hipsY = -(leg - 2.4);
      out.hipsPitch = -Math.PI / 2;
      out.breath = 1 + Math.sin(t * 1.1 + seed) * 0.025;
      out.armLRoll = 0.12;
      out.armRRoll = -0.12;
      out.headYaw = 0.2;
      break;
    default:
      // Standing: gentle breathing, arms at rest, now and then a look around.
      out.breath = 1 + Math.sin(t * 2 + seed) * 0.012;
      out.armLPitch = Math.sin(t * 1.3 + seed) * 0.04;
      out.armRPitch = -Math.sin(t * 1.3 + seed) * 0.04;
      out.headYaw = Math.sin(t * 0.37 + seed * 2) * 0.22;
      out.headPitch = Math.sin(t * 0.23 + seed) * 0.05;
  }
  return out;
}

function sheepJoints(motion: Motion, t: number, phase: number, seed: number, out: JointValues): JointValues {
  out.armLRoll = 0;
  out.armRRoll = 0;
  if (motion === "walk") {
    const s = Math.sin(phase * 1.4);
    out.armLPitch = -s * 0.5;
    out.legRPitch = -s * 0.5;
    out.armRPitch = s * 0.5;
    out.legLPitch = s * 0.5;
    out.hipsY = Math.abs(s) * 0.5;
    out.headPitch = 0.1;
  } else if (motion === "sleep" || motion === "sit" || motion === "kneel") {
    out.hipsY = -5.2;
    out.armLPitch = -1.4;
    out.armRPitch = -1.4;
    out.legLPitch = 1.4;
    out.legRPitch = 1.4;
    out.headPitch = 0.2;
    out.breath = 1 + Math.sin(t * 1.3 + seed) * 0.02;
  } else {
    // Grazing: head down to the grass for a while, then up to look around.
    const graze = Math.sin(t * 0.45 + seed * 3) > -0.2;
    out.headPitch = graze ? 0.75 + Math.sin(t * 5 + seed) * 0.06 : -0.1;
    out.headYaw = graze ? 0 : Math.sin(t * 0.8 + seed) * 0.4;
    out.breath = 1 + Math.sin(t * 2.2 + seed) * 0.015;
  }
  return out;
}

const _a = neutral();
const _b = neutral();

/**
 * Pose a puppet's bones: blend from the previous motion into the current one (`blend` 0..1) and apply the joints.
 * The root (position and turn in the world) is set by the caller.
 */
export function applyPose(
  bones: THREE.Bone[],
  kind: PuppetKind,
  from: Motion,
  to: Motion,
  blend: number,
  t: number,
  phase: number,
  seed: number,
) {
  poseJoints(kind, to, t, phase, seed, _b);
  if (blend < 1) {
    poseJoints(kind, from, t, phase, seed, _a);
    const k = blend * blend * (3 - 2 * blend);
    for (const key of KEYS) _b[key] = _a[key] + (_b[key] - _a[key]) * k;
  }
  const j = _b;
  const [, hips, torso, head, armL, armR, legL, legR] = bones;
  const rest = kind === "sheep" ? 9 : kind === "child" ? CHILD.leg : ADULT.leg;
  hips.position.y = (rest + j.hipsY) * PX;
  hips.position.z = j.hipsZ * PX;
  hips.rotation.set(j.hipsPitch, j.hipsYaw, 0);
  torso.rotation.x = j.torsoPitch;
  torso.scale.y = j.breath;
  head.rotation.set(j.headPitch, j.headYaw, 0);
  armL.rotation.set(j.armLPitch, 0, j.armLRoll);
  armR.rotation.set(j.armRPitch, 0, j.armRRoll);
  legL.rotation.x = j.legLPitch;
  legR.rotation.x = j.legRPitch;
}
