import * as THREE from "three";
import type { Appearance } from "@/walk/content";
import { lampLevel } from "@/walk/world/clock";
import type { World } from "@/walk/world/world";
import { AmbientLife } from "./ambient";
import { VoxelBuilder } from "./builder";
import { CameraRig, edgeArrow, pickNearest } from "./camera";
import { Crowd } from "./crowd";
import { buildHeights, groundHeight, heightAt, raycastGround } from "./heights";
import { attachKeyboard } from "./keyboard";
import { LabelLayer, type LabelInput } from "./labels";
import { Lighting } from "./lighting";
import { activityColor, Markers } from "./markers";
import { Materials, meshesFrom } from "./materials";
import { buildObjects } from "./objects";
import { moonDirection, skyAt, sunDirection, withWeather, type RGB } from "./palette";
import { attachPointer } from "./pointer";
import { Sky } from "./sky";
import { buildTerrain, occupiedTiles } from "./terrain";
import { createWater } from "./water";
import { WeatherEffects } from "./weatherFx";

export interface GameHandle {
  setPlayerAppearance(appearance: Appearance): void;
  /** Screen space covered by panels (CSS pixels), so the camera can keep the player in view. */
  setViewInsets(right: number, bottom: number): void;
  /** Turn the camera an eighth of the way round (1: to the right, -1: to the left). */
  rotateCamera(direction: 1 | -1): void;
  /** Zoom in (1) or out (-1) a step. */
  zoomCamera(direction: 1 | -1): void;
  destroy(): void;
  /** Draw calls and triangles in the last frame. */
  stats(): { calls: number; triangles: number };
}

/** How much the device can take: phones and low-power machines skip shadows and render fewer pixels. */
function detectQuality() {
  const coarse = typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
  const small = Math.min(screen.width, screen.height) < 820;
  const phone = coarse && small;
  const weak = (navigator.hardwareConcurrency ?? 4) <= 2;
  return { phone, shadows: !phone && !weak, maxPixelRatio: phone ? 1.5 : 2, shadowMapSize: 2048 };
}

const NAME_DISTANCE = 7;
const RING_DISTANCE = 10;
const toColor = (c: RGB, out: THREE.Color) => out.setRGB(c[0], c[1], c[2], THREE.SRGBColorSpace);

/**
 * Start the 3D renderer for a world inside `parent`. The world model owns all state; this draws it, follows the
 * player with the camera, and turns taps, clicks and keys into world commands. Throws if WebGL isn't available.
 */
export function createGame(parent: HTMLElement, world: World, playerAppearance: Appearance, onReady: () => void): GameHandle {
  const quality = detectQuality();
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality.maxPixelRatio));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = quality.shadows;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.info.autoReset = true;
  const canvas = renderer.domElement;
  canvas.style.display = "block";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  parent.appendChild(canvas);

  const map = world.map;
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xcfe7f2, 40, 160);
  scene.background = new THREE.Color(0xcfe7f2);
  const field = buildHeights(map);
  const materials = new Materials(Math.min(4, renderer.capabilities.getMaxAnisotropy()));

  // The ground and everything built on it, merged by material.
  const ground = new VoxelBuilder();
  buildTerrain(ground, map, field, occupiedTiles(map));
  meshesFrom(ground.build(), materials, scene, { cast: quality.shadows, receive: quality.shadows });
  const layers = buildObjects(map.objects, field);
  meshesFrom(layers.still.build(), materials, scene, { cast: quality.shadows, receive: quality.shadows });
  const openStalls = new THREE.Group();
  const closedStalls = new THREE.Group();
  meshesFrom(layers.open.build(), materials, openStalls, { cast: quality.shadows, receive: quality.shadows });
  meshesFrom(layers.closed.build(), materials, closedStalls, { cast: quality.shadows, receive: quality.shadows });
  scene.add(openStalls, closedStalls);
  const boats = layers.floating.map((piece) => {
    const group = new THREE.Group();
    meshesFrom(piece.builder.build(), materials, group, { cast: quality.shadows, receive: quality.shadows });
    group.position.set(...piece.position);
    group.rotation.y = piece.yaw;
    scene.add(group);
    return { group, piece, baseY: piece.position[1] };
  });
  const flames = layers.flames.map((piece) => {
    const group = new THREE.Group();
    meshesFrom(piece.builder.build(), materials, group, { cast: false, receive: false });
    group.position.set(...piece.position);
    scene.add(group);
    return { group, piece };
  });

  const water = createWater(field);
  scene.add(water.mesh);
  const sky = new Sky(map);
  scene.add(sky.group, sky.clouds);
  const weatherFx = new WeatherEffects();
  scene.add(weatherFx.group);
  const ambient = new AmbientLife(field);
  scene.add(ambient.group);
  const markers = new Markers(world.npcs.length + 2);
  markers.setShadowStrength(quality.shadows ? 0.2 : 0.32);
  scene.add(markers.group);
  const crowd = new Crowd(world.npcs, world.player, playerAppearance, materials.get("cloth"), field, quality.shadows);
  scene.add(crowd.group);
  const lighting = new Lighting(scene, layers.lights, quality.shadows, quality.shadowMapSize);

  const labels = new LabelLayer(parent);
  const rig = new CameraRig(map);
  const camera = rig.camera;

  const signpost = map.objects.find((o) => o.kind === "signpost");
  const keyboard = attachKeyboard(world, rig);
  const detachPointer = attachPointer(canvas, {
    tap: (x, y, touch) => onTap(x, y, touch),
    twist: (r) => rig.twist(r),
    endTwist: () => rig.endTwist(),
    zoomBy: (a) => rig.zoomBy(a),
  });

  // ---- Sizing ----------------------------------------------------------------------------------------------------

  let width = 0;
  let height = 0;
  const resize = () => {
    width = parent.clientWidth || 800;
    height = parent.clientHeight || 600;
    renderer.setSize(width, height, false);
    rig.setSize(width, height);
  };
  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(parent);

  // ---- Taps ------------------------------------------------------------------------------------------------------

  const projected = new THREE.Vector3();
  const toScreen = (x: number, y: number, z: number) => {
    projected.set(x, y, z).project(camera);
    return {
      x: ((projected.x + 1) / 2) * width,
      y: ((1 - projected.y) / 2) * height,
      behind: projected.z > 1,
    };
  };
  const ndc = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();

  function onTap(x: number, y: number, touch: boolean) {
    // People first: anyone whose figure is near the tap on screen.
    const candidates: { id: string; x: number; top: number; bottom: number; feet: THREE.Vector3 }[] = [];
    for (const actor of crowd.actors) {
      if (!actor.npc?.visible || !actor.npc.def.characterId) continue;
      const feet = toScreen(actor.position.x, actor.position.y, actor.position.z);
      const head = toScreen(actor.position.x, actor.position.y + crowd.headHeight(actor), actor.position.z);
      if (feet.behind) continue;
      candidates.push({ id: actor.npc.def.id, x: (feet.x + head.x) / 2, top: head.y, bottom: feet.y, feet: actor.position });
    }
    if (signpost) {
      const base = heightAt(field, signpost.x, signpost.y);
      const cx = signpost.x + signpost.w / 2;
      const cz = signpost.y + signpost.h / 2;
      const bottom = toScreen(cx, base, cz);
      const top = toScreen(cx, base + 1.6, cz);
      if (!bottom.behind) candidates.push({ id: "signpost", x: bottom.x, top: top.y, bottom: bottom.y, feet: new THREE.Vector3(cx, base, cz) });
    }
    const hit = pickNearest(candidates, x, y, touch ? 34 : 20);
    if (hit) {
      world.approach(hit.id);
      markers.showTap(hit.feet, 0xffe08a);
      return;
    }
    // Otherwise walk to the spot on the ground under the tap.
    ndc.set((x / width) * 2 - 1, -(y / height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const point = raycastGround(field, raycaster.ray.origin, raycaster.ray.direction, 600);
    if (!point) return;
    world.walkTo({ x: point.x, y: point.z });
    markers.showTap(new THREE.Vector3(point.x, Math.max(groundHeight(field, point.x, point.z), 0.3), point.z));
  }

  // ---- The frame -------------------------------------------------------------------------------------------------

  const weatherLevels = { cloud: 0, rain: 0, fog: 0, wind: 0.2 };
  {
    const w = world.weather;
    Object.assign(weatherLevels, { cloud: w.cloud, rain: w.rain, fog: w.fog, wind: w.wind });
  }
  const colors = {
    zenith: new THREE.Color(),
    horizon: new THREE.Color(),
    sun: new THREE.Color(),
    sunIntensity: 1,
    ambientSky: new THREE.Color(),
    ambientGround: new THREE.Color(),
    ambientIntensity: 1,
    waterDeep: new THREE.Color(),
    waterShallow: new THREE.Color(),
  };
  const sunDir = new THREE.Vector3();
  const moonDir = new THREE.Vector3();
  const follow = new THREE.Vector3();
  const questPoint = new THREE.Vector3();
  const labelInputs: LabelInput[] = [];
  const ringInputs: { x: number; y: number; z: number; radius: number; color: number; strength: number }[] = [];
  let elapsed = 0;
  let last = performance.now();
  let raf = 0;
  let ready = false;
  let destroyed = false;

  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
    last = now;
    elapsed += dt;
    step(dt);
    renderer.render(scene, camera);
    if (!ready) {
      ready = true;
      onReady();
    }
  };

  function step(dt: number) {
    world.update(dt);
    keyboard.update();
    const minutes = world.clock.minutes;

    // Weather blends smoothly from one kind to the next.
    const w = world.weather;
    const k = 1 - Math.exp(-0.8 * dt);
    weatherLevels.cloud += (clamp01(w.cloud) - weatherLevels.cloud) * k;
    weatherLevels.rain += (clamp01(w.rain) - weatherLevels.rain) * k;
    weatherLevels.fog += (clamp01(w.fog) - weatherLevels.fog) * k;
    weatherLevels.wind += (clamp01(w.wind) - weatherLevels.wind) * k;
    const palette = withWeather(skyAt(minutes), weatherLevels);
    toColor(palette.zenith, colors.zenith);
    toColor(palette.horizon, colors.horizon);
    toColor(palette.sun, colors.sun);
    toColor(palette.ambientSky, colors.ambientSky);
    toColor(palette.ambientGround, colors.ambientGround);
    toColor(palette.waterDeep, colors.waterDeep);
    toColor(palette.waterShallow, colors.waterShallow);
    colors.sunIntensity = palette.sunIntensity;
    colors.ambientIntensity = palette.ambientIntensity;
    const sd = sunDirection(minutes);
    const md = moonDirection(minutes);
    sunDir.set(sd.x, sd.y, sd.z);
    moonDir.set(md.x, md.y, md.z);
    const night = lampLevel(minutes);
    const lamp = Math.max(night, weatherLevels.rain * 0.35, weatherLevels.cloud * 0.15);

    // People, then the camera follows the player.
    crowd.update(dt, markers);
    const p = crowd.player.position;
    follow.set(p.x, p.y + 0.9, p.z);
    rig.update(dt, follow);
    const distance = rig.distance;

    // Sky, fog and light.
    scene.background = colors.horizon;
    const fog = scene.fog as THREE.Fog;
    fog.color.copy(colors.horizon);
    const clearNear = distance + 14;
    const clearFar = distance * 2.4 + 70;
    fog.near = THREE.MathUtils.lerp(clearNear, distance * 0.35, weatherLevels.fog);
    fog.far = THREE.MathUtils.lerp(clearFar, distance + 16, weatherLevels.fog);
    sky.update(dt, camera, rig.target, colors, sunDir, moonDir, palette.stars, weatherLevels.cloud, weatherLevels.wind);
    lighting.update(dt, elapsed, colors, sunDir, moonDir, lamp, rig.target, distance * 0.95);
    materials.glow.emissiveIntensity = lamp * 1.8;
    materials.uniforms.uTime.value = elapsed;
    materials.uniforms.uWind.value = weatherLevels.wind;

    const daylight = 1 - night;
    const glintDir = sunDir.y > 0 ? sunDir : moonDir;
    water.update(elapsed, 0.05 + weatherLevels.wind * 0.28, {
      deep: colors.waterDeep,
      shallow: colors.waterShallow,
      sky: colors.zenith,
      sun: colors.sun,
      sunDir: glintDir,
      sunStrength: (sunDir.y > 0 ? Math.min(1, sunDir.y * 3) : Math.max(0, moonDir.y) * 0.5) * (1 - weatherLevels.cloud * 0.8),
    });
    weatherFx.update(elapsed, rig.target, weatherLevels, colors.horizon);
    ambient.update(elapsed, dt, daylight * (1 - weatherLevels.rain), night * (1 - weatherLevels.rain), weatherLevels.wind, rig.target);

    // Things that move with the time: stalls open and close, boats bob, fires flicker.
    const open = minutes >= 6.5 * 60 && minutes < 19 * 60;
    openStalls.visible = open;
    closedStalls.visible = !open;
    for (const b of boats) {
      if (!b.piece.object.floating) continue;
      const t = elapsed * (1 + weatherLevels.wind) + b.piece.phase;
      const swell = 0.04 + weatherLevels.wind * 0.1;
      b.group.position.y = b.baseY + Math.sin(t * 1.4) * swell;
      b.group.rotation.x = Math.sin(t * 1.1) * swell * 1.2;
      b.group.rotation.z = Math.sin(t * 0.8 + 1) * swell * 0.8;
    }
    for (const f of flames) {
      const t = elapsed * 9 + f.piece.phase;
      f.group.scale.set(1 + Math.sin(t * 1.3) * 0.08, 0.85 + Math.sin(t) * 0.15 + Math.sin(t * 2.7) * 0.08, 1 + Math.cos(t * 1.1) * 0.08);
      f.group.rotation.y = Math.sin(t * 0.3) * 0.4;
    }

    // Quest marker and activity rings.
    const story = world.storyState;
    const questSpot = story.quest ? map.spots[story.quest.target] : undefined;
    if (questSpot) questPoint.set(questSpot.x, groundHeight(field, questSpot.x, questSpot.y), questSpot.y);
    markers.setQuest(questSpot ? questPoint : null, elapsed);
    ringInputs.length = 0;
    for (const spot of map.activitySpots ?? []) {
      const d = Math.hypot(spot.x - world.player.pos.x, spot.y - world.player.pos.y);
      if (d > RING_DISTANCE) continue;
      const strength = Math.min(1, (RING_DISTANCE - d) / 3);
      ringInputs.push({ x: spot.x, y: groundHeight(field, spot.x, spot.y), z: spot.y, radius: spot.radius, color: activityColor(spot.activity), strength });
    }
    markers.setRings(ringInputs, elapsed);
    markers.update(dt);

    updateLabels(questSpot ? questPoint : null);
  }

  function updateLabels(quest: THREE.Vector3 | null) {
    const story = world.storyState;
    const player = world.player.pos;
    labelInputs.length = 0;
    const view = rig.viewport;
    for (const actor of crowd.actors) {
      const npc = actor.npc;
      if (!npc?.def.characterId || npc.def.role === "townsfolk") continue;
      const near = Math.hypot(npc.pos.x - player.x, npc.pos.y - player.y);
      const showName = npc.def.role === "mentor" || near < NAME_DISTANCE;
      const s = toScreen(actor.position.x, actor.position.y + crowd.headHeight(actor) + 0.12, actor.position.z);
      const onScreen = !s.behind && s.x > -40 && s.x < view.width + 40 && s.y > -20 && s.y < view.height + 40;
      labelInputs.push({
        id: npc.def.id,
        text: npc.def.name ?? "",
        x: s.x,
        y: s.y,
        visible: npc.visible && showName && onScreen,
        badge: npc.def.role === "mentor" && story.mentorsWithLessons.includes(npc.def.characterId),
        highlight: near < 1.8,
      });
    }
    labels.update(labelInputs);
    if (quest) {
      const s = toScreen(quest.x, quest.y + 1, quest.z);
      labels.setArrow(edgeArrow(s, view));
    } else {
      labels.setArrow(null);
    }
  }

  // Pause while the tab is hidden.
  const onVisibility = () => {
    if (destroyed) return;
    if (document.hidden) {
      cancelAnimationFrame(raf);
      raf = 0;
    } else if (!raf) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  };
  document.addEventListener("visibilitychange", onVisibility);
  raf = requestAnimationFrame(frame);

  return {
    setPlayerAppearance: (appearance) => crowd.setPlayerAppearance(appearance),
    setViewInsets: (right, bottom) => rig.setInsets(right, bottom),
    rotateCamera: (direction) => rig.rotate(direction),
    zoomCamera: (direction) => rig.zoomBy(direction * -0.18),
    stats: () => ({ calls: renderer.info.render.calls, triangles: renderer.info.render.triangles }),
    destroy() {
      destroyed = true;
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibility);
      observer.disconnect();
      keyboard.detach();
      detachPointer();
      labels.destroy();
      // Free everything on the GPU: geometries from every mesh, then the shared materials and textures.
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.Points || o instanceof THREE.LineSegments) o.geometry.dispose();
      });
      water.dispose();
      sky.dispose();
      weatherFx.dispose();
      ambient.dispose();
      markers.dispose();
      crowd.dispose();
      materials.dispose();
      renderer.renderLists.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}

function clamp01(v: number): number {
  return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0;
}
