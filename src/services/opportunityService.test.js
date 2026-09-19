import { describe, it, expect } from "vitest";
import { computeMatchScore } from "./opportunityService";

// computeMatchScore is a pure function of (studentSkills, opportunity), so
// these tests exercise it directly rather than mocking supabase - the
// import above still creates a Supabase client as a side effect, which is
// why vitest.config.js putss dummy VITE_SUPABASE_* env vars

describe("computeMatchScore", () => {
  it("scores 100 when every required and nice-to-have skill is matched", () => {
    const opportunity = {
      required_skills: ["JavaScript", "React"],
      nice_to_have_skills: ["TypeScript"],
    };
    const result = computeMatchScore(["JavaScript", "React", "TypeScript"], opportunity);
    expect(result.score).toBe(100);
    expect(result.matchedRequired).toEqual(["JavaScript", "React"]);
    expect(result.missingRequired).toEqual([]);
    expect(result.matchedNice).toEqual(["TypeScript"]);
  });

  it("scores partial credit when only some required skills match", () => {
    const opportunity = {
      required_skills: ["JavaScript", "React", "SQL"],
      nice_to_have_skills: [],
    };
    // 2/3 required matched -> (2/3)*80 = 53.33 -> rounds to 53
    const result = computeMatchScore(["JavaScript", "React"], opportunity);
    expect(result.score).toBe(53);
    expect(result.matchedRequired).toEqual(["JavaScript", "React"]);
    expect(result.missingRequired).toEqual(["SQL"]);
  });

  it("scores 0 when none of the required skills match and there are no nice-to-haves", () => {
    const opportunity = {
      required_skills: ["Python", "Django"],
      nice_to_have_skills: [],
    };
    const result = computeMatchScore(["JavaScript"], opportunity);
    expect(result.score).toBe(0);
    expect(result.matchedRequired).toEqual([]);
    expect(result.missingRequired).toEqual(["Python", "Django"]);
  });

  it("falls back to a flat 40 for the required portion when no required skills are listed", () => {
    const opportunity = {
      required_skills: [],
      nice_to_have_skills: [],
    };
    const result = computeMatchScore(["JavaScript"], opportunity);
    expect(result.score).toBe(40);
  });

  it("adds nice-to-have credit on top of the required score", () => {
    const opportunity = {
      required_skills: ["JavaScript"],
      nice_to_have_skills: ["TypeScript", "Docker"],
    };
    // required: 1/1 * 80 = 80; nice-to-have: 1/2 * 20 = 10 -> 90
    const result = computeMatchScore(["JavaScript", "TypeScript"], opportunity);
    expect(result.score).toBe(90);
    expect(result.matchedNice).toEqual(["TypeScript"]);
  });

  it("matches via known synonyms (e.g. JS <-> JavaScript, Node <-> Node.js)", () => {
    const opportunity = {
      required_skills: ["JavaScript", "Node.js"],
      nice_to_have_skills: [],
    };
    // No nice-to-have skills defined, so a full required match caps at the
    // required-only ceiling of 80, not 100.
    const result = computeMatchScore(["JS", "Node"], opportunity);
    expect(result.score).toBe(80);
    expect(result.matchedRequired).toEqual(["JavaScript", "Node.js"]);
  });

  it("prefers AI-normalized required/nice-to-have skills when available", () => {
    const opportunity = {
      required_skills: ["Excel"],
      required_skills_normalized: ["microsoft excel"],
      nice_to_have_skills: [],
    };
    //  student's raw skill normalizes to "excel" via the alias table,
    // but the opportunity was AI-normalized to "microsoft excel" - since
    // resolveNormalizedSkills prefers the AI array 1:1, this should NOT
    // match unless the student's extracted skill also normalizes that way.
    const noMatch = computeMatchScore(["Excel"], opportunity);
    expect(noMatch.matchedRequired).toEqual([]);

    const match = computeMatchScore(["microsoft excel"], opportunity);
    expect(match.matchedRequired).toEqual(["Excel"]);
  });

  it("accepts skill objects with a .skill property, not just plain strings", () => {
    const opportunity = {
      required_skills: ["Python"],
      nice_to_have_skills: [],
    };
    const result = computeMatchScore([{ skill: "Python" }], opportunity);
    expect(result.matchedRequired).toEqual(["Python"]);
  });

  it("caps the score at 100 even if rounding would push it over", () => {
    const opportunity = {
      required_skills: ["JavaScript"],
      nice_to_have_skills: ["TypeScript"],
    };
    const result = computeMatchScore(["JavaScript", "TypeScript"], opportunity);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});
