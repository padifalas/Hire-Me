#!/usr/bin/env node
/**
 * Extraction accuracy evaluation for HireMe's `extract-skills` Edge Function.
 *
 * What it does
 *   1. reads each CV (PDF/DOCX) in eval/cvs and extracts text the same way the app does
 *
 *   2. calls the DEPLOYED extract-skills function as a dedicated test user
 *   3. Compares the output with  hand-labelled  data (eval/labels.json).
 *   4. wriites precision / recall / F1 (with bootstrap 95% confidence intervals) per field,
 *      a per-CV table, the most common misses and false positives, and a paste-ready
 *      paragraph for the report, to eval/results/.
 *
 * Run (from project root, Node 20.6+):
 *   node --env-file=.env scripts/eval-extraction.mjs
 *   node --env-file=.env.scripts/eval-extraction.mjs --runs 3        # repeat to measure run-to-run variation
 *   node scripts/eval-extraction.mjs --rescore eval/results/<file>.raw.json  # re-score saved output after fixing labels, no API calls
 *
 *
 *
 *
 *
 * Privacy: the CV text is sent to the AI provider. Use synthetic or consented CVs only, and
 * keep eval/cvs and eval/results out of git.
 */
import { readFile, readdir, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

const { values: args } = parseArgs({
  options: {
    cvs: { type: "string", default: "eval/cvs" },
    labels: { type: "string", default: "eval/labels.json" },
    out: { type: "string", default: "eval/results" },
    runs: { type: "string", default: "1" },
    delay: { type: "string", default: "6500" }, // ms between calls; Gemini's free tier is rate limited
    limit: { type: "string" },
    rescore: { type: "string" },
  },
});

const RUNS = Math.max(1, parseInt(args.runs, 10) || 1);
const DELAY_MS = Math.max(0, parseInt(args.delay, 10) || 0);
const LIMIT = args.limit ? parseInt(args.limit, 10) : Infinity;
const SUPABASE_URL = (process.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
const API_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const sd = (xs) => {
  if (xs.length < 2) return null;
  const m = avg(xs);
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1));
};
const pct = (x) => (x == null ? "n/a" : `${(x * 100).toFixed(1)}%`);
const num = (x) => (Number.isInteger(x) ? String(x) : x.toFixed(1));

/*text extraction (mirrors documentService.js)*/

async function loadPdfjs() {
  try {
    return await import("pdfjs-dist/legacy/build/pdf.mjs");
  } catch {
    return await import("pdfjs-dist/build/pdf.mjs");
  }
}

async function extractText(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const buf = await readFile(filePath);
  if (ext === ".pdf") {
    const pdfjs = await loadPdfjs();
    const pdf = await pdfjs.getDocument({ data: new Uint8Array(buf), verbosity: 0 }).promise;
    let text = "";
    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n);
      const content = await page.getTextContent();
      text += content.items.map((item) => item.str).join(" ") + "\n";
    }
    const trimmed = text.trim();
    if (!trimmed) throw new Error("PDF has no extractable text (scanned image?)");
    return trimmed;
  }
  if (ext === ".docx") {
    const mammoth = (await import("mammoth")).default;
    const { value } = await mammoth.extractRawText({ buffer: buf });
    const trimmed = value.trim();
    if (!trimmed) throw new Error("DOCX is empty");
    return trimmed;
  }
  throw new Error(`Unsupported file type: ${ext}`);
}

/*calling the deployed function*/

async function signIn() {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email: process.env.EVAL_EMAIL, password: process.env.EVAL_PASSWORD }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Sign-in failed (${res.status}): ${json.msg || json.error_description || JSON.stringify(json)}`);
  return { token: json.access_token, userId: json.user.id };
}

async function callExtract(session, cvText) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/extract-skills`, {
    method: "POST",
    headers: { apikey: API_KEY, Authorization: `Bearer ${session.token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ studentId: session.userId, cvText, transcriptText: "" }),
    signal: AbortSignal.timeout(90_000),
  });
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

/** Retries transient failures (rate limits, 5xx, network) with backoff. */
async function extractWithRetry(session, cvText) {
  let lastError = "unknown error";
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      let { status, body } = await callExtract(session, cvText);
      if (status === 401) {
        Object.assign(session, await signIn()); // token expired mid-run
        ({ status, body } = await callExtract(session, cvText));
      }
      if (status === 200 && body?.success && body.data) {
        return { ok: true, provider: body.provider ?? "unknown", data: body.data, attempts: attempt };
      }
      lastError = `HTTP ${status}: ${body?.error ?? "no error message"}`;
      if (status === 400 || status === 403) break; // not transient
      // The function wraps provider errors in an HTTP 500, so also stop on bad-key / bad-request messages.
      if (/\((400|401|403|404)\)|API key not valid|No LLM provider configured/i.test(lastError)) break;
    } catch (err) {
      lastError = String(err.message ?? err);
    }
    await sleep(3000 * 2 ** (attempt - 1));
  }
  return { ok: false, error: lastError };
}

/* matching*/

// Lower-case, strip accents, keep characters that matter in skill names (C#, C++, .NET, Node.js).
const basicKey = (s) =>
  String(s ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9+#.]+/g, " ")
    .trim()
    .replace(/\.+$/, "");

let appNormalize = null; // the app's own synonym table, loaded from src/utils/skillSynonyms.js if possible

async function loadAppNormalizer() {
  const file = path.resolve("src/utils/skillSynonyms.js");
  try {
    const mod = await import(pathToFileURL(file).href);
    if (typeof mod.normalizeSkillName === "function") return mod.normalizeSkillName;
    console.warn("! src/utils/skillSynonyms.js has no normalizeSkillName export; using exact matching only.");
  } catch (err) {
    console.warn(`! Could not load ${file} (${err.message}); using exact matching only.`);
  }
  return null;
}

const MODES = ["app", "strict"];

function skillKey(item, mode) {
  const raw = typeof item === "string" ? item : (item?.skill ?? item?.name ?? "");
  if (mode === "app" && appNormalize) {
    try {
      return basicKey(appNormalize(raw));
    } catch {
      /* fall through to the basic key */
    }
  }
  return basicKey(raw);
}

const labelOf = (item) => (typeof item === "string" ? item : (item?.skill ?? item?.name ?? ""));


function scoreSkills(predList, goldList, mode) {
  const gold = goldList.map((g) => (typeof g === "string" ? { label: g, names: [g] } : { label: g.name, names: [g.name, ...(g.aliases ?? [])] }));
  const goldKeys = gold.map((g) => new Set(g.names.map((n) => skillKey(n, mode)).filter(Boolean)));
  const matched = new Array(gold.length).fill(false);
  const seen = new Set();
  const fpList = [];
  let tp = 0;
  for (const p of predList ?? []) {
    const k = skillKey(p, mode);
    if (!k || seen.has(k)) continue; // duplicates in the output count once
    seen.add(k);
    const idx = goldKeys.findIndex((ks, i) => !matched[i] && ks.has(k));
    if (idx >= 0) {
      matched[idx] = true;
      tp++;
    } else {
      fpList.push(labelOf(p));
    }
  }
  const fnList = gold.filter((_, i) => !matched[i]).map((g) => g.label);
  return { tp, fp: fpList.length, fn: fnList.length, fpList, fnList };
}

function similar(a, b) {
  const na = basicKey(a);
  const nb = basicKey(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const [short, long] = na.length <= nb.length ? [na, nb] : [nb, na];
  if (short.length >= 3 && long.includes(short)) return true;
  const ta = new Set(na.split(" "));
  const tb = new Set(nb.split(" "));
  const inter = [...ta].filter((t) => tb.has(t)).length;
  return inter / (ta.size + tb.size - inter) >= 0.6;
}


function scoreFuzzy(predItems, goldItems) {
  const matched = new Array(goldItems.length).fill(false);
  const fpList = [];
  let tp = 0;
  for (const pred of predItems) {
    const strings = pred.filter(Boolean);
    if (!strings.length) continue;
    const idx = goldItems.findIndex((g, i) => !matched[i] && g.some((gs) => strings.some((ps) => similar(ps, gs))));
    if (idx >= 0) {
      matched[idx] = true;
      tp++;
    } else {
      fpList.push(strings[0]);
    }
  }
  const fnList = goldItems.filter((_, i) => !matched[i]).map((g) => g[0]);
  return { tp, fp: fpList.length, fn: fnList.length, fpList, fnList };
}

// a CV with no technical skills listed is treated as "not labelled yet", not as "has no skills".
const isLabelled = (entry) => Array.isArray(entry?.technical_skills) && entry.technical_skills.length > 0;

const asList = (x) => (typeof x === "string" ? [x] : x.filter(Boolean));

const FIELDS = {
  technical_skills: {
    title: "Technical skills",
    goldKey: "technical_skills",
    kind: "skill",
    pred: (d) => d.technical_skills ?? [],
  },
  soft_skills: {
    title: "Soft skills (indicative)",
    goldKey: "soft_skills",
    kind: "fuzzy",
    pred: (d) => (d.soft_skills ?? []).map((s) => [labelOf(s)]),
    gold: (g) => asList(typeof g === "string" ? g : [g.name, ...(g.aliases ?? [])]),
  },
  experience: {
    title: "Experience (employer found)",
    goldKey: "experience",
    kind: "fuzzy",
    pred: (d) => (d.experience ?? []).map((e) => [e.organization]),
    gold: (g) => asList(typeof g === "string" ? g : [g.organization, ...(g.aliases ?? [])]),
  },
  projects: {
    title: "Projects found",
    goldKey: "projects",
    kind: "fuzzy",
    pred: (d) => (d.translated_projects ?? []).map((p) => [p.original_title, p.professional_title]),
    gold: (g) => asList(typeof g === "string" ? g : [g.title, ...(g.aliases ?? [])]),
  },
};



function prf(tp, fp, fn) {
  const p = tp + fp ? tp / (tp + fp) : 0;
  const r = tp + fn ? tp / (tp + fn) : 0;
  const f = p + r ? (2 * p * r) / (p + r) : 0;
  return { p, r, f };
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}


function bootstrapCI(perCv, iters = 2000, seed = 42) {
  const rnd = mulberry32(seed);
  const out = { p: [], r: [], f: [] };
  for (let i = 0; i < iters; i++) {
    let tp = 0, fp = 0, fn = 0;
    for (let j = 0; j < perCv.length; j++) {
      const c = perCv[Math.floor(rnd() * perCv.length)];
      tp += c.tp; fp += c.fp; fn += c.fn;
    }
    const m = prf(tp, fp, fn);
    out.p.push(m.p); out.r.push(m.r); out.f.push(m.f);
  }
  const q = (xs, frac) => xs.sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor(frac * xs.length))];
  return { p: [q(out.p, 0.025), q(out.p, 0.975)], r: [q(out.r, 0.025), q(out.r, 0.975)], f: [q(out.f, 0.025), q(out.f, 0.975)] };
}

/* scoring */

function scoreRun(runRec, goldEntry) {
  const out = {};
  for (const [field, cfg] of Object.entries(FIELDS)) {
    const gold = goldEntry[cfg.goldKey];
    if (!Array.isArray(gold)) continue;
    out[field] = {};
    for (const mode of MODES) {
      out[field][mode] =
        cfg.kind === "skill"
          ? scoreSkills(cfg.pred(runRec.data), gold, mode)
          : scoreFuzzy(cfg.pred(runRec.data), gold.map(cfg.gold));
    }
  }
  return out;
}

function scoreAll(raw, labels) {
  const scored = {};
  for (const [file, rec] of Object.entries(raw.files)) {
    const gold = labels[file];
    scored[file] = { textError: rec.textError, runs: [] };
    if (!isLabelled(gold)) continue;
    rec.runs.forEach((run, i) => {
      scored[file].runs[i] = run.ok ? { ok: true, scores: scoreRun(run, gold) } : { ok: false, error: run.error };
    });
  }
  return scored;
}

function aggregate(scored, field, mode, runs) {
  const perCv = [];
  for (const [file, rec] of Object.entries(scored)) {
    const ok = rec.runs.filter((r) => r?.ok && r.scores[field]);
    if (!ok.length) continue;
    const mean = (k) => avg(ok.map((r) => r.scores[field][mode][k]));
    perCv.push({ file, tp: mean("tp"), fp: mean("fp"), fn: mean("fn"), runsUsed: ok.length });
  }
  if (!perCv.length) return null;

  const sum = (k) => perCv.reduce((a, c) => a + c[k], 0);
  const micro = prf(sum("tp"), sum("fp"), sum("fn"));
  const perCvMetrics = perCv.map((c) => ({ ...c, ...prf(c.tp, c.fp, c.fn) }));
  const macro = { p: avg(perCvMetrics.map((c) => c.p)), r: avg(perCvMetrics.map((c) => c.r)), f: avg(perCvMetrics.map((c) => c.f)) };

  let runSd = null;
  if (runs > 1) {
    const perRun = [];
    for (let r = 0; r < runs; r++) {
      let tp = 0, fp = 0, fn = 0, any = false;
      for (const rec of Object.values(scored)) {
        const run = rec.runs[r];
        if (run?.ok && run.scores[field]) {
          const c = run.scores[field][mode];
          tp += c.tp; fp += c.fp; fn += c.fn; any = true;
        }
      }
      if (any) perRun.push(prf(tp, fp, fn).f);
    }
    runSd = sd(perRun);
  }

  return {
    n: perCv.length,
    goldTotal: sum("tp") + sum("fn"),
    predTotal: sum("tp") + sum("fp"),
    micro,
    macro,
    ci: bootstrapCI(perCv),
    perCv: perCvMetrics,
    perfect: perCv.filter((c) => c.fp === 0 && c.fn === 0).length,
    runSd,
  };
}

function topErrors(scored, field, mode, which) {
  const counts = new Map();
  for (const rec of Object.values(scored)) {
    for (const run of rec.runs) {
      if (!run?.ok || !run.scores[field]) continue;
      for (const item of run.scores[field][mode][which]) {
        const k = basicKey(item);
        const e = counts.get(k) ?? { label: item, n: 0 };
        e.n++;
        counts.set(k, e);
      }
    }
  }
  return [...counts.values()].sort((a, b) => b.n - a.n).slice(0, 10);
}

/* repor */

function buildReport(raw, scored, labels, runs) {
  const files = Object.keys(raw.files);
  const textFailed = files.filter((f) => raw.files[f].textError);
  const allRuns = files.flatMap((f) => (raw.files[f].textError ? [] : raw.files[f].runs));
  const failedCalls = allRuns.filter((r) => !r.ok).length;
  const providers = [...new Set(allRuns.filter((r) => r.ok).map((r) => r.provider))].join(", ") || "unknown";
  const headlineMode = appNormalize ? "app" : "strict";

  const tech = aggregate(scored, "technical_skills", headlineMode, runs);
  const techStrict = appNormalize ? aggregate(scored, "technical_skills", "strict", runs) : null;
  const L = [];

  L.push(`# Extraction accuracy: extract-skills`);
  L.push("");
  L.push(`- Run date: ${raw.meta.startedAt}`);
  L.push(`- Provider reported by the function: ${providers}`);
  L.push(`- CVs in the evaluation set: ${files.length}; scored: ${tech?.n ?? 0}; runs per CV: ${runs}`);
  L.push(`- CVs whose text could not be extracted (never reached the AI): ${textFailed.length}${textFailed.length ? ` (${textFailed.join(", ")})` : ""}`);
  L.push(`- AI calls that failed after retries: ${failedCalls} of ${allRuns.length}`);
  L.push(`- Skill-name matching: ${appNormalize ? "app synonym table (src/utils/skillSynonyms.js), the same normalisation the product uses for matching" : "exact match after lower-casing (synonym table could not be loaded)"}`);
  L.push("");

  if (!tech) {
    L.push("No CVs could be scored (check labels.json file names and the failure counts above).");
    return L.join("\n");
  }

  L.push(`## Headline: technical skills`);
  L.push("");
  L.push(`Micro-averaged over ${tech.n} CVs (${num(tech.goldTotal)} labelled skills, ${num(tech.predTotal)} extracted). 95% CI from a bootstrap over CVs.`);
  L.push("");
  L.push(`| Metric | Value | 95% CI |`);
  L.push(`|---|---|---|`);
  L.push(`| Precision | ${pct(tech.micro.p)} | ${pct(tech.ci.p[0])} to ${pct(tech.ci.p[1])} |`);
  L.push(`| Recall | ${pct(tech.micro.r)} | ${pct(tech.ci.r[0])} to ${pct(tech.ci.r[1])} |`);
  L.push(`| F1 | ${pct(tech.micro.f)} | ${pct(tech.ci.f[0])} to ${pct(tech.ci.f[1])} |`);
  L.push("");
  L.push(`Macro-average (each CV weighted equally): precision ${pct(tech.macro.p)}, recall ${pct(tech.macro.r)}, F1 ${pct(tech.macro.f)}. CVs with a perfect result: ${tech.perfect} of ${tech.n}.`);
  if (techStrict) {
    L.push(`With exact-name matching only (no synonym table): precision ${pct(techStrict.micro.p)}, recall ${pct(techStrict.micro.r)}, F1 ${pct(techStrict.micro.f)}.`);
  }
  if (tech.runSd != null) L.push(`Run-to-run variation (SD of micro F1 over ${runs} runs): ${(tech.runSd * 100).toFixed(1)} percentage points.`);
  L.push("");

  L.push(`## Per-field results`);
  L.push("");
  L.push(`| Field | CVs | Labelled | Extracted | Precision | Recall | F1 | F1 95% CI |`);
  L.push(`|---|---|---|---|---|---|---|---|`);
  for (const [field, cfg] of Object.entries(FIELDS)) {
    const a = aggregate(scored, field, headlineMode, runs);
    if (!a) continue;
    const prec = a.predTotal ? pct(a.micro.p) : "n/a (none extracted)";
    const rec = a.goldTotal ? pct(a.micro.r) : "n/a (none labelled)";
    L.push(`| ${cfg.title} | ${a.n} | ${num(a.goldTotal)} | ${num(a.predTotal)} | ${prec} | ${rec} | ${pct(a.micro.f)} | ${pct(a.ci.f[0])} to ${pct(a.ci.f[1])} |`);
  }
  L.push("");

  L.push(`## Per CV (technical skills)`);
  L.push("");
  L.push(`| CV | Labelled | Extracted | Correct | Wrong (FP) | Missed (FN) | Precision | Recall | F1 |`);
  L.push(`|---|---|---|---|---|---|---|---|---|`);
  for (const c of [...tech.perCv].sort((a, b) => a.f - b.f)) {
    L.push(`| ${c.file} | ${num(c.tp + c.fn)} | ${num(c.tp + c.fp)} | ${num(c.tp)} | ${num(c.fp)} | ${num(c.fn)} | ${pct(c.p)} | ${pct(c.r)} | ${pct(c.f)} |`);
  }
  L.push("");

  const fns = topErrors(scored, "technical_skills", headlineMode, "fnList");
  const fps = topErrors(scored, "technical_skills", headlineMode, "fpList");
  L.push(`## Most common misses (labelled but not extracted)`);
  L.push("");
  L.push(fns.length ? fns.map((e) => `- ${e.label} (${e.n}x)`).join("\n") : "- none");
  L.push("");
  L.push(`## Most common extra skills (extracted but not in the labels)`);
  L.push("");
  L.push(fps.length ? fps.map((e) => `- ${e.label} (${e.n}x)`).join("\n") : "- none");
  L.push("");
  const otherLines = [];
  for (const [file, rec] of Object.entries(scored)) {
    const run = rec.runs.find((r) => r?.ok);
    if (!run) continue;
    for (const field of ["soft_skills", "experience", "projects"]) {
      const c = run.scores[field]?.[headlineMode];
      if (!c || (!c.fnList.length && !c.fpList.length)) continue;
      otherLines.push(`- ${file} / ${FIELDS[field].title}: missed [${c.fnList.join("; ") || "none"}], extra [${c.fpList.join("; ") || "none"}]`);
    }
  }
  L.push(`## Other fields: what did not match (first successful run)`);
  L.push("");
  L.push(otherLines.length ? otherLines.join("\n") : "- everything labelled in these fields matched");
  L.push("");
  L.push(`"Missed" = labelled but not found. "Extra" = extracted but nothing labelled matched it. For experience the match is on the employer name as written in the CV, not the job title, and for projects on the project name. If both lists look right but are not matching, the label wording is the problem, not the model.`);
  L.push("");
  L.push(`Review the extra skills by hand: if a skill really is in the CV and you missed it when labelling, add it to labels.json and re-run with --rescore. Precision is otherwise understated.`);
  L.push("");

  L.push(`## Paste-ready summary`);
  L.push("");
  L.push(
    `Extraction accuracy was measured on ${tech.n} CVs against skills labelled by hand by the team. The extract-skills function (${providers}) achieved a micro-averaged precision of ${pct(tech.micro.p)} (95% CI ${pct(tech.ci.p[0])} to ${pct(tech.ci.p[1])}) and recall of ${pct(tech.micro.r)} (95% CI ${pct(tech.ci.r[0])} to ${pct(tech.ci.r[1])}) for technical skills, giving an F1 of ${pct(tech.micro.f)}. ${tech.perfect} of ${tech.n} CVs were extracted with no errors.`,
  );
  L.push("");

  L.push(`## Method and limitations`);
  L.push("");
  L.push(`- The full pipeline was tested: client-side text extraction (same libraries as the app), then the deployed Edge Function and model. Scanned/image PDFs fail before the AI step and are counted separately above.`);
  L.push(`- Labels were written by the team, by one labeller per CV unless you did a second pass. There is no inter-annotator agreement figure, so the labels themselves are a source of error.`);
  L.push(`- Scores count each distinct skill once per CV. A skill is correct if its normalised name matches a labelled skill or one of its listed aliases.`);
  L.push(`- Precision is a lower bound: a correct skill missing from the labels is counted as a false positive.`);
  L.push(`- Soft skills, experience and projects use fuzzy name matching and are indicative only. Level ratings and the generated professional summary are not scored.`);
  L.push(`- The confidence intervals come from resampling CVs. With a small set they are wide, so report them alongside the number.`);
  L.push(`- The model is non-deterministic (temperature 0.2). ${runs > 1 ? `Results are averaged over ${runs} runs per CV.` : "This is a single run per CV; use --runs 3 to measure variation."}`);
  return L.join("\n");
}

/* ───────────────────────── collecting predictions ───────────────────────── */

async function collect(labels) {
  for (const k of ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY", "EVAL_EMAIL", "EVAL_PASSWORD"]) {
    if (!process.env[k]) throw new Error(`Missing ${k}. Put it in .env.local and run with: node --env-file=.env.local scripts/eval-extraction.mjs`);
  }

  const dirFiles = (await readdir(args.cvs)).filter((f) => /\.(pdf|docx)$/i.test(f)).sort();
  const files = dirFiles.filter((f) => isLabelled(labels[f])).slice(0, LIMIT);
  for (const f of dirFiles) {
    if (!labels[f]) console.warn(`! ${f} has no entry in ${args.labels}, skipping`);
    else if (!isLabelled(labels[f])) console.warn(`! ${f} has no technical_skills labelled yet, skipping (run scripts/init-labels.mjs, then fill them in)`);
  }
  for (const f of Object.keys(labels)) if (!f.startsWith("_") && !dirFiles.includes(f)) console.warn(`! ${f} is in ${args.labels} but not in ${args.cvs}`);
  if (!files.length) throw new Error("No CVs to evaluate: put files in eval/cvs and matching entries in eval/labels.json.");

  const raw = { meta: { startedAt: new Date().toISOString(), runs: RUNS, supabaseHost: new URL(SUPABASE_URL).host }, files: {} };
  const texts = {};
  for (const f of files) {
    raw.files[f] = { runs: [] };
    try {
      texts[f] = await extractText(path.join(args.cvs, f));
      raw.files[f].cvChars = texts[f].length;
    } catch (err) {
      raw.files[f].textError = err.message;
      console.warn(`! ${f}: text extraction failed: ${err.message}`);
    }
  }

  const session = await signIn();
  console.log(`Signed in. Evaluating ${Object.keys(texts).length} CVs x ${RUNS} run(s), ${DELAY_MS}ms between calls.`);

  await mkdir(args.out, { recursive: true });
  const stamp = raw.meta.startedAt.replace(/[:.]/g, "-");
  const rawPath = path.join(args.out, `${stamp}.raw.json`);

  let first = true;
  for (let r = 0; r < RUNS; r++) {
    for (const f of Object.keys(texts)) {
      if (!first) await sleep(DELAY_MS);
      first = false;
      console.log(`[run ${r + 1}/${RUNS}] ${f}: calling extract-skills (can take 10-40s)...`);
      const t0 = Date.now();
      const result = await extractWithRetry(session, texts[f]);
      raw.files[f].runs[r] = result;
      const secs = ((Date.now() - t0) / 1000).toFixed(1);
      console.log(`   -> ${result.ok ? `ok in ${secs}s (${result.data.technical_skills?.length ?? 0} technical skills)` : `FAILED after ${secs}s: ${result.error}`}`);
      await writeFile(rawPath, JSON.stringify(raw, null, 2)); // save as we go so a crash doesn't lose the run
    }
  }
  raw.meta.rawPath = rawPath;
  return raw;
}

/* main  */

async function main() {
  const labels = JSON.parse(await readFile(args.labels, "utf8"));
  appNormalize = await loadAppNormalizer();

  const raw = args.rescore ? JSON.parse(await readFile(args.rescore, "utf8")) : await collect(labels);
  const runs = Math.max(1, ...Object.values(raw.files).map((f) => f.runs.length));
  const scored = scoreAll(raw, labels);
  const report = buildReport(raw, scored, labels, runs);

  await mkdir(args.out, { recursive: true });
  const stamp = args.rescore ? `${path.basename(args.rescore, ".raw.json")}.rescored` : raw.meta.startedAt.replace(/[:.]/g, "-");
  const reportPath = path.join(args.out, `${stamp}.md`);
  await writeFile(reportPath, report);
  if (!args.rescore) await writeFile(path.join(args.out, `${stamp}.raw.json`), JSON.stringify(raw, null, 2));

  console.log("\n" + report.split("## Per CV")[0]);
  console.log(`Full report: ${reportPath}`);
}

let finished = false;
process.on("exit", (code) => {
  if (!finished && code === 0) {
    console.error("\nThe script stopped before finishing, without an error. Re-run with --limit 1 and send me the output.");
    process.exitCode = 1;
  }
});

main()
  .then(() => {
    finished = true;
  })
  .catch((err) => {
    finished = true;
    console.error(`\nError: ${err.message}`);
    process.exit(1);
  });
