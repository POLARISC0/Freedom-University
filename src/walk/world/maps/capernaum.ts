import { CHARACTERS, TOWNSFOLK, type Appearance } from "@/walk/content";
import { WalkGrid } from "../grid";
import { fbm, rng } from "../noise";
import { Tile, type NpcDef, type Region, type ScheduleEntry, type Spot, type WorldMap, type WorldObject } from "../types";

// Capernaum on the north shore of the Sea of Galilee: the town Jesus made His home (Matthew 4:13). North is up;
// the lake fills the south. Hills rise to the north-west, the Via Maris trade road runs east-west above the town,
// and the shore road runs past Matthew's tax booth to the boats and the jetty.

const W = 80;
const H = 56;

/** The row where the beach meets the water, per column. */
function shoreRow(x: number): number {
  const cove = -3.2 * Math.exp(-(((x - 12) / 6) ** 2));
  const point = 1.4 * Math.exp(-(((x - 47) / 4) ** 2));
  return 40 + 1.4 * Math.sin(x * 0.12) + 0.8 * Math.sin(x * 0.29 + 1.7) + cove + point;
}
export const waterTop = (x: number) => Math.floor(shoreRow(x)) + 1;
const sandTop = (x: number) => waterTop(x) - 3;

const roadRow = (x: number) => Math.round(12 + 1.2 * Math.sin(x * 0.07 + 0.5));

export function buildCapernaum(): WorldMap {
  const tiles = new Uint8Array(W * H).fill(Tile.Grass);
  const set = (x: number, y: number, t: Tile) => {
    if (x >= 0 && y >= 0 && x < W && y < H) tiles[y * W + x] = t;
  };
  const get = (x: number, y: number) => tiles[y * W + x] as Tile;
  const fill = (x: number, y: number, w: number, h: number, t: Tile) => {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) set(i, j, t);
  };

  // Hills to the north-west and a strip along the north edge, with a ragged edge.
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const n = fbm(x * 0.15, y * 0.15, 7);
      const hillEdge = 27 + n * 6 - Math.max(0, y - 16) * 0.55;
      if ((x < hillEdge && y < 33) || y < 4 + n * 3) set(x, y, Tile.Hill);
      if (get(x, y) === Tile.Hill && fbm(x * 0.3, y * 0.3, 11) > 0.62) set(x, y, Tile.Meadow);
    }
  }

  // Wheat fields east of the town, above and below the road.
  fill(65, 2, 14, 8, Tile.Field);
  fill(67, 16, 11, 7, Tile.Field);

  // Beach and lake.
  for (let x = 0; x < W; x++) {
    const top = waterTop(x);
    for (let y = sandTop(x); y < H; y++) {
      set(x, y, y < top ? Tile.Sand : y < top + 3 ? Tile.Shallow : Tile.Deep);
    }
  }

  // Roads: the Via Maris, the shore road, lanes into town and a footpath up the hill to the quiet place.
  for (let x = 0; x < W; x++) {
    const r = roadRow(x);
    set(x, r, Tile.Road);
    set(x, r + 1, Tile.Road);
  }
  // The shore road follows the top of the beach; fill vertical gaps so it stays connected.
  for (let x = 22; x < 74; x++) {
    const y = sandTop(x) - 1;
    const prev = x > 22 ? sandTop(x - 1) - 1 : y;
    for (let j = Math.min(y, prev); j <= Math.max(y, prev); j++) set(x, j, Tile.Road);
  }
  for (let y = roadRow(45); y < 22; y++) fill(45, y, 2, 1, Tile.Road);
  for (let y = 28; y < sandTop(47); y++) fill(47, y, 2, 1, Tile.Road);
  for (let y = roadRow(31); y < sandTop(31); y++) set(31, y, Tile.Road);
  // Footpath from the road up to the quiet place on the hillside.
  const hillPath = [
    [24, roadRow(24) - 1],
    [21, 10],
    [17, 10],
    [14, 8],
  ];
  for (let i = 0; i < hillPath.length - 1; i++) {
    const [ax, ay] = hillPath[i];
    const [bx, by] = hillPath[i + 1];
    const steps = Math.max(Math.abs(bx - ax), Math.abs(by - ay));
    for (let k = 0; k <= steps; k++) set(Math.round(ax + ((bx - ax) * k) / steps), Math.round(ay + ((by - ay) * k) / steps), Tile.Road);
  }

  // The market square.
  fill(43, 21, 13, 8, Tile.Plaza);

  // The jetty, running out from the beach into the lake.
  const jettyX = 47;
  const jettyStart = sandTop(jettyX) + 1;
  const jettyEnd = waterTop(jettyX) + 7;
  fill(jettyX, jettyStart, 2, jettyEnd - jettyStart + 1, Tile.Jetty);

  const objects: WorldObject[] = [];
  const spots: Record<string, Spot> = {};
  const spot = (id: string, x: number, y: number, label: string) => (spots[id] = { id, x, y, label });
  let next = 0;
  const add = (o: Omit<WorldObject, "id"> & { id?: string }) => {
    const obj = { ...o, id: o.id ?? `${o.kind}-${next++}` };
    objects.push(obj);
    return obj;
  };

  // Houses of black basalt with flat roofs. Each door gets a spot so townsfolk can go home at night.
  const houses: [number, number, number, number][] = [
    [47, 15, 4, 3],
    [52, 15, 4, 3],
    [57, 16, 5, 3],
    [33, 20, 4, 3],
    [38, 22, 4, 3],
    [57, 21, 4, 3],
    [57, 26, 4, 3],
    [33, 26, 4, 3],
    [38, 28, 4, 3],
    [51, 30, 4, 3],
    [56, 31, 4, 3],
    [61, 30, 4, 3],
    [27, 22, 4, 3],
    [62, 24, 3, 3],
  ];
  houses.forEach(([x, y, w, h], i) => {
    add({
      id: `house-${i}`,
      kind: "house",
      x,
      y,
      w,
      h,
      solid: true,
      variant: i % 4,
      light: i % 3 === 2 ? undefined : { x: x + w / 2, y: y + h - 0.2, radius: 2.4, color: 0xffb45a },
    });
    spot(`door-${i}`, x + Math.floor(w / 2) + 0.5, y + h + 0.5, "A house");
  });

  add({ id: "synagogue", kind: "synagogue", x: 36, y: 15, w: 7, h: 5, solid: true, light: { x: 39.5, y: 19.8, radius: 3, color: 0xffc070 } });
  spot("synagogue", 39.5, 20.5, "The synagogue");

  // Market stalls around the well.
  const stalls: [number, number][] = [
    [44, 22],
    [47, 22],
    [51, 22],
    [54, 22],
    [44, 26],
    [53, 26],
  ];
  stalls.forEach(([x, y], i) => {
    add({ id: `stall-${i}`, kind: "stall", x, y, w: 2, h: 1, solid: true, variant: i });
    spot(`stall-${i}`, x + 1, y + 1.6, "A market stall");
  });
  add({ id: "well", kind: "well", x: 49, y: 24, w: 2, h: 1, solid: true });
  spot("well", 49.5, 25.6, "The well");
  spot("plaza", 49, 27.5, "The market");
  add({ kind: "jars", x: 46, y: 27, w: 1, h: 1, solid: true });
  add({ kind: "baskets", x: 55, y: 24, w: 1, h: 1, solid: true });

  // The shore: tax booth, teaching place, boats, nets and the fire of coals.
  const boothX = 29;
  const boothY = sandTop(boothX) - 2;
  add({ id: "tax-booth", kind: "taxBooth", x: boothX, y: boothY, w: 2, h: 1, solid: true });
  spot("matthew-home", boothX + 2.6, boothY + 0.6, "Matthew's tax booth");
  add({ kind: "jars", x: boothX - 1, y: boothY, w: 1, h: 1, solid: true });

  spot("jesus-home", 38.5, sandTop(38) + 0.8, "The shore where Jesus teaches");
  for (let i = 0; i < 6; i++) {
    const cx = 35 + i * 1.4;
    spot(`crowd-${i}`, cx, sandTop(Math.floor(cx)) + 2.3 + (i % 2) * 0.6, "Listening to Jesus");
  }

  const peterBoatX = 53;
  const peterBoatY = waterTop(54) - 1;
  add({ id: "peter-boat", kind: "boat", x: peterBoatX, y: peterBoatY, w: 3, h: 1, solid: true, variant: 0 });
  spot("peter-home", peterBoatX - 0.6, peterBoatY + 0.5, "Peter's boat");
  add({ kind: "nets", x: 57, y: sandTop(57), w: 2, h: 1, solid: true });
  spot("andrew-home", 59.6, sandTop(59) + 0.6, "Mending nets");
  const zebedeeX = 62;
  add({ id: "zebedee-boat", kind: "boat", x: zebedeeX, y: waterTop(63) - 1, w: 3, h: 1, solid: true, variant: 1, flip: true });
  spot("james-zebedee-home", zebedeeX - 0.6, waterTop(63) - 0.5, "Zebedee's boat");
  spot("john-home", zebedeeX + 3.6, waterTop(64) - 0.5, "Zebedee's boat");
  add({ kind: "baskets", x: 60, y: waterTop(60) - 1, w: 1, h: 1, solid: true });

  const fireX = 70;
  const fireY = sandTop(fireX) + 1;
  add({ id: "fire", kind: "fire", x: fireX, y: fireY, w: 1, h: 1, solid: true, light: { x: fireX + 0.5, y: fireY + 0.5, radius: 3.4, color: 0xff7a2a, always: true } });
  spot("charcoal-fire", fireX - 0.5, fireY + 0.5, "The fire of coals");

  // Boats out on the water, and lanterns on the jetty.
  add({ kind: "boat", x: 40, y: waterTop(41) + 3, w: 3, h: 1, solid: false, floating: true, variant: 2 });
  add({ kind: "boat", x: 53, y: waterTop(54) + 5, w: 3, h: 1, solid: false, floating: true, variant: 3, flip: true });
  add({ kind: "boat", x: 28, y: waterTop(29) + 6, w: 3, h: 1, solid: false, floating: true, variant: 1 });
  add({ kind: "lantern", x: jettyX + 1.8, y: jettyStart + 3, w: 0, h: 0, solid: false, light: { x: jettyX + 2, y: jettyStart + 3.2, radius: 2.2, color: 0xffd27a } });
  add({ kind: "lantern", x: jettyX + 1.8, y: jettyEnd - 0.4, w: 0, h: 0, solid: false, light: { x: jettyX + 2, y: jettyEnd - 0.2, radius: 2.2, color: 0xffd27a } });
  spot("jetty-end", jettyX + 1, jettyEnd + 0.4, "The end of the jetty");

  // The quiet place on the hillside.
  add({ id: "prayer-rock", kind: "prayerRock", x: 11, y: 6, w: 2, h: 1, solid: true });
  spot("prayer-rock", 12, 7.6, "A quiet place on the hillside");

  // A signpost to the places that open in later chapters.
  add({ id: "signpost", kind: "signpost", x: 3, y: roadRow(3) - 1, w: 1, h: 1, solid: true });
  spot("signpost", 3.5, roadRow(3) + 0.6, "Signpost");

  // Trees, rocks and plants. Fig tree for Nathanael (John 1:48), olive grove, palms along the shore.
  add({ id: "nathanael-fig", kind: "fig", x: 21, y: 24, w: 1, h: 1, solid: true });
  spot("bartholomew-home", 21.5, 25.8, "Under the fig tree");
  const r = rng(1234);
  const free = (x: number, y: number, w = 1, h = 1) =>
    objects.every((o) => x + w <= o.x - 1 || x >= o.x + o.w + 1 || y + h <= o.y - 1 || y >= o.y + o.h + 1);
  const scatter = (kind: WorldObject["kind"], count: number, area: [number, number, number, number], allowed: Tile[], solid: boolean) => {
    for (let n = 0, tries = 0; n < count && tries < count * 40; tries++) {
      const x = Math.floor(area[0] + r() * area[2]);
      const y = Math.floor(area[1] + r() * area[3]);
      if (!allowed.includes(get(x, y)) || !free(x, y)) continue;
      add({ kind, x, y, w: 1, h: 1, solid, variant: Math.floor(r() * 3) });
      n++;
    }
  };
  scatter("olive", 14, [27, 2, 12, 8], [Tile.Hill, Tile.Grass, Tile.Meadow], true);
  scatter("olive", 8, [2, 14, 18, 14], [Tile.Hill, Tile.Meadow], true);
  scatter("rock", 10, [1, 1, 25, 28], [Tile.Hill, Tile.Meadow], true);
  scatter("bush", 14, [1, 1, 30, 30], [Tile.Hill, Tile.Meadow, Tile.Grass], false);
  scatter("flowers", 30, [1, 1, 30, 30], [Tile.Hill, Tile.Meadow], false);
  scatter("fig", 4, [30, 14, 34, 18], [Tile.Grass], true);
  scatter("bush", 10, [28, 14, 40, 20], [Tile.Grass], false);
  scatter("flowers", 10, [28, 14, 40, 20], [Tile.Grass], false);
  for (const x of [24, 34, 43, 52, 66, 74]) {
    const y = sandTop(x) - 2;
    if (get(x, y) !== Tile.Road && free(x, y)) add({ kind: "palm", x, y, w: 1, h: 1, solid: true });
  }
  for (let x = 1; x < 22; x += 2) {
    if (r() < 0.75) add({ kind: "reeds", x, y: waterTop(x) - 1, w: 1, h: 1, solid: false, variant: x % 3 });
  }
  scatter("rock", 4, [64, 30, 15, 12], [Tile.Sand], true);
  scatter("olive", 6, [64, 23, 15, 11], [Tile.Grass], true);
  scatter("fig", 3, [64, 23, 15, 11], [Tile.Grass], true);
  scatter("bush", 8, [62, 23, 17, 12], [Tile.Grass], false);
  scatter("flowers", 8, [62, 23, 17, 12], [Tile.Grass], false);
  scatter("bush", 6, [0, 30, 24, 6], [Tile.Grass], false);
  scatter("flowers", 8, [0, 30, 24, 6], [Tile.Grass], false);

  // Regions name where the player is; the first match wins.
  const regions: Region[] = [
    { name: "The market", x: 43, y: 21, w: 13, h: 8 },
    { name: "The synagogue", x: 35, y: 15, w: 9, h: 7 },
    { name: "Matthew's tax booth", x: boothX - 2, y: boothY - 1, w: 6, h: 4 },
    { name: "The jetty", x: jettyX - 1, y: jettyStart, w: 4, h: jettyEnd - jettyStart + 2 },
    { name: "A quiet place on the hillside", x: 6, y: 3, w: 12, h: 8 },
    { name: "Under the fig tree", x: 18, y: 22, w: 7, h: 6 },
    { name: "The fire of coals", x: fireX - 3, y: fireY - 2, w: 7, h: 5 },
    { name: "The shore", x: 0, y: 33, w: W, h: 12 },
    { name: "Capernaum", x: 26, y: 14, w: 40, h: 20 },
    { name: "The Via Maris", x: 0, y: 10, w: W, h: 5 },
    { name: "The olive grove", x: 27, y: 0, w: 13, h: 10 },
    { name: "Wheat fields", x: 64, y: 0, w: 16, h: 24 },
    { name: "The hillside", x: 0, y: 0, w: 32, h: 33 },
    { name: "The Sea of Galilee", x: 0, y: 0, w: W, h: H },
  ];

  // Mentors and disciples, each in the place Scripture suggests.
  const characterHomes: Record<string, { spot: string; wander?: number }> = {
    jesus: { spot: "jesus-home" },
    peter: { spot: "peter-home" },
    matthew: { spot: "matthew-home" },
    andrew: { spot: "andrew-home", wander: 1 },
    "james-zebedee": { spot: "james-zebedee-home" },
    john: { spot: "john-home" },
    thomas: { spot: "thomas-home", wander: 1 },
    philip: { spot: "philip-home", wander: 2 },
    bartholomew: { spot: "bartholomew-home" },
    "james-alphaeus": { spot: "james-alphaeus-home", wander: 2 },
    thaddaeus: { spot: "synagogue", wander: 1 },
    "simon-zealot": { spot: "simon-zealot-home", wander: 1 },
  };
  spot("thomas-home", 25.5, 17.5, "On the hill path");
  spot("philip-home", 52.5, 27.6, "The market");
  spot("james-alphaeus-home", 46, 31, "Carrying water");
  spot("simon-zealot-home", 66.5, roadRow(66) + 2.6, "Watching the road");

  const npcs: NpcDef[] = CHARACTERS.map((c) => ({
    id: c.id,
    characterId: c.id,
    name: c.shortName,
    role: c.conversational ? "mentor" : "disciple",
    appearance: c.appearance,
    home: characterHomes[c.id]?.spot ?? "plaza",
    wander: characterHomes[c.id]?.wander ?? 0,
    speed: 2.4,
    facing: "down",
  }));

  npcs.push({
    id: "widow",
    characterId: "widow",
    name: TOWNSFOLK.widow.name,
    role: "townsfolk",
    appearance: TOWNSFOLK.widow.appearance,
    home: "widow-home",
    speed: 1.4,
    facing: "left",
  });
  spot("widow-home", 51.6, 24.6, "The well");

  npcs.push(...townsfolk(houses.length));

  // Sheep on the hillside.
  spot("pasture", 17, 15, "Pasture");
  for (let i = 0; i < 7; i++) {
    npcs.push({
      id: `sheep-${i}`,
      role: "animal",
      species: "sheep",
      appearance: { skin: "#ece6d6", hair: "#3b332c", beard: "none", robe: "#ece6d6", sash: "#ece6d6" },
      home: "pasture",
      wander: 6,
      speed: 0.9,
    });
  }

  spot("road-west", 1.5, roadRow(1) + 1, "The Via Maris");
  spot("road-east", 78.5, roadRow(78) + 1, "The Via Maris");
  spot("shore-west", 26, sandTop(26) + 1.5, "The shore");
  spot("shore-east", 66, sandTop(66) + 1.5, "The shore");
  spot("boats", 56, waterTop(56) - 1.6, "The boats");

  const map: WorldMap = {
    id: "sea-of-galilee",
    name: "Sea of Galilee & Capernaum",
    width: W,
    height: H,
    tiles,
    objects,
    spots,
    regions,
    npcs,
    spawn: { x: 41.5, y: 33.5 },
  };
  // Shoreline-relative placements can land a spot on water or under an object; move those to solid ground.
  const grid = new WalkGrid(map);
  for (const s of Object.values(spots)) {
    if (grid.isWalkable(Math.floor(s.x), Math.floor(s.y))) continue;
    const near = grid.nearestWalkable(s.x - 0.5, s.y - 0.5);
    if (near) Object.assign(s, { x: near.x + 0.5, y: near.y + 0.5 });
  }
  return map;
}

const SKIN = ["#c48b62", "#a9734d", "#8d5a3b", "#b07a52", "#9b6644", "#7a4a30"];
const HAIR = ["#1d1510", "#2b1d14", "#3b2b1f", "#4a3626"];
const ROBES = ["#b9a27a", "#8f7454", "#6c7c8c", "#9b4a2e", "#5f7a5a", "#cbb68c", "#7a6a52", "#a88d63", "#56617a", "#8a5a6a"];
const CLOTHS = ["#d9cdb0", "#6b4f3a", "#8a3b2e", "#45607a", "#a89a7a"];

/** Townsfolk with simple daily routines so the town feels lived in. */
function townsfolk(houseCount: number): NpcDef[] {
  const r = rng(99);
  const pick = <T,>(list: T[]) => list[Math.floor(r() * list.length)];
  const person = (kind: "man" | "woman" | "child"): Appearance => ({
    skin: pick(SKIN),
    hair: pick(HAIR),
    beard: kind === "man" ? (r() < 0.7 ? "full" : "short") : "none",
    grey: kind === "man" && r() < 0.25,
    robe: pick(ROBES),
    sash: pick(CLOTHS),
    headcloth: kind === "woman" ? pick(CLOTHS) : kind === "man" && r() < 0.3 ? pick(CLOTHS) : undefined,
    build: kind === "child" ? "child" : "adult",
  });
  const out: NpcDef[] = [];
  let n = 0;
  const home = () => `door-${n % houseCount}`;
  const add = (kind: "man" | "woman" | "child", schedule: ScheduleEntry[], speed: number) => {
    out.push({ id: `townsfolk-${n}`, role: "townsfolk", appearance: person(kind), home: home(), schedule, speed });
    n++;
  };

  // Fishermen work by the boats from before dawn into the evening (Luke 5:2).
  for (let i = 0; i < 4; i++) {
    add("man", [{ from: 4.5, to: 19, spot: i % 2 ? "boats" : "shore-east", wander: 3 }], 2.2);
  }
  // Merchants keep the stalls in the market by day.
  for (let i = 0; i < 4; i++) {
    add(i % 2 ? "woman" : "man", [{ from: 6.5, to: 18.5, spot: `stall-${i}`, wander: 0 }], 2);
  }
  // Villagers fetch water in the morning, shop, and gather in the square in the evening.
  for (let i = 0; i < 6; i++) {
    add(i % 2 ? "woman" : "man", [
      { from: 6, to: 9, spot: "well", wander: 3 },
      { from: 9, to: 12, spot: "plaza", wander: 5 },
      { from: 14, to: 17.5, spot: i % 3 === 0 ? "shore-west" : "plaza", wander: 5 },
      { from: 17.5, to: 21, spot: "plaza", wander: 4 },
    ], 1.8);
  }
  // Children play in the square and on the beach.
  for (let i = 0; i < 4; i++) {
    add("child", [
      { from: 8, to: 12, spot: "plaza", wander: 6 },
      { from: 12, to: 18, spot: i % 2 ? "shore-west" : "boats", wander: 5 },
    ], 3);
  }
  // A crowd gathers to listen to Jesus on the shore in the day (Mark 4:1).
  for (let i = 0; i < 6; i++) {
    add(i % 3 === 0 ? "woman" : "man", [{ from: 8.5, to: 17, spot: `crowd-${i}`, wander: 0, face: "up" }], 1.8);
  }
  // Travellers on the Via Maris.
  for (let i = 0; i < 3; i++) {
    add("man", [
      { from: 6, to: 11, spot: i % 2 ? "road-east" : "road-west", wander: 1 },
      { from: 11, to: 16, spot: i % 2 ? "road-west" : "road-east", wander: 1 },
      { from: 16, to: 19.5, spot: "plaza", wander: 4 },
    ], 2);
  }
  return out;
}
