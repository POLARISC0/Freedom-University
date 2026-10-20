// Checks the page against the brief, so an edit can't quietly drop a section or slip in an income promise.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const read = (file) => fs.readFileSync(new URL(`../site/${file}`, import.meta.url), "utf8");
const html = read("index.html");
/** The words a visitor can read, without tags, comments or code. */
const visible = (h) =>
  h
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style)\b[\s\S]*?<\/\1>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");
const element = (tag) => html.match(new RegExp(`<${tag}\\b[\\s\\S]*?</${tag}>`))[0];
const section = (id) => html.match(new RegExp(`<section\\b[^>]*\\bid="${id}"[\\s\\S]*?</section>`))[0];

test("the page runs top to bottom in the order asked for", () => {
  const ids = [...html.matchAll(/<(?:header|section|footer)\b[^>]*\bid="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(ids, ["top", "how-it-works", "what-we-stock", "why-polaris", "locations", "contact", "family"]);
});

test("the hero has the logo, the name, the tagline and one button", () => {
  const hero = element("header");
  assert.match(hero, /<img\b[^>]*\bsrc="images\/polaris-logo\.png"/);
  assert.match(visible(hero), /Polaris Vending/);
  assert.match(visible(hero), /Always stocked\. Always on\./);
  assert.equal([...hero.matchAll(/<a\b[^>]*\bclass="[^"]*\bbutton\b/g)].length, 1);
  assert.match(hero, /<a\b[^>]*\bhref="#contact"[^>]*>\s*Get a machine/);
});

test("the logo is the favicon too", () => {
  assert.match(html, /<link\b[^>]*\brel="icon"[^>]*\bhref="images\/polaris-logo\.png"/);
});

test("how it works is the three steps, word for word and in order", () => {
  const text = visible(section("how-it-works"));
  const at = ["We place the machine at no cost to you.", "We stock and service it weekly.", "You earn a share of every sale."].map((s) => text.indexOf(s));
  assert.ok(at.every((i) => i >= 0), `missing a step: ${at}`);
  assert.deepEqual([...at].sort((a, b) => a - b), at);
});

test("what we stock covers snacks, drinks, healthy options and a mix for each space", () => {
  const text = visible(section("what-we-stock"));
  for (const item of ["Snacks", "Drinks", "Healthy options", "Custom to your space"]) assert.match(text, new RegExp(item, "i"));
});

test("why Polaris is reliable, local and part of the Polaris family", () => {
  const text = visible(section("why-polaris"));
  for (const item of ["Reliable", "Local", "Polaris family"]) assert.match(text, new RegExp(item, "i"));
});

test("locations are coming-soon cards", () => {
  assert.ok((visible(section("locations")).match(/Coming soon/g) ?? []).length >= 3);
});

test("the contact form asks for name, business, phone and a message, each with a label", () => {
  const contact = section("contact");
  const fields = [...contact.matchAll(/<(?:input|textarea)\b[^>]*\bid="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(fields, ["name", "business", "phone", "message"]);
  for (const id of fields) assert.match(contact, new RegExp(`<label\\b[^>]*\\bfor="${id}"`), `${id} needs a label`);
  for (const link of [/href="mailto:/, /href="tel:/, /instagram\.com\//, /tiktok\.com\//, /x\.com\//]) assert.match(contact, link);
});

test("the footer links the Polaris family and has a copyright line", () => {
  const footer = element("footer");
  for (const name of ["Polaris", "Freedom University", "Polaris Vending"]) assert.match(footer, new RegExp(`<a\\b[^>]*>\\s*${name}\\s*</a>`), name);
  assert.match(visible(footer), /©\s*\d{4}/);
});

test("no hype and no income promises anywhere a visitor can read", () => {
  const description = html.match(/<meta name="description" content="([^"]*)"/)[1];
  const hype = /guarantee|passive income|get rich|risk[- ]free|effortless|invest|profit|lucrative|money.?maker|\$\s?\d|per (month|week|year)|\bearn (up to|more|big)/i;
  assert.doesNotMatch(`${visible(html)} ${description}`, hype);
});

// contact.js is a plain browser script, so it runs here in a sandbox with a page that has no form on it.
const page = { document: { getElementById: () => null } };
vm.runInNewContext(read("contact.js"), page);

test("the form becomes an email with every field, safely encoded", () => {
  const link = page.emailLink("hello@example.com", { name: "Sam Lee", business: "Smith & Sons Gym", phone: "+1 555 0100", message: "Two floors.\nOpen 5am to 11pm? Yes #busy" });
  assert.doesNotMatch(link, /[\s#]/, "spaces, line breaks and # must be encoded");
  const [to, query] = link.replace(/^mailto:/, "").split("?");
  assert.equal(to, "hello@example.com");
  const params = new URLSearchParams(query);
  assert.equal(params.get("subject"), "Machine request: Smith & Sons Gym");
  assert.equal(params.get("body"), "Name: Sam Lee\r\nBusiness: Smith & Sons Gym\r\nPhone: +1 555 0100\r\n\r\nTwo floors.\r\nOpen 5am to 11pm? Yes #busy");
});

test("an empty message leaves no blank lines at the end of the email", () => {
  const link = page.emailLink("a@example.com", { name: "A", business: "B", phone: "1", message: "" });
  assert.equal(new URLSearchParams(link.split("?")[1]).get("body"), "Name: A\r\nBusiness: B\r\nPhone: 1");
});
