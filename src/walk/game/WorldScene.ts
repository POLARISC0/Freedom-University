import Phaser from "phaser";
import type { Appearance } from "@/walk/content";
import { ambientLight, lampLevel } from "@/walk/world/clock";
import { hash2 } from "@/walk/world/noise";
import { Tile, type WorldObject } from "@/walk/world/types";
import type { World } from "@/walk/world/world";
import { characterSheet, DIRECTIONS, FRAME_H, FRAME_W, FRAMES_PER_DIR, sheepSheet } from "./art/characters";
import { makeCanvas, rect } from "./art/color";
import { glowTexture, jettyTile, objectArt } from "./art/objects";
import { paintTerrain, TILE } from "./art/terrain";
import type { LabelInput, LabelLayer } from "./LabelLayer";

export interface SceneOptions {
  world: World;
  labels: LabelLayer;
  playerAppearance: Appearance;
  onReady: () => void;
}

const WALK_CYCLE = [1, 0, 2, 0];
const DEPTH_GROUND = -900;
const DEPTH_OVERLAY = 50_000;
const DEPTH_LIGHTS = 50_001;

interface LightSprite {
  image: Phaser.GameObjects.Image;
  base: number;
  always: boolean;
  flicker: boolean;
}

interface Sparkle {
  image: Phaser.GameObjects.Image;
  life: number;
  max: number;
}

/** Integer zoom keeps pixel art crisp: about 24 tiles across on a laptop, 12 on a phone. */
export function zoomFor(width: number, height: number): number {
  return Math.max(2, Math.min(4, Math.round(Math.min(width / 384, height / 240))));
}

export class WorldScene extends Phaser.Scene {
  private opts: SceneOptions;
  private player!: Phaser.GameObjects.Image;
  private npcSprites = new Map<string, Phaser.GameObjects.Image>();
  private overlay!: Phaser.GameObjects.Rectangle;
  private glows: LightSprite[] = [];
  private playerGlow!: Phaser.GameObjects.Image;
  private stalls: { image: Phaser.GameObjects.Image; open: string; closed: string }[] = [];
  private fires: { image: Phaser.GameObjects.Image; id: string }[] = [];
  private floating: { image: Phaser.GameObjects.Image; y: number; phase: number }[] = [];
  private sparkles: Sparkle[] = [];
  private gulls: { image: Phaser.GameObjects.Image; cx: number; cy: number; r: number; speed: number; phase: number }[] = [];
  private fireflies: { image: Phaser.GameObjects.Image; x: number; y: number; phase: number }[] = [];
  private marker!: Phaser.GameObjects.Image;
  private markerRing!: Phaser.GameObjects.Image;
  private waterTiles: number[] = [];
  private elapsed = 0;
  private playerKey = "player-0";
  private playerVersion = 0;
  private insets = { right: 0, bottom: 0 };

  constructor(opts: SceneOptions) {
    super({ key: "world" });
    this.opts = opts;
  }

  create() {
    const { world } = this.opts;
    const map = world.map;
    this.buildStaticTextures();

    this.add.image(0, 0, "terrain").setOrigin(0, 0).setDepth(DEPTH_GROUND - 10);
    for (let i = 0; i < map.tiles.length; i++) {
      const x = i % map.width;
      const y = (i - x) / map.width;
      if (map.tiles[i] === Tile.Jetty) this.add.image(x * TILE, y * TILE, "jetty").setOrigin(0, 0).setDepth(DEPTH_GROUND);
      if (map.tiles[i] === Tile.Deep || map.tiles[i] === Tile.Shallow) this.waterTiles.push(i);
    }

    for (const o of map.objects) this.addObject(o);
    this.addCharacters();
    this.addAmbientLife();

    this.overlay = this.add
      .rectangle(0, 0, map.width * TILE, map.height * TILE, 0x0a1234, 0)
      .setOrigin(0, 0)
      .setDepth(DEPTH_OVERLAY);
    this.playerGlow = this.add.image(0, 0, "glow").setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH_LIGHTS).setTint(0x9fb6ff);
    this.playerGlow.setScale((3 * TILE * 2) / 64);

    this.marker = this.add.image(0, 0, "marker").setOrigin(0.5, 1).setDepth(DEPTH_LIGHTS + 1).setVisible(false);
    this.markerRing = this.add.image(0, 0, "ring").setDepth(DEPTH_GROUND + 5).setVisible(false);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, map.width * TILE, map.height * TILE);
    cam.setBackgroundColor("#22607f");
    cam.startFollow(this.player, true, 0.12, 0.12);
    cam.setZoom(zoomFor(this.scale.width, this.scale.height));
    this.scale.on("resize", (size: Phaser.Structs.Size) => cam.setZoom(zoomFor(size.width, size.height)));

    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => this.onTap(pointer));
    this.syncSprites();
    this.opts.onReady();
  }

  /** Keep the player centred in the part of the screen not covered by a panel (CSS pixels). */
  setViewInsets(right: number, bottom: number) {
    this.insets = { right, bottom };
  }

  /** Replace the player's look (chosen in the UI). */
  setPlayerAppearance(appearance: Appearance) {
    this.opts.playerAppearance = appearance;
    if (!this.player) return;
    this.playerVersion++;
    this.playerKey = `player-${this.playerVersion}`;
    this.addSheet(this.playerKey, characterSheet(appearance));
    this.player.setTexture(this.playerKey, "down-0");
  }

  private buildStaticTextures() {
    const { world } = this.opts;
    this.textures.addCanvas("terrain", paintTerrain(world.map));
    this.textures.addCanvas("jetty", jettyTile());
    this.textures.addCanvas("glow", glowTexture());

    const sparkle = makeCanvas(3, 1);
    rect(sparkle.ctx, 0, 0, 3, 1, "#ffffff");
    this.textures.addCanvas("sparkle", sparkle.canvas);

    const gull = makeCanvas(14, 6);
    for (const [frame, lift] of [
      [0, 0],
      [7, 2],
    ] as const) {
      rect(gull.ctx, frame + 0, 2 - lift / 2, 2, 1, "#f4f4f0");
      rect(gull.ctx, frame + 2, 3 - lift / 2, 1, 1, "#f4f4f0");
      rect(gull.ctx, frame + 3, 4 - lift, 1, 1, "#d0d0cc");
      rect(gull.ctx, frame + 4, 3 - lift / 2, 1, 1, "#f4f4f0");
      rect(gull.ctx, frame + 5, 2 - lift / 2, 2, 1, "#f4f4f0");
    }
    const gullTex = this.textures.addCanvas("gull", gull.canvas)!;
    gullTex.add("0", 0, 0, 0, 7, 6);
    gullTex.add("1", 0, 7, 0, 7, 6);

    const marker = makeCanvas(9, 12);
    const m = marker.ctx;
    for (let y = 0; y < 9; y++) {
      const half = 4 - Math.abs(4 - y);
      rect(m, 4 - half, y, half * 2 + 1, 1, y < 4 ? "#ffe9a8" : "#f2b84b");
    }
    rect(m, 4, 9, 1, 3, "#f2b84b");
    this.textures.addCanvas("marker", marker.canvas);

    const ring = makeCanvas(24, 12);
    ring.ctx.strokeStyle = "rgba(255,226,140,0.9)";
    ring.ctx.lineWidth = 2;
    ring.ctx.beginPath();
    ring.ctx.ellipse(12, 6, 10, 4.5, 0, 0, Math.PI * 2);
    ring.ctx.stroke();
    this.textures.addCanvas("ring", ring.canvas);

    const sheep = this.textures.addCanvas("sheep", sheepSheet())!;
    for (let row = 0; row < 2; row++) for (let f = 0; f < 2; f++) sheep.add(`${row ? "right" : "left"}-${f}`, 0, f * 16, row * 16, 16, 16);
  }

  private addSheet(key: string, canvas: HTMLCanvasElement) {
    if (this.textures.exists(key)) this.textures.remove(key);
    const tex = this.textures.addCanvas(key, canvas)!;
    DIRECTIONS.forEach((dir, row) => {
      for (let f = 0; f < FRAMES_PER_DIR; f++) tex.add(`${dir}-${f}`, 0, f * FRAME_W, row * FRAME_H, FRAME_W, FRAME_H);
    });
  }

  private addObject(o: WorldObject) {
    const art = objectArt(o);
    const key = `obj-${o.id}`;
    this.textures.addCanvas(key, art.canvas);
    const x = o.x * TILE + art.offsetX;
    const baseY = (o.y + o.h) * TILE;
    const image = this.add.image(x, baseY + art.offsetY, key).setOrigin(0, 0);
    image.setDepth(art.ground ? DEPTH_GROUND + 1 : baseY);

    if (o.kind === "stall") {
      const closed = `obj-${o.id}-closed`;
      this.textures.addCanvas(closed, objectArt(o, 0, true).canvas);
      this.stalls.push({ image, open: key, closed });
    }
    if (o.kind === "fire") {
      for (let f = 1; f < 3; f++) this.textures.addCanvas(`${key}-${f}`, objectArt(o, f).canvas);
      this.fires.push({ image, id: key });
    }
    if (o.floating) {
      image.setDepth(DEPTH_GROUND + 2);
      this.floating.push({ image, y: image.y, phase: o.x * 0.7 });
    }
    if (o.light) {
      const glow = this.add
        .image(o.light.x * TILE, o.light.y * TILE, "glow")
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(DEPTH_LIGHTS)
        .setTint(o.light.color)
        .setAlpha(0);
      glow.setScale((o.light.radius * TILE * 2) / 64);
      this.glows.push({ image: glow, base: o.kind === "fire" ? 0.9 : 0.75, always: Boolean(o.light.always), flicker: o.kind === "fire" });
    }
  }

  private addCharacters() {
    const { world, playerAppearance } = this.opts;
    const sheets = new Map<string, string>();
    for (const npc of world.npcs) {
      if (npc.def.species === "sheep") {
        this.npcSprites.set(npc.def.id, this.add.image(0, 0, "sheep", "left-0").setOrigin(0.5, 14 / 16));
        continue;
      }
      const signature = JSON.stringify(npc.def.appearance);
      let key = sheets.get(signature);
      if (!key) {
        key = `person-${sheets.size}`;
        this.addSheet(key, characterSheet(npc.def.appearance));
        sheets.set(signature, key);
      }
      this.npcSprites.set(npc.def.id, this.add.image(0, 0, key, "down-0").setOrigin(0.5, 22 / FRAME_H));
    }
    this.addSheet(this.playerKey, characterSheet(playerAppearance));
    this.player = this.add.image(0, 0, this.playerKey, "down-0").setOrigin(0.5, 22 / FRAME_H);
  }

  private addAmbientLife() {
    for (let i = 0; i < 46; i++) {
      const image = this.add.image(0, 0, "sparkle").setDepth(DEPTH_GROUND + 3).setAlpha(0);
      this.sparkles.push({ image, life: 0, max: 0 });
    }
    for (let i = 0; i < 4; i++) {
      this.gulls.push({
        image: this.add.image(0, 0, "gull", "0").setDepth(DEPTH_OVERLAY - 1),
        cx: (20 + i * 15) * TILE,
        cy: (46 + (i % 2) * 4) * TILE,
        r: (5 + i * 2) * TILE,
        speed: 0.18 + i * 0.05,
        phase: i * 1.7,
      });
    }
    // Fireflies on the hillside and in the olive grove on summer nights.
    for (let i = 0; i < 18; i++) {
      const x = (2 + hash2(i, 1, 9) * 34) * TILE;
      const y = (2 + hash2(i, 2, 9) * 26) * TILE;
      const image = this.add.image(x, y, "glow").setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH_LIGHTS).setTint(0xd8ff7a).setScale(0.09).setAlpha(0);
      this.fireflies.push({ image, x, y, phase: hash2(i, 3, 9) * 10 });
    }
  }

  private onTap(pointer: Phaser.Input.Pointer) {
    const { world } = this.opts;
    const p = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const tile = { x: p.x / TILE, y: p.y / TILE };
    const npc = world.npcAt(tile, 0.9);
    if (npc) {
      world.approach(npc.def.id);
      return;
    }
    const sign = world.map.spots.signpost;
    if (sign && Math.hypot(sign.x - tile.x, sign.y - 1 - tile.y) < 1.2) {
      world.approach("signpost");
      return;
    }
    world.walkTo(tile);
  }

  update(_time: number, delta: number) {
    const dt = delta / 1000;
    this.elapsed += dt;
    this.opts.world.update(dt);
    const cam = this.cameras.main;
    const map = this.opts.world.map;
    const extraX = this.insets.right / cam.zoom;
    const extraY = this.insets.bottom / cam.zoom;
    // Let the camera run past the map edge under a panel, so the player stays in the visible part of the screen.
    if (cam.getBounds().width !== map.width * TILE + extraX || cam.getBounds().height !== map.height * TILE + extraY) {
      cam.setBounds(0, 0, map.width * TILE + extraX, map.height * TILE + extraY);
    }
    cam.setFollowOffset(-extraX / 2, -extraY / 2);
    this.syncSprites();
    this.updateLighting();
    this.updateAmbient(dt);
    this.updateLabels();
  }

  private frameFor(walker: { moving: boolean }, seed: number) {
    return walker.moving ? WALK_CYCLE[Math.floor(this.elapsed * 8 + seed) % WALK_CYCLE.length] : 0;
  }

  private syncSprites() {
    const { world } = this.opts;
    const p = world.player;
    this.player.setPosition(Math.round(p.pos.x * TILE), Math.round(p.pos.y * TILE));
    this.player.setFrame(`${p.facing}-${this.frameFor(p, 0)}`);
    this.player.setDepth(p.pos.y * TILE + 0.5);

    world.npcs.forEach((npc, i) => {
      const sprite = this.npcSprites.get(npc.def.id);
      if (!sprite) return;
      sprite.setVisible(npc.visible);
      if (!npc.visible) return;
      sprite.setPosition(Math.round(npc.pos.x * TILE), Math.round(npc.pos.y * TILE));
      sprite.setDepth(npc.pos.y * TILE);
      if (npc.def.species === "sheep") {
        const dir = npc.facing === "right" ? "right" : "left";
        sprite.setFrame(`${dir}-${npc.moving ? Math.floor(this.elapsed * 4 + i) % 2 : 0}`);
      } else {
        sprite.setFrame(`${npc.facing}-${this.frameFor(npc, i)}`);
      }
    });

    const quest = world.storyState.quest;
    const spot = quest ? world.map.spots[quest.target] : undefined;
    this.marker.setVisible(Boolean(spot));
    this.markerRing.setVisible(Boolean(spot));
    if (spot) {
      const bob = Math.sin(this.elapsed * 3) * 2;
      this.marker.setPosition(spot.x * TILE, spot.y * TILE - 18 + bob);
      this.markerRing.setPosition(spot.x * TILE, spot.y * TILE);
      this.markerRing.setAlpha(0.55 + Math.sin(this.elapsed * 3) * 0.35);
    }
  }

  private updateLighting() {
    const minutes = this.opts.world.clock.minutes;
    const { color, alpha } = ambientLight(minutes);
    this.overlay.setFillStyle(color, alpha);
    const lamp = lampLevel(minutes);
    for (const l of this.glows) {
      const level = l.always ? Math.max(0.45, lamp) : lamp;
      const flicker = l.flicker ? 0.85 + Math.sin(this.elapsed * 13) * 0.08 + Math.sin(this.elapsed * 7.3) * 0.07 : 1;
      l.image.setAlpha(level * l.base * flicker);
    }
    const p = this.opts.world.player.pos;
    this.playerGlow.setPosition(p.x * TILE, p.y * TILE - 8).setAlpha(lamp * 0.35);
    // Stalls close for the night.
    const open = minutes >= 6.5 * 60 && minutes < 19 * 60;
    for (const s of this.stalls) {
      const key = open ? s.open : s.closed;
      if (s.image.texture.key !== key) s.image.setTexture(key);
    }
    const fireFrame = Math.floor(this.elapsed * 6) % 3;
    for (const f of this.fires) {
      const key = fireFrame === 0 ? f.id : `${f.id}-${fireFrame}`;
      if (f.image.texture.key !== key) f.image.setTexture(key);
    }
  }

  private updateAmbient(dt: number) {
    const cam = this.cameras.main;
    const view = cam.worldView;
    const map = this.opts.world.map;
    const minutes = this.opts.world.clock.minutes;
    const daylight = 1 - lampLevel(minutes);

    for (const b of this.floating) b.image.y = b.y + Math.round(Math.sin(this.elapsed * 1.6 + b.phase) * 1);

    // Glints of light on the water near the camera.
    for (const s of this.sparkles) {
      s.life -= dt;
      if (s.life <= 0) {
        const pick = this.waterTiles[Math.floor(Math.random() * this.waterTiles.length)];
        const tx = pick % map.width;
        const ty = (pick - tx) / map.width;
        const wx = tx * TILE + Math.random() * TILE;
        const wy = ty * TILE + Math.random() * TILE;
        const inView = wx > view.x - 32 && wx < view.right + 32 && wy > view.y - 32 && wy < view.bottom + 32;
        s.max = s.life = inView ? 0.8 + Math.random() * 1.6 : 0.2;
        s.image.setPosition(Math.round(wx), Math.round(wy));
      }
      const t = s.life / Math.max(0.01, s.max);
      s.image.setAlpha(Math.sin(t * Math.PI) * (0.25 + daylight * 0.5));
    }

    for (const g of this.gulls) {
      const a = this.elapsed * g.speed + g.phase;
      g.image.setPosition(g.cx + Math.cos(a) * g.r, g.cy + Math.sin(a * 1.3) * g.r * 0.4);
      g.image.setFrame(Math.floor(this.elapsed * 4 + g.phase) % 2 ? "1" : "0");
      g.image.setFlipX(Math.sin(a) > 0);
      g.image.setAlpha(daylight);
    }

    const night = lampLevel(minutes);
    for (const f of this.fireflies) {
      const t = this.elapsed + f.phase;
      f.image.setPosition(f.x + Math.sin(t * 0.7) * 10, f.y + Math.cos(t * 0.9) * 6);
      f.image.setAlpha(night * Math.max(0, Math.sin(t * 2.1)) * 0.9);
    }
  }

  private updateLabels() {
    const { world, labels } = this.opts;
    const cam = this.cameras.main;
    const view = cam.worldView;
    const zoom = cam.zoom;
    const toScreen = (wx: number, wy: number) => ({ x: (wx - view.x) * zoom, y: (wy - view.y) * zoom });
    const story = world.storyState;
    const player = world.player.pos;
    const out: LabelInput[] = [];
    for (const npc of world.npcs) {
      if (!npc.def.characterId || npc.def.role === "townsfolk") continue;
      const wx = npc.pos.x * TILE;
      const wy = npc.pos.y * TILE - FRAME_H - 1;
      const s = toScreen(wx, wy);
      const near = Math.hypot(npc.pos.x - player.x, npc.pos.y - player.y);
      const showName = npc.def.role === "mentor" || near < 7;
      out.push({
        id: npc.def.id,
        text: npc.def.name ?? "",
        x: s.x,
        y: s.y,
        visible: npc.visible && showName && view.contains(wx, wy + 10),
        badge: npc.def.role === "mentor" && story.mentorsWithLessons.includes(npc.def.characterId),
        highlight: near < 1.8,
      });
    }
    labels.update(out);

    // Arrow towards an off-screen quest target.
    const quest = story.quest ? world.map.spots[story.quest.target] : undefined;
    if (quest && !view.contains(quest.x * TILE, quest.y * TILE)) {
      const cx = view.centerX;
      const cy = view.centerY;
      const angle = Math.atan2(quest.y * TILE - cy, quest.x * TILE - cx);
      const w = view.width * zoom;
      const h = view.height * zoom;
      const margin = 28;
      const rx = w / 2 - margin;
      const ry = h / 2 - margin;
      const k = Math.min(rx / Math.abs(Math.cos(angle) || 1e-6), ry / Math.abs(Math.sin(angle) || 1e-6));
      labels.setArrow({ x: w / 2 + Math.cos(angle) * k, y: h / 2 + Math.sin(angle) * k, angle });
    } else {
      labels.setArrow(null);
    }
  }
}
