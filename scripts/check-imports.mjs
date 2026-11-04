// findss relative imports that only resolve on case-insensitive systems
// compares each import against the exact file names git tracks, which is what Linux/Netlify sees.
// u can use like this guys (from project root):  node scripts/check-imports.mjs
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

const tracked = new Set(
  execSync("git ls-files src", { encoding: "utf8" })
    .split("\n")
    .filter(Boolean)
    .map((f) => path.posix.normalize(f)),
);
const lowerMap = new Map();
for (const f of tracked) lowerMap.set(f.toLowerCase(), f);

const EXTS = ["", ".js", ".jsx", ".ts", ".tsx", ".css", ".json"];
const INDEXES = ["index.js", "index.jsx", "index.ts", "index.tsx"];
const importRe = /(?:import|export)\s+(?:[^'"]*?\s+from\s+)?["'](\.{1,2}\/[^"']+)["']|import\(\s*["'](\.{1,2}\/[^"']+)["']\s*\)/g;

let problems = 0;

for (const file of tracked.values()) {
  if (!/\.(jsx?|tsx?)$/.test(file)) continue;
  const text = readFileSync(file, "utf8");
  for (const m of text.matchAll(importRe)) {
    const spec = m[1] ?? m[2];
    const base = path.posix.normalize(path.posix.join(path.posix.dirname(file), spec));
    const candidates = [
      ...EXTS.map((e) => base + e),
      ...INDEXES.map((i) => path.posix.join(base, i)),
    ];
    if (candidates.some((c) => tracked.has(c))) continue; // exact match: fine

    const line = text.slice(0, m.index).split("\n").length;
    const wrongCase = candidates.map((c) => lowerMap.get(c.toLowerCase())).find(Boolean);
    problems++;
    if (wrongCase) {
      console.log(`CASE MISMATCH  ${file}:${line}\n  imports  ${spec}\n  git has  ${wrongCase}\n`);
    } else {
      console.log(`NOT FOUND      ${file}:${line}\n  imports  ${spec}\n`);
    }
  }
}

console.log(problems ? `${problems} problem(s) found.` : "All relative imports resolve with exact case.");
process.exit(problems ? 1 : 0);
