// Shared materials. Every textured material understands a per-vertex `sway` attribute, so trees, reeds, wheat and
// sails move in the wind in the vertex shader while staying merged into a handful of static meshes.

import * as THREE from "three";
import { makeTexture, type TextureKey } from "./textures";

export type MaterialKey = TextureKey | "glow" | "flame";

export interface SharedUniforms {
  uTime: { value: number };
  /** Wind, 0..1. */
  uWind: { value: number };
}

const SWAY_VERTEX_PARS = /* glsl */ `
attribute float sway;
uniform float uTime;
uniform float uWind;
`;

// Sway grows with the wind and differs from place to place, so a grove ripples rather than nodding in step.
const SWAY_VERTEX = /* glsl */ `
#include <begin_vertex>
if (sway > 0.0) {
  vec4 swayWorld = modelMatrix * vec4(transformed, 1.0);
  float phase = swayWorld.x * 0.37 + swayWorld.z * 0.23;
  float gust = 0.25 + uWind * 1.6;
  float speed = 1.2 + uWind * 1.8;
  transformed.x += sway * gust * (sin(uTime * speed + phase) * 0.055 + sin(uTime * speed * 2.3 + phase * 1.7) * 0.018);
  transformed.z += sway * gust * cos(uTime * speed * 0.8 + phase * 1.3) * 0.035;
}
`;

function patchSway(material: THREE.Material, uniforms: SharedUniforms) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime;
    shader.uniforms.uWind = uniforms.uWind;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\n${SWAY_VERTEX_PARS}`)
      .replace("#include <begin_vertex>", SWAY_VERTEX);
  };
  material.customProgramCacheKey = () => "walk-sway";
}

const TEXTURED: TextureKey[] = [
  "grass",
  "grassSide",
  "dirt",
  "sand",
  "stone",
  "limestone",
  "road",
  "plaza",
  "field",
  "meadow",
  "planks",
  "bark",
  "leaves",
  "cloth",
  "roof",
  "plain",
  "net",
];

/** The world's materials, created once and shared by every mesh. */
export class Materials {
  readonly uniforms: SharedUniforms = { uTime: { value: 0 }, uWind: { value: 0.2 } };
  /** Window and lantern glass: dark by day, warm light at night. */
  readonly glow: THREE.MeshLambertMaterial;
  /** Flames are always bright. */
  readonly flame: THREE.MeshBasicMaterial;
  readonly textures = new Map<TextureKey, THREE.Texture>();
  private readonly materials = new Map<MaterialKey, THREE.Material>();

  constructor(anisotropy = 1) {
    for (const key of TEXTURED) {
      const map = makeTexture(key, anisotropy);
      this.textures.set(key, map);
      const material = new THREE.MeshLambertMaterial({ map, vertexColors: true });
      if (key === "net") {
        material.alphaTest = 0.5;
        material.side = THREE.DoubleSide;
      }
      patchSway(material, this.uniforms);
      this.materials.set(key, material);
    }
    this.glow = new THREE.MeshLambertMaterial({ vertexColors: true, emissive: 0xffb45a, emissiveIntensity: 0 });
    this.flame = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
    this.materials.set("glow", this.glow);
    this.materials.set("flame", this.flame);
  }

  get(key: string): THREE.Material {
    const material = this.materials.get(key as MaterialKey);
    if (!material) throw new Error(`Unknown material "${key}"`);
    return material;
  }

  texture(key: TextureKey): THREE.Texture {
    return this.textures.get(key)!;
  }

  dispose() {
    for (const m of this.materials.values()) m.dispose();
    for (const t of this.textures.values()) t.dispose();
  }
}

/**
 * Turn a builder's geometries into meshes, one per material, added to `parent`. Shadows are cast and received
 * unless turned off.
 */
export function meshesFrom(
  geometries: Map<string, THREE.BufferGeometry>,
  materials: Materials,
  parent: THREE.Object3D,
  { cast = true, receive = true }: { cast?: boolean; receive?: boolean } = {},
): THREE.Mesh[] {
  const out: THREE.Mesh[] = [];
  for (const [key, geometry] of geometries) {
    const mesh = new THREE.Mesh(geometry, materials.get(key));
    mesh.castShadow = cast && key !== "glow" && key !== "flame";
    mesh.receiveShadow = receive && key !== "flame";
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
    parent.add(mesh);
    out.push(mesh);
  }
  return out;
}
