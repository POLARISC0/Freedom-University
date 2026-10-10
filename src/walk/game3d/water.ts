// The Sea of Galilee: one animated, slightly see-through surface. Waves grow with the wind and calm near the shore,
// the colour follows the time of day, sunlight glints off it, and pixel foam laps at the beach.

import * as THREE from "three";
import { heightAt, WATER_LEVEL, type HeightField } from "./heights";
import { EDGE } from "./terrain";

const VERTEX = /* glsl */ `
attribute float depth;
attribute float shore;
uniform float uTime;
uniform float uWave;
varying float vDepth;
varying float vShore;
varying vec3 vWorld;
varying vec3 vNormal;
#include <fog_pars_vertex>

float waveHeight(vec2 p) {
  return sin(p.x * 0.55 + uTime * 1.1) * cos(p.y * 0.42 + uTime * 0.8) * 0.6
    + sin((p.x + p.y) * 0.9 - uTime * 1.7) * 0.3
    + sin(p.x * 1.7 - p.y * 1.3 + uTime * 2.3) * 0.12;
}

void main() {
  vec3 p = position;
  // Waves die down in the shallows so the water never climbs the beach.
  float amp = uWave * (0.2 + 0.8 * smoothstep(0.1, 1.4, depth));
  p.y += waveHeight(p.xz) * amp;
  float e = 0.25;
  float hx = (waveHeight(p.xz + vec2(e, 0.0)) - waveHeight(p.xz - vec2(e, 0.0))) * amp / (2.0 * e);
  float hz = (waveHeight(p.xz + vec2(0.0, e)) - waveHeight(p.xz - vec2(0.0, e))) * amp / (2.0 * e);
  vNormal = normalize(vec3(-hx, 1.0, -hz));
  vDepth = depth;
  vShore = shore;
  vWorld = (modelMatrix * vec4(p, 1.0)).xyz;
  vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

const FRAGMENT = /* glsl */ `
uniform vec3 uDeep;
uniform vec3 uShallow;
uniform vec3 uSky;
uniform vec3 uSunColor;
uniform vec3 uSunDir;
uniform float uSun;
uniform float uTime;
uniform float uWave;
varying float vDepth;
varying float vShore;
varying vec3 vWorld;
varying vec3 vNormal;
#include <fog_pars_fragment>

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  float d = clamp(vDepth / 1.3, 0.0, 1.0);
  vec3 color = mix(uShallow, uDeep, smoothstep(0.05, 1.0, d));
  // Ripples on a 16-per-block grid keep the surface in the same pixel style as the land.
  vec2 cell = floor(vWorld.xz * 16.0);
  float ripple = hash(cell + floor(uTime * 3.0 + hash(cell) * 4.0)) - 0.5;
  vec3 n = normalize(vNormal + vec3(ripple * 0.12, 0.0, ripple * 0.08));
  vec3 view = normalize(cameraPosition - vWorld);
  float fresnel = pow(1.0 - max(dot(n, view), 0.0), 3.0);
  color = mix(color, uSky, fresnel * 0.45);
  color += ripple * 0.025;
  // Sunlight glinting off the waves, and the odd sparkle.
  vec3 r = reflect(-view, n);
  float glint = pow(max(dot(r, uSunDir), 0.0), 90.0) * uSun;
  float sparkle = step(0.994 - uWave * 0.004, hash(cell * 0.37 + floor(uTime * 2.0))) * uSun * smoothstep(0.2, 0.9, d);
  color += uSunColor * (glint * 1.2 + sparkle * 0.7);
  // Foam where the water meets the sand: broken pixel lines that come and go with the lapping.
  float lap = 0.5 + 0.5 * sin(uTime * 1.3 + vWorld.x * 0.6 + vWorld.z * 0.3);
  float band = 1.0 - smoothstep(0.0, 0.35 + lap * 0.35 + uWave * 0.3, vShore);
  float foam = band * step(0.42, hash(floor(vWorld.xz * 8.0) + floor(uTime * 1.5)));
  color = mix(color, vec3(0.94, 0.97, 0.96), foam * 0.8);
  float alpha = mix(0.6, 0.93, d);
  alpha = max(alpha, foam * 0.9);
  gl_FragColor = vec4(color, alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

export interface Water {
  mesh: THREE.Mesh;
  material: THREE.ShaderMaterial;
  update(t: number, wave: number, colors: { deep: THREE.Color; shallow: THREE.Color; sky: THREE.Color; sun: THREE.Color; sunDir: THREE.Vector3; sunStrength: number }): void;
  dispose(): void;
}

/** The lake surface over the map (and past its edges out to the horizon). */
export function createWater(field: HeightField): Water {
  const { width: w, height: h } = field;
  // The lake lies to the south; find where the water starts.
  let northmost = h;
  for (let i = 0; i < field.tiles.length; i++) {
    if (field.heights[i] < WATER_LEVEL) northmost = Math.min(northmost, Math.floor(i / w));
  }
  const pad = 60;
  const x0 = -EDGE - pad;
  const x1 = w + EDGE + pad;
  const z0 = Math.max(-EDGE, northmost - 2);
  const z1 = h + EDGE + pad;
  const cols = x1 - x0 + 1;
  const rows = z1 - z0 + 1;

  // Ground under the water, and distance (in tiles) to the nearest dry tile, for colour and foam.
  const inTerrain = (x: number, z: number) => x >= -EDGE && x < w + EDGE && z >= -EDGE && z < h + EDGE;
  const ground = (x: number, z: number) => (inTerrain(x, z) ? heightAt(field, x, z) : -2);
  const tw = cols;
  const th = rows;
  const dist = new Float32Array(tw * th).fill(Infinity);
  const queue: number[] = [];
  for (let j = 0; j < th; j++) {
    for (let i = 0; i < tw; i++) {
      if (ground(x0 + i, z0 + j) > WATER_LEVEL) {
        dist[j * tw + i] = 0;
        queue.push(j * tw + i);
      }
    }
  }
  for (let head = 0; head < queue.length; head++) {
    const k = queue[head];
    const i = k % tw;
    const j = (k - i) / tw;
    for (const [di, dj] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const ni = i + di;
      const nj = j + dj;
      if (ni < 0 || nj < 0 || ni >= tw || nj >= th) continue;
      const nk = nj * tw + ni;
      if (dist[nk] > dist[k] + 1) {
        dist[nk] = dist[k] + 1;
        queue.push(nk);
      }
    }
  }

  const positions = new Float32Array(cols * rows * 3);
  const depth = new Float32Array(cols * rows);
  const shore = new Float32Array(cols * rows);
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const k = j * cols + i;
      const x = x0 + i;
      const z = z0 + j;
      positions[k * 3] = x;
      positions[k * 3 + 1] = WATER_LEVEL;
      positions[k * 3 + 2] = z;
      // A vertex sits on the corner of four tiles: average their depth, and take the nearest shore.
      let sum = 0;
      let near = Infinity;
      for (const [dx, dz] of [
        [-1, -1],
        [0, -1],
        [-1, 0],
        [0, 0],
      ]) {
        sum += Math.max(0, WATER_LEVEL - ground(x + dx, z + dz));
        const ti = i + dx;
        const tj = j + dz;
        const dd = ti >= 0 && tj >= 0 && ti < tw && tj < th ? dist[tj * tw + ti] : Infinity;
        near = Math.min(near, dd);
      }
      depth[k] = sum / 4;
      shore[k] = Math.min(near, 8);
    }
  }
  const indices: number[] = [];
  for (let j = 0; j < rows - 1; j++) {
    for (let i = 0; i < cols - 1; i++) {
      const a = j * cols + i;
      const b = a + 1;
      const c = a + cols;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("depth", new THREE.BufferAttribute(depth, 1));
  geometry.setAttribute("shore", new THREE.BufferAttribute(shore, 1));
  geometry.setIndex(positions.length / 3 > 65535 ? new THREE.Uint32BufferAttribute(indices, 1) : new THREE.Uint16BufferAttribute(indices, 1));
  geometry.computeBoundingSphere();

  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uTime: { value: 0 },
        uWave: { value: 0.1 },
        uDeep: { value: new THREE.Color() },
        uShallow: { value: new THREE.Color() },
        uSky: { value: new THREE.Color() },
        uSunColor: { value: new THREE.Color() },
        uSunDir: { value: new THREE.Vector3(0, 1, 0) },
        uSun: { value: 1 },
      },
    ]),
    transparent: true,
    depthWrite: false,
    fog: true,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = 1;
  mesh.frustumCulled = false;

  return {
    mesh,
    material,
    update(t, wave, c) {
      const u = material.uniforms;
      u.uTime.value = t;
      u.uWave.value = wave;
      u.uDeep.value.copy(c.deep);
      u.uShallow.value.copy(c.shallow);
      u.uSky.value.copy(c.sky);
      u.uSunColor.value.copy(c.sun);
      u.uSunDir.value.copy(c.sunDir);
      u.uSun.value = c.sunStrength;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
