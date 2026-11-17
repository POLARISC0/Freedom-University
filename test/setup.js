import { test } from "node:test";
import assert from "node:assert/strict";
import { CATEGORIES, planSetup, ROLES } from "../setup.js";

const everything = {
  roles: ROLES.map((r) => r.name),
  channels: CATEGORIES.flatMap((c) => [{ name: c.name, type: "category" }, ...c.channels.map((ch) => ({ name: ch.name, type: "text" }))]),
};

test("an empty server gets four roles, three categories and eight channels", () => {
  const plan = planSetup({ roles: [], channels: [] });
  assert.deepEqual(
    plan.roles.map((r) => r.name),
    ["Headmaster", "Captain", "Crew", "Founding Member"],
  );
  assert.deepEqual(plan.categories, ["THE TABLE", "FREEDOM UNIVERSITY", "THE DROP"]);
  assert.deepEqual(
    plan.channels.map((c) => `${c.parent} / #${c.name}`),
    [
      "THE TABLE / #welcome",
      "THE TABLE / #the-table",
      "THE TABLE / #wins",
      "FREEDOM UNIVERSITY / #wednesday-build",
      "FREEDOM UNIVERSITY / #the-vault",
      "FREEDOM UNIVERSITY / #questions",
      "THE DROP / #the-drop",
      "THE DROP / #keys",
    ],
  );
});

test("the server stays within six to eight channels", () => {
  const count = CATEGORIES.flatMap((c) => c.channels).length;
  assert.ok(count >= 6 && count <= 8, `${count} channels`);
});

test("running setup on a finished server creates nothing", () => {
  const plan = planSetup(everything);
  assert.deepEqual(plan, { roles: [], categories: [], channels: [] });
});

test("existing names count whatever their case, and a channel in another category still counts", () => {
  const plan = planSetup({
    roles: ["crew", "HEADMASTER"],
    channels: [
      { name: "The Table", type: "category" },
      { name: "wins", type: "text" },
    ],
  });
  assert.ok(!plan.roles.some((r) => r.name === "Crew" || r.name === "Headmaster"));
  assert.ok(!plan.categories.includes("THE TABLE"));
  assert.ok(!plan.channels.some((c) => c.name === "wins"));
  assert.ok(plan.channels.some((c) => c.name === "welcome"));
});

test("a category name doesn't stand in for a channel of the same name", () => {
  const plan = planSetup({ roles: [], channels: [{ name: "the-drop", type: "category" }] });
  assert.ok(plan.channels.some((c) => c.name === "the-drop"));
});

test("only the vault and the drop are read-only for members", () => {
  const readOnly = CATEGORIES.flatMap((c) => c.channels).filter((c) => c.readOnly).map((c) => c.name);
  assert.deepEqual(readOnly, ["the-vault", "the-drop"]);
});
