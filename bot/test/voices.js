import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { GABRIEL, LINES, ORION, say } from "../voices.js";

test("every message starts with the speaker's name", () => {
  assert.equal(say(ORION, "Welcome in."), "**Orion:** Welcome in.");
  assert.equal(say(GABRIEL, "Build starts in 30."), "**Gabriel:** Build starts in 30.");
});

test("Gabriel's Wednesday heads-up is word for word", () => {
  assert.equal(LINES.headsUp, "Build starts in 30. Bring one question about money.");
});

test("the welcome questions are the five asked for, in order", () => {
  assert.equal(LINES.questions.length, 5);
  for (const [i, words] of ["first thing you'd buy", "stopping you", "cost a month", "five years", "help getting there"].entries()) {
    assert.match(LINES.questions[i], new RegExp(words, "i"));
  }
});

test("nothing Orion or Gabriel says uses banned words or hype", () => {
  const banned = /invest|guarantee|get rich|passive income|financial freedom|to the moon|life.changing|10x/i;
  const root = new URL("../", import.meta.url);
  const files = fs.readdirSync(root).filter((f) => /\.(js|md)$/.test(f) || f === ".env.example");
  assert.ok(files.includes("voices.js"));
  for (const f of files) {
    const hit = fs.readFileSync(new URL(f, root), "utf8").match(banned);
    assert.equal(hit, null, `${f} says "${hit?.[0]}"`);
  }
});
