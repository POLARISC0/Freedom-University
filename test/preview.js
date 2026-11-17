import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fileFor, findPlaceholders, startPreview } from "../preview.js";

const site = fileURLToPath(new URL("../site/", import.meta.url));

test("the preview serves the site's own files and nothing outside the site folder", () => {
  assert.equal(fileFor(site, "/"), path.join(site, "index.html"));
  assert.equal(fileFor(site, "/styles.css"), path.join(site, "styles.css"));
  assert.equal(fileFor(site, "/images/polaris-logo.png"), path.join(site, "images", "polaris-logo.png"));
  for (const sneaky of ["/../package.json", "/%2e%2e/package.json", "/..%2fpackage.json", "/missing.html", "/images/", "/%E0%A4%A"]) {
    assert.equal(fileFor(site, sneaky), null, sneaky);
  }
});

test("the placeholder list finds every line marked PLACEHOLDER, with its file and line number", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "polaris-vending-"));
  try {
    fs.mkdirSync(path.join(dir, "images"));
    fs.writeFileSync(path.join(dir, "index.html"), '<h1>Hi</h1>\n  <p>PLACEHOLDER: phone</p>\n<p>Done</p>\n<a href="https://x.com/PLACEHOLDER">X</a>\n');
    fs.writeFileSync(path.join(dir, "styles.css"), "body { color: white; }\n");
    fs.writeFileSync(path.join(dir, "images", "logo.png"), "PLACEHOLDER inside a picture isn't text to fill in");
    assert.deepEqual(findPlaceholders(dir), [
      { file: "index.html", line: 2, text: "<p>PLACEHOLDER: phone</p>" },
      { file: "index.html", line: 4, text: '<a href="https://x.com/PLACEHOLDER">X</a>' },
    ]);
  } finally {
    fs.rmSync(dir, { recursive: true });
  }
});

test("the preview answers like a web server: the page, its styles, and a 404 for anything else", async () => {
  const server = await startPreview({ root: site, port: 0 });
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const page = await fetch(`${base}/`);
    assert.equal(page.status, 200);
    assert.match(page.headers.get("content-type"), /^text\/html/);
    assert.match(await page.text(), /Polaris Vending/);
    assert.match((await fetch(`${base}/styles.css`)).headers.get("content-type"), /^text\/css/);
    assert.equal((await fetch(`${base}/nope.html`)).status, 404);
  } finally {
    server.close();
  }
});
