
import { readFile, readdir, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const CV_DIR = "eval/cvs";
const LABELS = "eval/labels.json";

const files = (await readdir(CV_DIR)).filter((f) => /\.(pdf|docx)$/i.test(f)).sort();
let labels = {};
try {
  labels = JSON.parse(await readFile(LABELS, "utf8"));
} catch {
  /* no labels file yet */
}

let added = 0;
for (const f of files) {
  if (!labels[f]) {
    labels[f] = { technical_skills: [] };
    added++;
  }
}

await mkdir(path.dirname(LABELS), { recursive: true });
await writeFile(LABELS, JSON.stringify(labels, null, 2) + "\n");

const todo = files.filter((f) => !labels[f].technical_skills?.length);
console.log(`${files.length} CVs found, ${added} new entries added to ${LABELS}.`);
console.log(`${todo.length} still need technical_skills filled in by hand${todo.length ? `: ${todo.join(", ")}` : "."}`);
