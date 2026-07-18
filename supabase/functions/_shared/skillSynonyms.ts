// @ts-nocheck
//
// Deno-side mirror of src/utils/skillSynonyms.js - kept as a separate file
// because Edge Functions can't import from src/ (different runtime/bundler),
// but the alias table and normalizeSkillName() logic must stay IDENTICAL to
// the frontend copy, since both sides need to agree on what counts as a
// match. If you add an alias here, add it there too (and vice versa).
//
// See src/utils/skillSynonyms.js for the full rationale comment.

const SKILL_ALIASES: Record<string, string> = {
  // JavaScript / TypeScript
  js: "javascript",
  ecmascript: "javascript",
  es6: "javascript",
  es2015: "javascript",
  vanillajs: "javascript",
  "vanilla js": "javascript",
  ts: "typescript",

  // C# / .NET
  csharp: "c#",
  "c sharp": "c#",
  "c-sharp": "c#",
  dotnet: ".net",
  ".net core": ".net",
  "asp.net core": "asp.net",
  aspnet: "asp.net",
  "entity framework core": "entity framework",
  ef: "entity framework",

  // Web fundamentals
  html5: "html",
  css3: "css",
  scss: "sass",

  // Frontend frameworks/libraries
  reactjs: "react",
  "react.js": "react",
  reactnative: "react native",
  vuejs: "vue",
  "vue.js": "vue",
  nextjs: "next.js",
  next: "next.js",
  nuxtjs: "nuxt.js",
  nuxt: "nuxt.js",
  angularjs: "angular",
  tailwindcss: "tailwind",
  "tailwind css": "tailwind",

  // Backend / runtime
  nodejs: "node.js",
  node: "node.js",
  expressjs: "express",
  "express.js": "express",
  nestjs: "nest.js",

  // Databases
  postgres: "postgresql",
  psql: "postgresql",
  mongo: "mongodb",
  "ms sql": "sql server",
  mssql: "sql server",
  tsql: "sql server",
  mysql5: "mysql",

  // Cloud / infra
  amazonwebservices: "aws",
  "amazon web services": "aws",
  gcp: "google cloud",
  "google cloud platform": "google cloud",
  "microsoft azure": "azure",
  k8s: "kubernetes",
  ci_cd: "ci/cd",
  cicd: "ci/cd",
  "ci cd": "ci/cd",

  // APIs
  restapi: "rest api",
  restfulapi: "rest api",
  "restful api": "rest api",
  "restful apis": "rest api",
  "rest apis": "rest api",
  graphql_api: "graphql",

  // Languages
  py: "python",
  golang: "go",
  "objective c": "objective-c",

  // Version control
  vcs: "git",
  github_: "github",

  // Design
  "ui/ux": "ui/ux design",
  "ux/ui": "ui/ux design",
  uiux: "ui/ux design",
  figma_design: "figma",

  // Data / office
  powerbi: "power bi",
  excelvba: "excel",
  "ms excel": "excel",
};

export function normalizeSkillName(rawSkill: string | null | undefined): string {
  if (!rawSkill || typeof rawSkill !== "string") return "";

  const cleaned = rawSkill.toLowerCase().trim().replace(/\s+/g, " ");

  if (SKILL_ALIASES[cleaned]) return SKILL_ALIASES[cleaned];

  const stripped = cleaned.replace(/[\s\-_.]/g, "");
  if (SKILL_ALIASES[stripped]) return SKILL_ALIASES[stripped];

  return cleaned;
}

// Mirrors resolveNormalizedSkills in src/utils/skillSynonyms.js - see that
// file for the full rationale comment.
export function resolveNormalizedSkills(
  rawSkills: string[] | null | undefined,
  aiNormalizedSkills: string[] | null | undefined,
): string[] {
  const raw = rawSkills || [];
  const normalized = aiNormalizedSkills || [];

  if (normalized.length === raw.length) {
    return raw.map((r, i) => normalizeSkillName(normalized[i] || r));
  }
  return raw.map((r) => normalizeSkillName(r));
}
