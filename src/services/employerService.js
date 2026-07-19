
// does employer company profile management and job opportunity posting.

import { supabase } from "../config/supabase";

const MAX_LOGO_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_LOGO_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];


export async function getEmployerProfile(userId) {
  try {
    const { data, error } = await supabase
      .from("employer_profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) throw error;
    return { success: true, profile: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * pdate company profile fields.
 */
export async function updateEmployerProfile(userId, profileData) {
  try {
    const { error } = await supabase
      .from("employer_profiles")
      .update({
        company_name: profileData.companyName,
        industry: profileData.industry,
        company_size: profileData.companySize,
        location: profileData.location,
        website: profileData.website || null,
        description: profileData.description || null,
        bee_committed: profileData.beeCommitted,
        profile_completed: true,
      })
      .eq("id", userId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * uploadd a company logo to the public company-logos bucket.
 */
export async function uploadCompanyLogo(file, userId) {
  try {
    if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
      throw new Error("Logo must be a PNG, JPG, WEBP, or SVG image");
    }
    if (file.size > MAX_LOGO_SIZE) {
      throw new Error("Logo must be under 2MB");
    }

    const fileExt = file.name.split(".").pop();
    const fileName = `${userId}/logo_${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("company-logos")
      .upload(fileName, file, { cacheControl: "3600", upsert: true });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from("company-logos")
      .getPublicUrl(fileName);

    const { error: updateError } = await supabase
      .from("employer_profiles")
      .update({ logo_url: publicUrl })
      .eq("id", userId);

    if (updateError) throw updateError;

    return { success: true, url: publicUrl };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * askk the normalize-skills Edge Function to normalize a job's required/
 * nice-to-have tags across ANY professional domain ( - e.g.
 * "JS" -> "JavaScript", "CRM" -> "Customer Relationship Management (CRM)".
 */
export async function normalizeSkillTags(requiredSkills, niceToHaveSkills) {
  try {
    const { data, error } = await supabase.functions.invoke("normalize-skills", {
      body: { requiredSkills: requiredSkills || [], niceToHaveSkills: niceToHaveSkills || [] },
    });

    if (error || !data?.success) {
      return { requiredSkillsNormalized: null, niceToHaveSkillsNormalized: null };
    }

    return {
      requiredSkillsNormalized: data.requiredSkillsNormalized ?? null,
      niceToHaveSkillsNormalized: data.niceToHaveSkillsNormalized ?? null,
    };
  } catch {
    return { requiredSkillsNormalized: null, niceToHaveSkillsNormalized: null };
  }
}

/**
 * create a new job opportunity.
 * @param {string} employerId
 * @param {object} jobData -
 */
export async function createOpportunity(employerId, jobData) {
  try {
    const { requiredSkillsNormalized, niceToHaveSkillsNormalized } = await normalizeSkillTags(
      jobData.requiredSkills,
      jobData.niceToHaveSkills,
    );

    const { data, error } = await supabase
      .from("opportunities")
      .insert([
        {
          employer_id: employerId,
          title: jobData.title,
          description: jobData.description,
          required_skills: jobData.requiredSkills,
          nice_to_have_skills: jobData.niceToHaveSkills,
          required_skills_normalized: requiredSkillsNormalized,
          nice_to_have_skills_normalized: niceToHaveSkillsNormalized,
          location: jobData.location,
          job_type: jobData.jobType,
          salary_min: jobData.salaryMin || null,
          salary_max: jobData.salaryMax || null,
          deadline: jobData.deadline || null,
          status: jobData.status || "active",
          bee_preference: jobData.beePreference || null,
          remote_option: jobData.remoteOption,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return { success: true, opportunity: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * to update an existing opportunity like edit details or change status or smthing
 */
export async function updateOpportunity(opportunityId, jobData) {
  try {
    const updatePayload = {};
    if (jobData.title !== undefined) updatePayload.title = jobData.title;
    if (jobData.description !== undefined) updatePayload.description = jobData.description;
    if (jobData.requiredSkills !== undefined || jobData.niceToHaveSkills !== undefined) {
      updatePayload.required_skills = jobData.requiredSkills;
      updatePayload.nice_to_have_skills = jobData.niceToHaveSkills;

      const { requiredSkillsNormalized, niceToHaveSkillsNormalized } = await normalizeSkillTags(
        jobData.requiredSkills,
        jobData.niceToHaveSkills,
      );
      updatePayload.required_skills_normalized = requiredSkillsNormalized;
      updatePayload.nice_to_have_skills_normalized = niceToHaveSkillsNormalized;
    }
    if (jobData.location !== undefined) updatePayload.location = jobData.location;
    if (jobData.jobType !== undefined) updatePayload.job_type = jobData.jobType;
    if (jobData.salaryMin !== undefined) updatePayload.salary_min = jobData.salaryMin;
    if (jobData.salaryMax !== undefined) updatePayload.salary_max = jobData.salaryMax;
    if (jobData.deadline !== undefined) updatePayload.deadline = jobData.deadline;
    if (jobData.status !== undefined) updatePayload.status = jobData.status;
    if (jobData.beePreference !== undefined) updatePayload.bee_preference = jobData.beePreference;
    if (jobData.remoteOption !== undefined) updatePayload.remote_option = jobData.remoteOption;
    updatePayload.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("opportunities")
      .update(updatePayload)
      .eq("id", opportunityId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, opportunity: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * get all opportunities posted by this employer, with a live application count.
 */
export async function getEmployerOpportunities(employerId) {
  try {
    const { data, error } = await supabase
      .from("opportunities")
      .select("*, applications(count)")
      .eq("employer_id", employerId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const opportunities = data.map((opp) => ({
      ...opp,
      applicationCount: opp.applications?.[0]?.count ?? 0,
    }));

    return { success: true, opportunities };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * close an opportunity rather than hard-deleting it, so
 * existing applications keep their reference intact.
 */
export async function closeOpportunity(opportunityId) {
  return updateOpportunity(opportunityId, { status: "closed" });
}

/**
 *  applicants for a single job posting, ordered by match score (best fit
 * first), populatedd with the student's profile details so the employer can
 * review without leaving the page. applications.student_id embeds "users"

 */
export async function getApplicantsForOpportunity(opportunityId) {
  try {
    const { data: applications, error } = await supabase
      .from("applications")
      .select("*, student:student_id(full_name, email)")
      .eq("opportunity_id", opportunityId)
      .order("match_score", { ascending: false });

    if (error) throw error;

    const studentIds = applications.map((a) => a.student_id);
    let profilesById = {};

    if (studentIds.length > 0) {
      const { data: profiles, error: profileError } = await supabase
        .from("student_profiles")
        .select(
          "id, university, degree_program, graduation_year, location, professional_summary, extracted_technical_skills, cv_url, linkedin_url, github_url, portfolio_url",
        )
        .in("id", studentIds);

      if (profileError) throw profileError;
      profilesById = Object.fromEntries(profiles.map((p) => [p.id, p]));
    }

    const applicants = applications.map((a) => ({
      ...a,
      profile: profilesById[a.student_id] ?? null,
    }));

    return { success: true, applicants };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function updateApplicationStatus(applicationId, status, feedback = null) {
  try {
    const updatePayload = { status };
    if (status === "rejected" && feedback) {
      updatePayload.rejection_feedback = feedback;
    }

    const { data, error } = await supabase
      .from("applications")
      .update(updatePayload)
      .eq("id", applicationId)
      .select()
      .single();

    if (error) throw error;
    return { success: true, application: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}


export async function generateRejectionFeedback(applicationId) {
  try {
    const { data, error } = await supabase.functions.invoke("generate-rejection-feedback", {
      body: { applicationId },
    });

    if (error) throw error;
    if (!data?.success) throw new Error(data?.error || "Couldn't generate feedback");

    return { success: true, feedback: data.feedback };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * checkk student candidates for the "Candidates" tab. Fetches completed
 * profiles and merges in full_name/email from `users` (student_profiles has
 * no direct name/email columns of its own). Filtering is done client-side

 *
 */
export async function getCandidates() {
  try {
    const { data: profiles, error } = await supabase
      .from("student_profiles")
      .select(
        "id, university, degree_program, graduation_year, location, professional_summary, extracted_technical_skills, ai_processing_status, cv_url",
      )
      .eq("profile_completed", true)
      .order("graduation_year", { ascending: false });

    if (error) throw error;

    const studentIds = profiles.map((p) => p.id);
    let usersById = {};

    if (studentIds.length > 0) {
      const { data: users, error: userError } = await supabase
        .from("users")
        .select("id, full_name, email")
        .in("id", studentIds);

      if (userError) throw userError;
      usersById = Object.fromEntries(users.map((u) => [u.id, u]));
    }

    const candidates = profiles.map((p) => ({
      ...p,
      full_name: usersById[p.id]?.full_name ?? "Student",
      email: usersById[p.id]?.email ?? null,
    }));

    return { success: true, candidates };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * recent applications across all of this employer's job postings, with the
 * real applicant name, job title, and match score computed when u apply
 */
export async function getRecentApplicationsForEmployer(employerId, limit = 5) {
  try {
    const { data: opps, error: oppError } = await supabase
      .from("opportunities")
      .select("id")
      .eq("employer_id", employerId);

    if (oppError) throw oppError;

    const opportunityIds = opps.map((o) => o.id);
    if (opportunityIds.length === 0) return { success: true, applications: [] };

    const { data, error } = await supabase
      .from("applications")
      .select("*, opportunities(title), student:student_id(full_name)")
      .in("opportunity_id", opportunityIds)
      .order("applied_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    return { success: true, applications: data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
