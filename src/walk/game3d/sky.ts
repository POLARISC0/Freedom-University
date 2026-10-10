// The sky over Galilee: a gradient dome, a square Minecraft-style sun and moon, stars at night, and a few blocky
// clouds drifting with the wind. Clouds thin out over the player so they never hide the walk.

import * as THREE from "three";
import { hash2 } from "@/walk/world/noise";
import { makeCanvas } from "@/walk/game/art/color";
import { VoxelBuilder } from "./builder";

const DOME_VERTEX = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww;
}
`;

const DOME_FRAGMENT = /* glsl */ `
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uSunColor;
uniform vec3 uSunDir;
uniform float uGlow;
varying vec3 vDir;
void main() {
  float up = max(vDir.y, 0.0);
  vec3 color = mix(uHorizon, uZenith, pow(up, 0.55));
  color += uSunColor * pow(max(dot(vDir, uSunDir), 0.0), 24.0) * uGlow;
  gl_FragColor = vec4(color, 1.0);
  #include <colorspace_fragment>
}
`;

const CLOUD_COUNT = 14;

export class Sky {
  readonly group = new THREE.Group();
  private dome: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>;
  private stars: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
  private sun: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private moon: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private moonTexture: THREE.Texture;
  readonly clouds: THREE.InstancedMesh;
  private cloudMaterial: THREE.MeshLambertMaterial;
  private cloudUniforms = { uTarget: { value: new THREE.Vector3() }, uOpacity: { value: 0 } };
  private cloudSeeds: { x: number; z: number; y: number; scale: number; speed: number }[] = [];
  /** How far the clouds have drifted east, in blocks; cloud shadows on the ground follow it. */
  drift = 0;
  private readonly matrix = new THREE.Matrix4();
  private readonly sunWhite = new THREE.Color(0xfff6d8);
  private readonly span: { x0: number; x1: number; z0: number; z1: number };

  constructor(bounds: { width: number; height: number }) {
    this.dome = new THREE.Mesh(
      new THREE.SphereGeometry(400, 32, 16),
      new THREE.ShaderMaterial({
        vertexShader: DOME_VERTEX,
        fragmentShader: DOME_FRAGMENT,
        uniforms: {
          uZenith: { value: new THREE.Color() },
          uHorizon: { value: new THREE.Color() },
          uSunColor: { value: new THREE.Color() },
          uSunDir: { value: new THREE.Vector3(0, 1, 0) },
          uGlow: { value: 0.5 },
        },
        side: THREE.BackSide,
        depthWrite: false,
      }),
    );
    this.dome.renderOrder = -10;
    this.dome.frustumCulled = false;
    this.group.add(this.dome);

    // Stars scattered over the upper sky.
    const starCount = 600;
    const positions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const a = hash2(i, 1, 70) * Math.PI * 2;
      // More of them low in the sky, where a close-up camera can see them.
      const up = 0.03 + Math.pow(hash2(i, 2, 70), 1.8) * 0.97;
      const r = Math.sqrt(1 - up * up);
      positions.set([Math.cos(a) * r * 360, up * 360, Math.sin(a) * r * 360], i * 3);
    }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    this.stars = new THREE.Points(
      starGeometry,
      new THREE.PointsMaterial({ color: 0xfff8e8, size: 2.5, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, fog: false }),
    );
    this.stars.frustumCulled = false;
    this.stars.renderOrder = -9;
    this.group.add(this.stars);

    this.sun = new THREE.Mesh(
      new THREE.PlaneGeometry(26, 26),
      new THREE.MeshBasicMaterial({ color: 0xfff2c0, fog: false, depthWrite: false, transparent: true, toneMapped: false }),
    );
    this.moonTexture = moonTexture();
    this.moon = new THREE.Mesh(
      new THREE.PlaneGeometry(18, 18),
      new THREE.MeshBasicMaterial({ map: this.moonTexture, fog: false, depthWrite: false, transparent: true }),
    );
    this.sun.renderOrder = -8;
    this.moon.renderOrder = -8;
    this.group.add(this.sun, this.moon);

    // Clouds: flat, blocky slabs as in Minecraft, one shape instanced at different sizes.
    const b = new VoxelBuilder();
    const puffs: [number, number, number, number, number, number][] = [
      [-4, 0, -2.5, 4, 1, 2.5],
      [-2, 0, -4, 3, 1, -2.5],
      [-6, 0, -1, -4, 1, 2],
      [4, 0, -1.5, 6, 1, 1],
      [-1, 0, 2.5, 2, 1, 3.5],
      [-2, 1, -1.5, 2, 1.6, 1.5],
    ];
    for (const [x0, y0, z0, x1, y1, z1] of puffs) b.box("cloud", [x0, y0, z0], [x1, y1, z1], 0xffffff, { bottom: true });
    const geometry = b.build().get("cloud")!;
    this.cloudMaterial = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, depthWrite: false, emissive: 0x404448 });
    const uniforms = this.cloudUniforms;
    this.cloudMaterial.onBeforeCompile = (shader) => {
      shader.uniforms.uTarget = uniforms.uTarget;
      shader.uniforms.uOpacity = uniforms.uOpacity;
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vCloudWorld;")
        .replace("#include <worldpos_vertex>", "#include <worldpos_vertex>\nvCloudWorld = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;");
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vCloudWorld;\nuniform vec3 uTarget;\nuniform float uOpacity;")
        .replace(
          "#include <opaque_fragment>",
          `#include <opaque_fragment>
          // Thin out over the player and near the camera, so the clouds frame the view rather than hide it.
          float clear = smoothstep(10.0, 24.0, length(vCloudWorld.xz - uTarget.xz)) * smoothstep(8.0, 20.0, distance(vCloudWorld, cameraPosition));
          gl_FragColor.a *= uOpacity * clear;`,
        );
    };
    this.clouds = new THREE.InstancedMesh(geometry, this.cloudMaterial, CLOUD_COUNT);
    this.clouds.frustumCulled = false;
    this.clouds.renderOrder = 5;
    this.span = { x0: -30, x1: bounds.width + 30, z0: -20, z1: bounds.height + 20 };
    for (let i = 0; i < CLOUD_COUNT; i++) {
      this.cloudSeeds.push({
        x: this.span.x0 + hash2(i, 3, 71) * (this.span.x1 - this.span.x0),
        z: this.span.z0 + hash2(i, 4, 71) * (this.span.z1 - this.span.z0),
        y: 22 + hash2(i, 5, 71) * 5,
        scale: 0.8 + hash2(i, 6, 71) * 0.9,
        speed: 0.7 + hash2(i, 7, 71) * 0.6,
      });
    }
  }

  /** Follow the camera so the dome and stars always surround it; place the sun and moon. */
  update(
    dt: number,
    camera: THREE.Camera,
    target: THREE.Vector3,
    colors: { zenith: THREE.Color; horizon: THREE.Color; sun: THREE.Color },
    sunDir: THREE.Vector3,
    moonDir: THREE.Vector3,
    stars: number,
    cloud: number,
    wind: number,
  ) {
    this.dome.position.copy(camera.position);
    this.stars.position.copy(camera.position);
    const u = this.dome.material.uniforms;
    u.uZenith.value.copy(colors.zenith);
    u.uHorizon.value.copy(colors.horizon);
    u.uSunColor.value.copy(colors.sun);
    u.uSunDir.value.copy(sunDir);
    u.uGlow.value = Math.max(0, sunDir.y + 0.2) * (1 - cloud * 0.8) * 0.6;
    this.stars.material.opacity = stars;
    this.stars.visible = stars > 0.01;

    this.sun.position.copy(camera.position).addScaledVector(sunDir, 340);
    this.sun.lookAt(camera.position);
    this.sun.material.opacity = THREE.MathUtils.clamp(sunDir.y * 6 + 0.3, 0, 1) * (1 - cloud * 0.85);
    this.sun.material.color.copy(colors.sun).lerp(this.sunWhite, 0.5);
    this.sun.visible = this.sun.material.opacity > 0.01;
    this.moon.position.copy(camera.position).addScaledVector(moonDir, 340);
    this.moon.lookAt(camera.position);
    this.moon.material.opacity = THREE.MathUtils.clamp(moonDir.y * 6 + 0.2, 0, 1) * (1 - cloud * 0.7);
    this.moon.visible = this.moon.material.opacity > 0.01;

    // Clouds drift downwind and wrap around; more of them, and thicker, as the sky clouds over.
    this.drift += dt * (0.4 + wind * 2.2);
    this.cloudUniforms.uTarget.value.copy(target);
    this.cloudUniforms.uOpacity.value = 0.55 + cloud * 0.35;
    const shown = Math.round(4 + cloud * (CLOUD_COUNT - 4));
    const width = this.span.x1 - this.span.x0;
    this.cloudSeeds.forEach((c, i) => {
      const x = this.span.x0 + ((((c.x - this.span.x0 + this.drift * c.speed) % width) + width) % width);
      const s = i < shown ? c.scale * (1 + cloud * 0.5) : 0;
      this.matrix.makeScale(s, s * 0.8, s).setPosition(x, c.y, c.z);
      this.clouds.setMatrixAt(i, this.matrix);
    });
    this.clouds.instanceMatrix.needsUpdate = true;
    const grey = 1 - cloud * 0.35;
    this.cloudMaterial.color.setRGB(grey, grey, grey * 1.02);
    this.cloudMaterial.emissive.copy(colors.horizon).multiplyScalar(0.35);
  }

  dispose() {
    this.dome.geometry.dispose();
    this.dome.material.dispose();
    this.stars.geometry.dispose();
    this.stars.material.dispose();
    this.sun.geometry.dispose();
    this.sun.material.dispose();
    this.moon.geometry.dispose();
    this.moon.material.dispose();
    this.moonTexture.dispose();
    this.clouds.geometry.dispose();
    this.cloudMaterial.dispose();
    this.clouds.dispose();
  }
}

/** A pixel moon with a few grey "seas". */
function moonTexture(): THREE.Texture {
  const { canvas, ctx } = makeCanvas(8, 8);
  ctx.fillStyle = "#eef0f6";
  ctx.fillRect(0, 0, 8, 8);
  ctx.fillStyle = "#c8ccd8";
  for (const [x, y, w, h] of [
    [1, 1, 2, 2],
    [5, 2, 2, 1],
    [3, 5, 2, 2],
    [6, 5, 1, 1],
  ]) {
    ctx.fillRect(x, y, w, h);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
