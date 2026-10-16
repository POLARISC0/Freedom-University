import fs from "node:fs";
import { DRY_RUN } from "./env.js";

// Orion's memory: small JSON files in bot/data (topic, referrals, keys used, welcome answers).
const dir = new URL("./data/", import.meta.url);

/** Reads bot/data/<name>, or the fallback if it doesn't exist yet. */
export function load(name, fallback) {
  try {
    return JSON.parse(fs.readFileSync(new URL(name, dir), "utf8"));
  } catch (err) {
    if (err.code === "ENOENT") return fallback;
    throw new Error(`bot/data/${name} can't be read (${err.message}). Fix or delete that file.`);
  }
}

/** Writes bot/data/<name> via a temporary file, so a crash can't leave it half-written. A dry run saves nothing. */
export function save(name, value) {
  if (DRY_RUN) return;
  fs.mkdirSync(dir, { recursive: true });
  const tmp = new URL(`${name}.tmp`, dir);
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2));
  fs.renameSync(tmp, new URL(name, dir));
}
