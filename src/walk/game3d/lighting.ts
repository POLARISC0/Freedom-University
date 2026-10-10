// Light for the world: the sun (or the moon) as a directional light that casts shadows around the camera's focus,
// a hemisphere light for the sky above and the warm ground below, and a few point lights borrowed by the lamps,
// windows and fires nearest the player at night.

import * as THREE from "three";
import type { LightSource } from "./objects";

const POINT_LIGHTS = 4;
/** Three's physically based lights need a little more strength than the palette's 0..3 scale. */
const LIGHT_SCALE = 1.3;

export class Lighting {
  readonly hemi = new THREE.HemisphereLight(0xffffff, 0x806040, 1);
  readonly sun = new THREE.DirectionalLight(0xffffff, 2);
  private points: THREE.PointLight[] = [];
  private assigned: (LightSource | null)[] = [];
  private reassignIn = 0;
  private readonly dir = new THREE.Vector3();
  private readonly shadowSize: number;
  private readonly view = new THREE.Matrix4();
  private readonly inverse = new THREE.Matrix4();
  private readonly local = new THREE.Vector3();

  constructor(
    scene: THREE.Scene,
    private sources: LightSource[],
    private shadows: boolean,
    shadowMapSize: number,
  ) {
    scene.add(this.hemi, this.sun, this.sun.target);
    this.shadowSize = shadowMapSize;
    if (shadows) {
      this.sun.castShadow = true;
      this.sun.shadow.mapSize.set(shadowMapSize, shadowMapSize);
      this.sun.shadow.bias = -0.0006;
      this.sun.shadow.normalBias = 0.03;
      this.sun.shadow.camera.near = 1;
      this.sun.shadow.camera.far = 160;
    }
    for (let i = 0; i < POINT_LIGHTS; i++) {
      const light = new THREE.PointLight(0xffb45a, 0, 8, 1.6);
      scene.add(light);
      this.points.push(light);
      this.assigned.push(null);
    }
  }

  /**
   * Update for this moment. Colours are already blended for the time and weather; `sunDir` and `moonDir` are unit
   * vectors towards each; `lamp` (0..1) is how much the lamps are lit.
   */
  update(
    dt: number,
    t: number,
    sky: { sun: THREE.Color; sunIntensity: number; ambientSky: THREE.Color; ambientGround: THREE.Color; ambientIntensity: number },
    sunDir: THREE.Vector3,
    moonDir: THREE.Vector3,
    lamp: number,
    focus: THREE.Vector3,
    viewRadius: number,
  ) {
    this.hemi.color.copy(sky.ambientSky);
    this.hemi.groundColor.copy(sky.ambientGround);
    this.hemi.intensity = sky.ambientIntensity * LIGHT_SCALE;

    // By day the sun, by night the moon, crossing over around dawn and dusk. Kept above a low angle so shadows
    // stay a readable length.
    const k = THREE.MathUtils.smoothstep(sunDir.y, -0.06, 0.12);
    this.dir.copy(moonDir).lerp(sunDir, k);
    this.dir.y = Math.max(this.dir.y, 0.42);
    this.dir.normalize();
    this.sun.color.copy(sky.sun);
    this.sun.intensity = sky.sunIntensity * LIGHT_SCALE;
    this.sun.position.copy(focus).addScaledVector(this.dir, 70);
    this.sun.target.position.copy(focus);
    if (this.shadows) {
      const cam = this.sun.shadow.camera;
      const r = THREE.MathUtils.clamp(viewRadius, 12, 46);
      if (cam.right !== r) {
        cam.left = -r;
        cam.right = r;
        cam.top = r;
        cam.bottom = -r;
        cam.updateProjectionMatrix();
      }
      // Snap the light to whole shadow-map texels so shadow edges don't crawl as the camera follows.
      const texel = (2 * r) / this.shadowSize;
      this.view.lookAt(this.sun.position, focus, THREE.Object3D.DEFAULT_UP);
      this.inverse.copy(this.view).invert();
      const local = this.local.copy(this.sun.position).applyMatrix4(this.inverse);
      local.x = Math.round(local.x / texel) * texel;
      local.y = Math.round(local.y / texel) * texel;
      const shift = local.applyMatrix4(this.view).sub(this.sun.position);
      this.sun.position.add(shift);
      this.sun.target.position.add(shift);
    }

    // Lamps: give the few point lights to the light sources nearest the focus.
    this.reassignIn -= dt;
    if (this.reassignIn <= 0) {
      this.reassignIn = 0.5;
      const nearest = [...this.sources]
        .map((s) => ({ s, d: (s.x - focus.x) ** 2 + (s.z - focus.z) ** 2 }))
        .sort((a, b) => a.d - b.d)
        .slice(0, POINT_LIGHTS);
      for (let i = 0; i < POINT_LIGHTS; i++) {
        const s = nearest[i]?.s ?? null;
        this.assigned[i] = s;
        if (s) {
          this.points[i].position.set(s.x, s.y, s.z);
          this.points[i].color.setHex(s.color);
          this.points[i].distance = s.radius * 2.8;
        }
      }
    }
    for (let i = 0; i < POINT_LIGHTS; i++) {
      const s = this.assigned[i];
      const light = this.points[i];
      if (!s) {
        light.intensity = 0;
        continue;
      }
      const level = s.always ? Math.max(0.35, lamp) : lamp;
      const flicker = s.flicker ? 0.82 + Math.sin(t * 13 + i) * 0.1 + Math.sin(t * 7.3 + i * 2) * 0.08 : 1;
      light.intensity = level * flicker * (s.flicker ? 9 : 5);
    }
  }
}
