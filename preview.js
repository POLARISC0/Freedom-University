// Shows the site on this computer, and on your phone over the same Wi-Fi, before anything goes online.
// Nothing here deploys or uploads anything. Stop it with Ctrl+C.
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SITE = fileURLToPath(new URL("./site/", import.meta.url));
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
};

/** The file to send for a web address, or null if it doesn't exist or sits outside the site folder. */
export function fileFor(root, urlPath) {
  let name;
  try {
    name = decodeURIComponent(urlPath);
  } catch {
    return null; // a garbled address
  }
  const base = path.resolve(root);
  const file = path.join(base, name.endsWith("/") ? `${name}index.html` : name);
  if (!file.startsWith(base + path.sep)) return null;
  return fs.statSync(file, { throwIfNoEntry: false })?.isFile() ? file : null;
}

/** Every line in the site's text files that still says PLACEHOLDER. */
export function findPlaceholders(root) {
  return fs
    .readdirSync(root, { recursive: true })
    .map(String)
    .filter((file) => /\.(html|css|js)$/.test(file))
    .sort()
    .flatMap((file) =>
      fs
        .readFileSync(path.join(root, file), "utf8")
        .split("\n")
        .map((text, i) => ({ file: file.split(path.sep).join("/"), line: i + 1, text: text.trim() }))
        .filter((entry) => entry.text.includes("PLACEHOLDER")),
    );
}

/** Starts the preview server and resolves once it's listening. */
export function startPreview({ root, port }) {
  const server = http.createServer((req, res) => {
    const file = fileFor(root, req.url.split("?")[0]);
    if (!file) {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      return res.end("Not found");
    }
    // no-store, so an edit shows up as soon as you refresh.
    res.writeHead(200, { "content-type": TYPES[path.extname(file)] ?? "application/octet-stream", "cache-control": "no-store" });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, () => resolve(server));
  });
}

// A placeholder line as words when the marker is in the text, or as the line itself when it's in a link.
function readable(line) {
  const words = line.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return (words.includes("PLACEHOLDER") ? words : line).slice(0, 110);
}

async function main() {
  for (let port = 4173; port < 4183; port++) {
    try {
      await startPreview({ root: SITE, port });
    } catch (err) {
      if (err.code === "EADDRINUSE") continue; // another preview has this one, try the next
      throw err;
    }
    const phone = Object.values(os.networkInterfaces())
      .flat()
      .find((a) => a?.family === "IPv4" && !a.internal);
    console.log(`\nPolaris Vending preview is running. Nothing is online yet.\n`);
    console.log(`  On this computer:  http://localhost:${port}`);
    if (phone) console.log(`  On your phone:     http://${phone.address}:${port}   (same Wi-Fi)`);
    const left = findPlaceholders(SITE);
    console.log(left.length ? `\n${left.length} PLACEHOLDER items still to fill in:` : "\nNo PLACEHOLDER items left.");
    for (const { file, line, text } of left) console.log(`  site/${file}, line ${line}:  ${readable(text)}`);
    console.log("\nLeave this window open while you look. Press Ctrl+C to stop.\n");
    return;
  }
  console.error("Ports 4173 to 4182 are all busy. Close the other preview windows and try again.");
  process.exit(1);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
