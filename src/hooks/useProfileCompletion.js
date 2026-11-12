import { useEffect, useState } from "react";
import { getStudentProfile } from "../services/documentService";
import { getEmployerProfile } from "../services/employerService";

// Same checks and thresholds as ProfileReminder.jsx (student) and
// CompanyProfileReminder.jsx (employer), so the pinned bell item and the
// reminder toasts always agree about when a profile is "complete enough".
export const STUDENT_STRENGTH_THRESHOLD = 90;
export const EMPLOYER_STRENGTH_THRESHOLD = 100;

function studentStrength(profile) {
  const checks = [
    Boolean(profile.university),
    Boolean(profile.degree_program),
    Boolean(profile.location),
    Boolean(profile.phone),
    Boolean(profile.cv_url),
    Boolean(profile.transcript_url),
    Boolean(
      profile.linkedin_url || profile.github_url || profile.portfolio_url,
    ),
    profile.ai_processing_status === "completed",
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function companyStrength(profile) {
  const checks = [
    Boolean(profile.company_name),
    Boolean(profile.industry),
    Boolean(profile.company_size),
    Boolean(profile.location),
    Boolean(profile.logo_url),
    Boolean(profile.description),
    Boolean(profile.website),
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

/**
 * @param {{ role: "student" | "employer", userId?: string, refreshKey?: any }} opts
 *   Pass the active nav id as `refreshKey` so the number re-checks after the
 *   user edits their profile and comes back to another view.
 */
export default function useProfileCompletion({ role, userId, refreshKey }) {
  const [strength, setStrength] = useState(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    (async () => {
      const result =
        role === "employer"
          ? await getEmployerProfile(userId)
          : await getStudentProfile(userId);
      if (cancelled || !result.success) return;
      setStrength(
        role === "employer"
          ? companyStrength(result.profile)
          : studentStrength(result.profile),
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [role, userId, refreshKey]);

  const threshold =
    role === "employer"
      ? EMPLOYER_STRENGTH_THRESHOLD
      : STUDENT_STRENGTH_THRESHOLD;

  return {
    strength,
    needsAttention: strength !== null && strength < threshold,
  };
}
