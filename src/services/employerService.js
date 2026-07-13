// src/services/employerService.js
//
// Handles employer company profile management and job opportunity posting.

import { supabase } from "../config/supabase";

const MAX_LOGO_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_LOGO_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

/**
 * Fetch the full employer_profiles row.
 */
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
 * Update company profile fields.
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
 * Upload a company logo to the public company-logos bucket.
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
 * Create a new job opportunity.
 * @param {string} employerId
 * @param {object} jobData - see JobPostingForm.jsx for shape
 */
export async function createOpportunity(employerId, jobData) {
  try {
    const { data, error } = await supabase
      .from("opportunities")
      .insert([
        {
          employer_id: employerId,
          title: jobData.title,
          description: jobData.description,
          required_skills: jobData.requiredSkills,
          nice_to_have_skills: jobData.niceToHaveSkills,
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
 * Update an existing opportunity (e.g. edit details or change status).
 */
export async function updateOpportunity(opportunityId, jobData) {
  try {
    const updatePayload = {};
    if (jobData.title !== undefined) updatePayload.title = jobData.title;
    if (jobData.description !== undefined) updatePayload.description = jobData.description;
    if (jobData.requiredSkills !== undefined) updatePayload.required_skills = jobData.requiredSkills;
    if (jobData.niceToHaveSkills !== undefined) updatePayload.nice_to_have_skills = jobData.niceToHaveSkills;
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
 * Fetch all opportunities posted by this employer, with a live application count.
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
 * Close (soft-delete) an opportunity rather than hard-deleting it, so
 * existing applications keep their reference intact.
 */
export async function closeOpportunity(opportunityId) {
  return updateOpportunity(opportunityId, { status: "closed" });
}

/**
 * Recent applications across all of this employer's job postings, with the
 * real applicant name, job title, and match score computed at apply-time.
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
