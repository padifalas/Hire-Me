import { describe, it, expect } from "vitest";
import { normalizeSkillName, resolveNormalizedSkills } from "./skillSynonyms";

describe("normalizeSkillName", () => {
  it("collapses known aliases to their canonical form", () => {
    expect(normalizeSkillName("JS")).toBe("javascript");
    expect(normalizeSkillName("React.js")).toBe("react");
    expect(normalizeSkillName("Node")).toBe("node.js");
    expect(normalizeSkillName("C Sharp")).toBe("c#");
  });

  it("is case- and whitespace-insensitive", () => {
    expect(normalizeSkillName("  JavaScript  ")).toBe("javascript");
    expect(normalizeSkillName("Vue.JS")).toBe("vue");
  });

  it("falls back to lowercase/trim for unknown skills instead of rejecting them", () => {
    expect(normalizeSkillName("Photoshop")).toBe("photoshop");
    expect(normalizeSkillName("  Blender  ")).toBe("blender");
  });

  it("handles null/undefined/non-string input without throwing", () => {
    expect(normalizeSkillName(null)).toBe("");
    expect(normalizeSkillName(undefined)).toBe("");
    expect(normalizeSkillName(42)).toBe("");
    expect(normalizeSkillName("")).toBe("");
  });

  it("matches aliases with punctuation/spacing stripped out too", () => {
    // "vanilla js" is a direct alias; "vanillajs" (no space) should still
    // resolve via the stripped-form fallback lookup... i hope
    expect(normalizeSkillName("vanilla js")).toBe("javascript");
    expect(normalizeSkillName("vanillaJS")).toBe("javascript");
  });
});

describe("resolveNormalizedSkills", () => {
  it("prefers the AI-normalized term when the arrays line up 1:1", () => {
    const result = resolveNormalizedSkills(
      ["JS", "Postgres"],
      ["JavaScript", "PostgreSQL"],
    );
    expect(result).toEqual(["javascript", "postgresql"]);
  });

  it("falls back to normalizing the raw skills when lengths mismatch (AI call failed/skipped)", () => {
    const result = resolveNormalizedSkills(["JS", "Postgres"], null);
    expect(result).toEqual(["javascript", "postgresql"]);
  });

  it("falls back per-item to the raw term when the AI array has a gap", () => {
    // same length, but one slot is empty - resolveNormalizedSkills should
    // use the raw term for that slot instead of normalizing an empty string.
    const result = resolveNormalizedSkills(["JS", "Postgres"], ["JavaScript", ""]);
    expect(result).toEqual(["javascript", "postgresql"]);
  });

  it("returns an empty array for empty/missing input", () => {
    expect(resolveNormalizedSkills([], [])).toEqual([]);
    expect(resolveNormalizedSkills(null, null)).toEqual([]);
  });
});
