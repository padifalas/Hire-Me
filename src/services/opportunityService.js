//browsing active opportunities, computing an explainable match
// score against the student's AI-extracted skills, and submitting
// applications.

import { supabase } from "../config/supabase";

/**
 * fetch active opportunities.......
 * or location. Employer company info (name/logo) is fetched separately and
 * merged in, since opportunities and employer_profiles both reference
 * `users` rather than each other directly (no direct FK to embed through).
 */
export async function getActiveOpportunities({ search, jobType, location } = {}) {
  try {
    let query = supabase.from("opportunities").select("*").eq("status", "active");

    if (jobType) query = query.eq("job_type", jobType);
    if (location) query = query.ilike("location", `%${location}%`);
    if (search) query = query.ilike("title", `%${search}%`);

    query = query.order("created_at", { ascending: false });

    const { data: opportunities, error } = await query;
    if (error) throw error;

    const employerIds = [...new Set(opportunities.map((o) => o.employer_id))];
    let employersById = {};

    if (employerIds.length > 0) {
      const { data: employers, error: employerError } = await supabase
        .from("employer_profiles")
        .select("id, company_name, logo_url, location")
        .in("id", employerIds);

      if (employerError) throw employerError;
      employersById = Object.fromEntries(employers.map((e) => [e.id, e]));
    }

    const enriched = opportunities.map((o) => ({
      ...o,
      employer: employersById[o.employer_id] ?? null,
    }));

    return { success: true, opportunities: enriched };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * et all applications this student has already submitted, so the UI can
 * show "Applied" instead of letting them double-apply.... need to check againtbh
 */
export async function getStudentApplications(studentId) {
  try {
    const { data, error } = await supabase
      .from("applications")
      .select("*")
      .eq("student_id", studentId);

    if (error) throw error;
    return { success: true, applications: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}


export const APPLICATION_STATUS_LABELS = {
  submitted: { label: "Submitted", color: "#2563EB", bg: "#EFF6FF" },
  under_review: { label: "Under Review", color: "#DC8F00", bg: "#FFF7ED" },
  interview: { label: "Interview Requested", color: "#7C3AED", bg: "#F5F3FF" },
  hired: { label: "Hired", color: "#16A34A", bg: "#F0FDF4" },
  rejected: { label: "Rejected", color: "#DC2626", bg: "#FEF2F2" },
};


export async function getStudentApplicationsWithDetails(studentId) {
  try {
    const { data, error } = await supabase
      .from("applications")
      .select("*, opportunities(id, title, location, job_type, employer_id)")
      .eq("student_id", studentId)
      .order("applied_at", { ascending: false });

    if (error) throw error;

    const employerIds = [...new Set(data.map((a) => a.opportunities?.employer_id).filter(Boolean))];
    let employersById = {};

    if (employerIds.length > 0) {
      const { data: employers, error: employerError } = await supabase
        .from("employer_profiles")
        .select("id, company_name, logo_url")
        .in("id", employerIds);

      if (employerError) throw employerError;
      employersById = Object.fromEntries(employers.map((e) => [e.id, e]));
    }

    const enriched = data.map((a) => ({
      ...a,
      employer: a.opportunities?.employer_id ? employersById[a.opportunities.employer_id] ?? null : null,
    }));

    return { success: true, applications: enriched };
  } catch (error) {
    return { success: false, error: error.message };
  }
}


export function computeMatchScore(extractedTechnicalSkills, opportunity) {
  const studentSkills = new Set(
    (extractedTechnicalSkills || []).map((s) =>
      (typeof s === "string" ? s : s.skill || "").toLowerCase().trim(),
    ),
  );

  const required = opportunity.required_skills || [];
  const niceToHave = opportunity.nice_to_have_skills || [];

  const matchedRequired = required.filter((s) => studentSkills.has(s.toLowerCase().trim()));
  const missingRequired = required.filter((s) => !studentSkills.has(s.toLowerCase().trim()));
  const matchedNice = niceToHave.filter((s) => studentSkills.has(s.toLowerCase().trim()));

  // No required skills listed on the posting -> neutral baseline rather than
  // an unearned 100%, since we can't actually verify fit against nothing.
  const requiredScore = required.length > 0 ? (matchedRequired.length / required.length) * 80 : 40;
  const niceScore = niceToHave.length > 0 ? (matchedNice.length / niceToHave.length) * 20 : 0;

  const score = Math.round(Math.min(100, requiredScore + niceScore));

  return { score, matchedRequired, missingRequired, matchedNice };
}

/**
 * Submit an application...Stores the match score at time of application so
 * it's a stable historical record even if the student's skills change later.
 */
export async function applyToOpportunity(studentId, opportunityId, matchScore, coverLetter = null) {
  try {
    const { error } = await supabase.from("applications").insert([
      {
        student_id: studentId,
        opportunity_id: opportunityId,
        match_score: matchScore,
        cover_letter: coverLetter,
      },
    ]);

    if (error) {
      if (error.code === "23505") {
        throw new Error("You've already applied to this opportunity.");
      }
      throw error;
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
