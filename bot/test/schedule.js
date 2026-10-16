import { test } from "node:test";
import assert from "node:assert/strict";
import { dueAt } from "../schedule.js";
import { load, save } from "../store.js";
import fs from "node:fs";

// 14 October 2026 is a Wednesday on daylight time (UTC-5); 18 November 2026 is a Wednesday on standard time (UTC-6).
const utc = (iso) => new Date(iso);

test("4:30 pm Central on a Wednesday is the heads-up, in summer and in winter", () => {
  assert.deepEqual(dueAt(utc("2026-10-14T21:30:00Z")), { kind: "headsUp", day: "2026-10-14" });
  assert.deepEqual(dueAt(utc("2026-11-18T22:30:00Z")), { kind: "headsUp", day: "2026-11-18" });
});

test("5:00 pm Central on a Wednesday is the topic post", () => {
  assert.deepEqual(dueAt(utc("2026-10-14T22:00:00Z")), { kind: "live", day: "2026-10-14" });
  assert.deepEqual(dueAt(utc("2026-11-18T23:00:00Z")), { kind: "live", day: "2026-11-18" });
});

test("a few minutes late still counts, so a restart doesn't miss the post", () => {
  assert.equal(dueAt(utc("2026-10-14T21:34:59Z"))?.kind, "headsUp");
  assert.equal(dueAt(utc("2026-10-14T21:35:00Z")), null);
});

test("nothing is due at other times or on other days", () => {
  assert.equal(dueAt(utc("2026-10-14T21:29:00Z")), null); // 4:29 pm
  assert.equal(dueAt(utc("2026-11-18T21:30:00Z")), null); // 3:30 pm in winter
  assert.equal(dueAt(utc("2026-10-15T21:30:00Z")), null); // Thursday
});

test("small JSON files save and load back", () => {
  const name = `test-${process.pid}.json`;
  assert.deepEqual(load(name, { topic: null }), { topic: null });
  save(name, { topic: "Reading a pay stub" });
  assert.deepEqual(load(name, {}), { topic: "Reading a pay stub" });
  fs.rmSync(new URL(`../data/${name}`, import.meta.url));
});
