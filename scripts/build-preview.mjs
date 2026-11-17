// Builds the static preview of Walk With Him into preview-dist/: the real game, bundled for the browser, with the
// server actions and chat route replaced by in-page versions (src/walk/preview). Publish preview-dist/index.html
// with app.js and app.css beside it.
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, rmSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "preview-dist");
const preview = path.join(root, "src/walk/preview");

// Exact imports the browser build answers differently from the Next.js app.
const SWAPS = {
  "@/app/walk/actions": path.join(preview, "local-actions.ts"),
  "next/link": path.join(preview, "shims/next-link.tsx"),
  "server-only": path.join(preview, "shims/empty.ts"),
};

const swaps = {
  name: "preview-swaps",
  setup(build) {
    const filter = new RegExp(`^(${Object.keys(SWAPS).map((k) => k.replace(/[/.@-]/g, "\\$&")).join("|")})$`);
    build.onResolve({ filter }, (args) => ({ path: SWAPS[args.path] }));
    // Anything else from Next.js would mean server code slipped into the bundle.
    build.onResolve({ filter: /^next(\/|$)/ }, (args) => ({
      errors: [{ text: `The preview can't use "${args.path}" (imported by ${path.relative(root, args.importer)}).` }],
    }));
  },
};

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

await esbuild.build({
  absWorkingDir: root,
  entryPoints: [path.join(preview, "main.tsx")],
  outfile: path.join(out, "app.js"),
  bundle: true,
  format: "iife",
  platform: "browser",
  target: "es2020",
  minify: true,
  jsx: "automatic",
  legalComments: "none",
  tsconfig: path.join(root, "tsconfig.json"),
  define: { "process.env.NODE_ENV": '"production"' },
  plugins: [swaps],
  // Next's "use client" markers mean nothing in a plain bundle.
  logOverride: { "module-level-directive": "silent" },
  logLevel: "warning",
});

execFileSync(
  process.execPath,
  [path.join(root, "node_modules/@tailwindcss/cli/dist/index.mjs"), "-i", "src/app/globals.css", "-o", path.join(out, "app.css"), "--minify"],
  { cwd: root, stdio: ["ignore", "ignore", "inherit"] },
);
copyFileSync(path.join(preview, "index.html"), path.join(out, "index.html"));

for (const file of ["index.html", "app.js", "app.css"]) {
  console.log(`preview-dist/${file}  ${(statSync(path.join(out, file)).size / 1024).toFixed(0)} KiB`);
}
