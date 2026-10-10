// A Sims-style camera: angled down at the player from above, following smoothly, turning in eighth-turns and
// zooming between a close look at faces and a view over much of the town. The maths is in small pure functions
// so it can be tested without a browser.

import * as THREE from "three";

/** One turn step: an eighth of a full circle. */
export const YAW_STEP = Math.PI / 4;
/** Zoom runs from 0 (close) to 1 (far). */
export const DEFAULT_ZOOM = 0.42;
const NEAR_DISTANCE = 6.5;
const FAR_DISTANCE = 46;
const NEAR_PITCH = THREE.MathUtils.degToRad(34);
const FAR_PITCH = THREE.MathUtils.degToRad(56);

/** The nearest whole step for a yaw angle. */
export function snapYaw(yaw: number): number {
  return Math.round(yaw / YAW_STEP) * YAW_STEP;
}

/** The yaw one step on from wherever the camera is heading. */
export function stepYaw(targetYaw: number, direction: 1 | -1): number {
  return snapYaw(targetYaw) + direction * YAW_STEP;
}

/** How far the camera sits from what it looks at, and how steeply it looks down, for a zoom level. */
export function zoomPose(zoom: number): { distance: number; pitch: number } {
  const z = THREE.MathUtils.clamp(zoom, 0, 1);
  return {
    distance: NEAR_DISTANCE * Math.pow(FAR_DISTANCE / NEAR_DISTANCE, z),
    pitch: NEAR_PITCH + (FAR_PITCH - NEAR_PITCH) * Math.pow(z, 0.7),
  };
}

/**
 * Where the camera sits relative to its target. Yaw 0 looks north (the camera is south of the target, so north is
 * up the screen); positive yaw swings the camera round to the east.
 */
export function cameraOffset(yaw: number, pitch: number, distance: number): { x: number; y: number; z: number } {
  const flat = Math.cos(pitch) * distance;
  return { x: Math.sin(yaw) * flat, y: Math.sin(pitch) * distance, z: Math.cos(yaw) * flat };
}

/**
 * Turn a direction on screen (x right, y down: what the arrow keys mean) into a direction in the world (x east,
 * y south), for the camera's yaw. Up on screen walks away from the camera.
 */
export function screenToWorld(x: number, y: number, yaw: number): { x: number; y: number } {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  return { x: x * c + y * s, y: -x * s + y * c };
}

/** Move `current` towards `target` by a fraction that is independent of frame rate. */
export function damp(current: number, target: number, rate: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-rate * dt));
}

/** A vertical field of view that keeps enough of the world in sight on tall, narrow phone screens. */
export function fieldOfView(aspect: number): number {
  const wide = 38;
  if (aspect >= 1) return wide;
  const keepWidth = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(19)) / aspect));
  return Math.min(58, Math.max(wide, keepWidth * 0.82));
}

/**
 * Where to put an arrow pointing at something off screen: on the edge of the visible area, towards the target.
 * `point` is the target in screen pixels; when it is behind the camera (`behind`), its direction is flipped.
 * Returns null when the target is comfortably on screen.
 */
export function edgeArrow(
  point: { x: number; y: number; behind: boolean },
  view: { width: number; height: number },
  margin = 28,
): { x: number; y: number; angle: number } | null {
  const cx = view.width / 2;
  const cy = view.height / 2;
  let dx = point.x - cx;
  let dy = point.y - cy;
  if (point.behind) {
    dx = -dx;
    dy = -dy;
    if (Math.hypot(dx, dy) < 1) dy = 1;
  } else if (point.x >= margin && point.x <= view.width - margin && point.y >= margin && point.y <= view.height - margin) {
    return null;
  }
  const angle = Math.atan2(dy, dx);
  const rx = Math.max(1, cx - margin);
  const ry = Math.max(1, cy - margin);
  const k = Math.min(rx / Math.max(Math.abs(Math.cos(angle)), 1e-6), ry / Math.max(Math.abs(Math.sin(angle)), 1e-6));
  return { x: cx + Math.cos(angle) * k, y: cy + Math.sin(angle) * k, angle };
}

/**
 * The person under a tap: each candidate is a vertical segment on screen (feet to head); the closest one within
 * `radius` pixels of the tap wins.
 */
export function pickNearest<T extends { x: number; top: number; bottom: number }>(candidates: T[], x: number, y: number, radius: number): T | null {
  let best: T | null = null;
  let bestD = radius;
  for (const c of candidates) {
    const cy = Math.max(c.top, Math.min(c.bottom, y));
    const d = Math.hypot(x - c.x, y - cy);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best;
}

export class CameraRig {
  readonly camera: THREE.PerspectiveCamera;
  /** The point the camera looks at, smoothed. */
  readonly target = new THREE.Vector3();
  yaw = 0;
  targetYaw = 0;
  zoom = DEFAULT_ZOOM;
  targetZoom = DEFAULT_ZOOM;
  private width = 1;
  private height = 1;
  private insets = { right: 0, bottom: 0 };
  private offset = { x: 0, y: 0 };
  private dragging = false;
  private started = false;

  constructor(private bounds: { width: number; height: number }) {
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.3, 700);
  }

  setSize(width: number, height: number) {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    this.camera.aspect = this.width / this.height;
    this.camera.fov = fieldOfView(this.camera.aspect);
    this.applyViewOffset();
  }

  /** Screen space covered by panels (CSS pixels): the player stays centred in the rest. */
  setInsets(right: number, bottom: number) {
    this.insets = { right: Math.max(0, right), bottom: Math.max(0, bottom) };
  }

  /** The visible area not covered by panels. */
  get viewport(): { width: number; height: number } {
    return { width: Math.max(1, this.width - this.insets.right), height: Math.max(1, this.height - this.insets.bottom) };
  }

  rotate(direction: 1 | -1) {
    this.targetYaw = stepYaw(this.targetYaw, direction);
  }

  zoomBy(amount: number) {
    this.targetZoom = THREE.MathUtils.clamp(this.targetZoom + amount, 0, 1);
  }

  /** Turning by dragging follows the pointer directly; letting go settles on the nearest step. */
  twist(radians: number) {
    this.dragging = true;
    this.targetYaw += radians;
    this.yaw = this.targetYaw;
  }

  endTwist() {
    this.dragging = false;
    this.targetYaw = snapYaw(this.targetYaw);
  }

  update(dt: number, follow: THREE.Vector3) {
    const x = THREE.MathUtils.clamp(follow.x, 0, this.bounds.width);
    const z = THREE.MathUtils.clamp(follow.z, 0, this.bounds.height);
    if (!this.started) {
      this.target.set(x, follow.y, z);
      this.started = true;
    } else {
      this.target.x = damp(this.target.x, x, 6, dt);
      this.target.y = damp(this.target.y, follow.y, 4, dt);
      this.target.z = damp(this.target.z, z, 6, dt);
    }
    if (!this.dragging) this.yaw = damp(this.yaw, this.targetYaw, 7, dt);
    this.zoom = damp(this.zoom, this.targetZoom, 8, dt);
    const { distance, pitch } = zoomPose(this.zoom);
    const o = cameraOffset(this.yaw, pitch, distance);
    this.camera.position.set(this.target.x + o.x, this.target.y + o.y, this.target.z + o.z);
    this.camera.lookAt(this.target);

    // Ease the view offset when a panel opens or closes.
    const ox = damp(this.offset.x, this.insets.right / 2, 8, dt);
    const oy = damp(this.offset.y, this.insets.bottom / 2, 8, dt);
    if (Math.abs(ox - this.offset.x) > 0.01 || Math.abs(oy - this.offset.y) > 0.01) {
      this.offset = { x: ox, y: oy };
      this.applyViewOffset();
    } else if (this.offset.x !== this.insets.right / 2 || this.offset.y !== this.insets.bottom / 2) {
      this.offset = { x: this.insets.right / 2, y: this.insets.bottom / 2 };
      this.applyViewOffset();
    }
  }

  get distance(): number {
    return zoomPose(this.zoom).distance;
  }

  private applyViewOffset() {
    if (this.offset.x === 0 && this.offset.y === 0) this.camera.clearViewOffset();
    // Shifting the view window moves the target from the screen's centre to the centre of the uncovered area.
    else this.camera.setViewOffset(this.width, this.height, this.offset.x, this.offset.y, this.width, this.height);
    this.camera.updateProjectionMatrix();
  }
}
