// Weather you can see: rain streaks falling around the camera (as many as the rain is heavy, slanting with the
// wind) and soft sheets of mist lying over the lake and the low ground.

import * as THREE from "three";
import { valueNoise } from "@/walk/world/noise";
import { makeCanvas } from "@/walk/game/art/color";
import { WATER_LEVEL } from "./heights";

const MAX_DROPS = 2600;
const BOX = { w: 34, h: 18 };

const RAIN_VERTEX = /* glsl */ `
attribute vec4 seed;
uniform float uTime;
uniform vec3 uCenter;
uniform float uWind;
varying float vAlpha;
#include <fog_pars_vertex>
void main() {
  float fall = 15.0 + seed.z * 5.0;
  float y = mod(seed.y * ${BOX.h.toFixed(1)} - uTime * fall, ${BOX.h.toFixed(1)});
  vec3 p = vec3(uCenter.x + (seed.x - 0.5) * ${BOX.w.toFixed(1)}, uCenter.y - 2.0 + y, uCenter.z + (seed.z - 0.5) * ${BOX.w.toFixed(1)});
  // The bottom end of each streak trails behind the top, slanting with the wind.
  vec3 dir = normalize(vec3(uWind * 0.6, -1.0, uWind * 0.15));
  p += dir * seed.w * 0.8;
  p.x += uWind * (${BOX.h.toFixed(1)} - y) * 0.25;
  vAlpha = smoothstep(0.0, 2.0, y) * smoothstep(${BOX.h.toFixed(1)}, ${(BOX.h - 3).toFixed(1)}, y);
  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

const RAIN_FRAGMENT = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
varying float vAlpha;
#include <fog_pars_fragment>
void main() {
  gl_FragColor = vec4(uColor, uOpacity * vAlpha);
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

export class WeatherEffects {
  readonly group = new THREE.Group();
  private rain: THREE.LineSegments<THREE.BufferGeometry, THREE.ShaderMaterial>;
  private mist: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>[] = [];
  private mistTexture: THREE.Texture;
  private readonly white = new THREE.Color(0xffffff);

  constructor() {
    const seeds = new Float32Array(MAX_DROPS * 2 * 4);
    for (let i = 0; i < MAX_DROPS; i++) {
      const s = [Math.random(), Math.random(), Math.random()];
      seeds.set([...s, 0], i * 8);
      seeds.set([...s, 1], i * 8 + 4);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("seed", new THREE.BufferAttribute(seeds, 4));
    // Positions are computed in the shader; three still wants a position attribute to know the vertex count.
    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(MAX_DROPS * 2 * 3), 3));
    geometry.setDrawRange(0, 0);
    this.rain = new THREE.LineSegments(
      geometry,
      new THREE.ShaderMaterial({
        vertexShader: RAIN_VERTEX,
        fragmentShader: RAIN_FRAGMENT,
        uniforms: THREE.UniformsUtils.merge([
          THREE.UniformsLib.fog,
          {
            uTime: { value: 0 },
            uCenter: { value: new THREE.Vector3() },
            uWind: { value: 0 },
            uColor: { value: new THREE.Color(0xc8d6e6) },
            uOpacity: { value: 0.5 },
          },
        ]),
        transparent: true,
        depthWrite: false,
        fog: true,
      }),
    );
    this.rain.frustumCulled = false;
    this.rain.renderOrder = 6;
    this.group.add(this.rain);

    this.mistTexture = mistTexture();
    for (const [y, size, alpha] of [
      [WATER_LEVEL + 0.45, 90, 1],
      [1.35, 70, 0.7],
      [2.3, 60, 0.45],
    ] as const) {
      const texture = this.mistTexture.clone();
      texture.needsUpdate = true;
      texture.repeat.set(size / 30, size / 30);
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(size, size),
        new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 0, depthWrite: false, color: 0xf2f4f6 }),
      );
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = y;
      mesh.renderOrder = 4;
      mesh.userData.alpha = alpha;
      mesh.visible = false;
      this.mist.push(mesh);
      this.group.add(mesh);
    }
  }

  update(t: number, center: THREE.Vector3, levels: { rain: number; fog: number; wind: number }, light: THREE.Color) {
    const drops = Math.round(MAX_DROPS * levels.rain);
    this.rain.geometry.setDrawRange(0, drops * 2);
    this.rain.visible = drops > 0;
    const u = this.rain.material.uniforms;
    u.uTime.value = t;
    u.uCenter.value.copy(center);
    u.uWind.value = levels.wind;
    u.uOpacity.value = 0.35 + levels.rain * 0.35;
    u.uColor.value.copy(light).lerp(this.white, 0.75);

    for (const [i, m] of this.mist.entries()) {
      m.material.opacity = levels.fog * 0.55 * (m.userData.alpha as number);
      m.visible = m.material.opacity > 0.01;
      m.position.x = center.x;
      m.position.z = center.z;
      // The texture stays put in the world as the sheet follows the camera, and drifts slowly downwind.
      const drift = t * (0.004 + i * 0.002) * (1 + levels.wind * 3);
      m.material.map!.offset.set(center.x / 30 + drift, -center.z / 30 + drift * 0.4);
      m.material.color.copy(light).lerp(this.white, 0.35);
    }
  }

  dispose() {
    this.rain.geometry.dispose();
    this.rain.material.dispose();
    for (const m of this.mist) {
      m.geometry.dispose();
      m.material.map?.dispose();
      m.material.dispose();
    }
    this.mistTexture.dispose();
  }
}

/** Soft, seamless patches of white for the mist. */
function mistTexture(): THREE.Texture {
  const size = 64;
  const { canvas, ctx } = makeCanvas(size, size);
  const image = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Tileable noise: sample on a torus by blending four wrapped copies.
      const fx = x / size;
      const fy = y / size;
      const n = (sx: number, sy: number) => valueNoise(sx * 6, sy * 6, 3) * 0.65 + valueNoise(sx * 12, sy * 12, 4) * 0.35;
      const v =
        n(fx, fy) * (1 - fx) * (1 - fy) + n(fx + 1, fy) * fx * (1 - fy) + n(fx, fy + 1) * (1 - fx) * fy + n(fx + 1, fy + 1) * fx * fy;
      const a = Math.max(0, Math.min(1, (v - 0.3) * 1.8));
      const i = (y * size + x) * 4;
      image.data[i] = 255;
      image.data[i + 1] = 255;
      image.data[i + 2] = 255;
      image.data[i + 3] = Math.round(a * 255);
    }
  }
  ctx.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
