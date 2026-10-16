import { test } from "node:test";
import assert from "node:assert/strict";
import { LINES, ORION, say } from "../voices.js";
import { answerQuestion, claimFounding, foundingOrder } from "../welcome.js";

test("the first 50 people get a founding member number and the 51st doesn't", () => {
  let list = [];
  for (let i = 1; i <= 50; i++) {
    const spot = claimFounding(list, `m${i}`);
    assert.equal(spot.number, i);
    list = spot.list;
  }
  assert.deepEqual(claimFounding(list, "m51"), { number: null, list });
});

test("someone who leaves and comes back keeps their number", () => {
  assert.deepEqual(claimFounding(["a", "b", "c"], "b"), { number: 2, list: ["a", "b", "c"] });
});

test("people already in the server count first, oldest first, without bots or the Headmaster", () => {
  const members = [
    { id: "late", joinedTimestamp: 300 },
    { id: "bot", joinedTimestamp: 50, bot: true },
    { id: "you", joinedTimestamp: 10 },
    { id: "early", joinedTimestamp: 100 },
  ];
  assert.deepEqual(foundingOrder(members, (m) => m.bot || m.id === "you"), ["early", "late"]);
});

test("welcome answers are kept in order, skip is allowed, and long answers are cut short", () => {
  let state = { name: "Sam", step: 0, answers: [] };
  const replies = ["A reliable car", "skip", "x".repeat(900), "  Own my\nplace  ", "yes"];
  const nexts = [];
  for (const text of replies) {
    const r = answerQuestion(state, text);
    nexts.push(r.next);
    state = r.state;
  }
  assert.deepEqual(nexts, [1, 2, 3, 4, null]);
  assert.deepEqual(state.answers.slice(0, 2), ["A reliable car", "(skipped)"]);
  assert.equal(state.answers[2].length, 300);
  assert.equal(state.answers[3], "Own my place");
  assert.equal(state.step, 5);
  assert.equal(answerQuestion(state, "one more thing"), null);
});

test("the greeting names a founding member as a founding member, and nobody else", () => {
  assert.match(LINES.greet("@Sam", 12, true), /founding member number 12/);
  assert.doesNotMatch(LINES.greet("@Sam", null, true), /founding/i);
});

test("the greeting only mentions the DM when it went out", () => {
  assert.match(LINES.greet("@Sam", null, true), /DM/);
  assert.doesNotMatch(LINES.greet("@Sam", null, false), /DM/);
});

test("five long answers still fit in one Discord message to the Headmaster", () => {
  let state = { name: "Sam", step: 0, answers: [] };
  for (let i = 0; i < 5; i++) state = answerQuestion(state, "word ".repeat(400)).state;
  assert.ok(say(ORION, LINES.summary("<@123456789012345678>", state.answers)).length <= 2000);
});
