//
// will deploy w:  supabase functions deploy submit-application
//
// Handles a student submitting an application to an opportunity. The
// match_score stored on the application row is computed HERE, server-side,
// from the student's real extracted_technical_skills and the opportunity's
// real required/nice-to-have skills - never taken from the client.
//
// Before this function existed, the score was computed in the browser
// (computeMatchScore in src/services/opportunityService.js - still used
// there for the live "X% match" display while browsing) and sent straight
// into the insert, so anyone could open devtools and submit whatever score
// they wanted. Employers sort/filter applicants by this number, so that was
// a real integrity problem, not just cosmetic.
//
// Also refuses to apply to a non-active opportunity, and keeps the same
// "you've already applied" friendly message the old client-side insert had
// for the applications table's unique (student_id, opportunity_id)
// constraint (Postgres error code 23505).
//
// @ts-nocheck

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { normalizeSkillName, resolveNormalizedSkills } from "../_shared/skillSynonyms.ts";
import { requireUser, requireSelf, AuthError } from "../_shared/auth.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Mirrors computeMatchScore in src/services/opportunityService.js exactly -
// keep the two in sync the same way _shared/skillSynonyms.ts is kept in
// sync with src/utils/skillSynonyms.js (see that file's header comment).
function computeMatchScore(
  extractedTechnicalSkills: unknown[],
  opportunity: {
    required_skills: string[] | null;
    nice_to_have_skills: string[] | null;
    required_skills_normalized: string[] | null;
    nice_to_have_skills_normalized: string[] | null;
  },
) {
  const studentSkills = new Set(
    (extractedTechnicalSkills || []).map((s: any) =>
      normalizeSkillName(typeof s === "string" ? s : s?.skill || ""),
    ),
  );

  const required = opportunity.required_skills || [];
  const niceToHave = opportunity.nice_to_have_skills || [];
  const requiredNorm = resolveNormalizedSkills(required, opportunity.required_skills_normalized);
  const niceToHaveNorm = resolveNormalizedSkills(niceToHave, opportunity.nice_to_have_skills_normalized);

  const matchedRequired = required.filter((_, i) => studentSkills.has(requiredNorm[i]));
  const matchedNice = niceToHave.filter((_, i) => studentSkills.has(niceToHaveNorm[i]));

  const requiredScore = required.length > 0 ? (matchedRequired.length / required.length) * 80 : 40;
  const niceScore = niceToHave.length > 0 ? (matchedNice.length / niceToHave.length) * 20 : 0;

  return Math.round(Math.min(100, requiredScore + niceScore));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    const { studentId, opportunityId, coverLetter } = await req.json();
    if (!studentId || !opportunityId) {
      return new Response(
        JSON.stringify({ success: false, error: "studentId and opportunityId are required" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    const user = await requireUser(req);
    requireSelf(user, studentId, "profile");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: opportunity, error: oppError } = await supabase
      .from("opportunities")
      .select(
        "status, required_skills, nice_to_have_skills, required_skills_normalized, nice_to_have_skills_normalized",
      )
      .eq("id", opportunityId)
      .single();
    if (oppError) throw oppError;

    if (opportunity.status !== "active") {
      return new Response(
        JSON.stringify({ success: false, error: "This opportunity is no longer accepting applications." }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }

    const { data: studentProfile, error: profileError } = await supabase
      .from("student_profiles")
      .select("extracted_technical_skills")
      .eq("id", studentId)
      .single();
    if (profileError) throw profileError;

    const matchScore = computeMatchScore(studentProfile.extracted_technical_skills || [], opportunity);

    const { error: insertError } = await supabase.from("applications").insert([
      {
        student_id: studentId,
        opportunity_id: opportunityId,
        match_score: matchScore,
        cover_letter: coverLetter || null,
      },
    ]);

    if (insertError) {
      if (insertError.code === "23505") {
        return new Response(
          JSON.stringify({ success: false, error: "You've already applied to this opportunity." }),
          { status: 409, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
        );
      }
      throw insertError;
    }

    return new Response(JSON.stringify({ success: true, matchScore }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("submit-application error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: error instanceof AuthError ? error.status : 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      },
    );
  }
});
