import { test } from "node:test";
import assert from "node:assert/strict";
import { recordReferral, redeem } from "../commands.js";

const keys = {
  "SHIRT-0001": { role: "Founding Member", uses: 1 },
  "budget-basics": { lesson: "Your first budget, on one page", link: "https://example.com/budget" },
  "BOSS-MODE": { role: "Headmaster" },
  "HALF-DONE": { note: "forgot the role" },
};

test("a role key unlocks its role, whatever the case or spaces", () => {
  assert.deepEqual(redeem(keys, {}, "  shirt-0001 ", "sam"), { ok: true, code: "SHIRT-0001", role: "Founding Member" });
});

test("a lesson key hands over the lesson link", () => {
  assert.deepEqual(redeem(keys, {}, "BUDGET-BASICS", "sam"), { ok: true, code: "BUDGET-BASICS", lesson: "Your first budget, on one page", link: "https://example.com/budget" });
});

test("an unknown code is refused", () => {
  assert.deepEqual(redeem(keys, {}, "NOPE", "sam"), { ok: false, reason: "unknown" });
});

test("a single-use code works once, and nobody can use the same code twice", () => {
  assert.deepEqual(redeem(keys, { "SHIRT-0001": ["jo"] }, "SHIRT-0001", "sam"), { ok: false, reason: "usedUp" });
  assert.deepEqual(redeem(keys, { "BUDGET-BASICS": ["sam"] }, "budget-basics", "sam"), { ok: false, reason: "alreadyYours" });
  assert.equal(redeem(keys, { "BUDGET-BASICS": ["jo", "kim"] }, "budget-basics", "sam").ok, true);
});

test("no key can ever unlock Headmaster, and a key with nothing to give is refused", () => {
  assert.deepEqual(redeem(keys, {}, "BOSS-MODE", "sam"), { ok: false, reason: "broken" });
  assert.deepEqual(redeem(keys, {}, "HALF-DONE", "sam"), { ok: false, reason: "broken" });
});

test("a first referral makes Crew and a fifth makes Captain", () => {
  let referrals = {};
  const milestones = [];
  for (const newcomer of ["a", "b", "c", "d", "e", "f"]) {
    const r = recordReferral(referrals, "jo", newcomer);
    assert.equal(r.ok, true);
    milestones.push(r.milestone);
    referrals = r.referrals;
  }
  assert.deepEqual(milestones, ["Crew", null, null, null, "Captain", null]);
  assert.equal(recordReferral(referrals, "jo", "g").count, 7);
});

test("you can't refer yourself, and each newcomer counts for one person only", () => {
  assert.deepEqual(recordReferral({}, "jo", "jo"), { ok: false, reason: "self" });
  assert.deepEqual(recordReferral({ sam: "kim" }, "jo", "sam"), { ok: false, reason: "taken" });
});
