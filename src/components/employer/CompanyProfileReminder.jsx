import { useState, useEffect } from "react";
import { X, Sparkles, ArrowRight } from "lucide-react";
import { getEmployerProfile } from "../../services/employerService";

const SNOOZE_DAYS = 3;
const STRENGTH_THRESHOLD = 100;

function computeCompanyStrength(profile) {
  if (!profile) return 100; // nothing to nudge about until loaded
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

function snoozeKey(employerId) {
  return `hireme_company_profile_reminder_snoozed_${employerId}`;
}

function isSnoozed(employerId) {
  const raw = localStorage.getItem(snoozeKey(employerId));
  if (!raw) return false;
  const snoozedAt = Number(raw);
  if (Number.isNaN(snoozedAt)) return false;
  const daysSince = (Date.now() - snoozedAt) / (1000 * 60 * 60 * 24);
  return daysSince < SNOOZE_DAYS;
}

// Employer-side mirror of the student ProfileReminder. Self-fetches
// the company profile rather than expecting DashboardView to load and pass
// it down

export default function CompanyProfileReminderToast({
  employerId,
  onGoToProfile,
}) {
  const [profile, setProfile] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!employerId) return;
    (async () => {
      const result = await getEmployerProfile(employerId);
      if (result.success) setProfile(result.profile);
    })();
  }, [employerId]);

  const strength = computeCompanyStrength(profile);

  useEffect(() => {
    setDismissed(false);
  }, [strength]);

  const shouldShow =
    Boolean(profile) &&
    strength < STRENGTH_THRESHOLD &&
    !dismissed &&
    !isSnoozed(employerId);

  if (!shouldShow) return null;

  function handleDismiss() {
    localStorage.setItem(snoozeKey(employerId), String(Date.now()));
    setDismissed(true);
  }

  function handleGoToProfile() {
    setDismissed(true);
    onGoToProfile();
  }

  return (
    <div className="prt-toast" role="status">
      <div className="prt-toast-icon">
        <Sparkles size={16} />
      </div>
      <div className="prt-toast-body">
        <p className="prt-toast-title">
          Your company profile is {strength}% complete
        </p>
        <p className="prt-toast-hint">
          A complete company profile builds trust with candidates and helps your
          job posts stand out.
        </p>
      </div>
      <div className="prt-toast-actions">
        <button
          type="button"
          className="prt-toast-cta"
          onClick={handleGoToProfile}
        >
          Complete profile <ArrowRight size={13} />
        </button>
        <button
          type="button"
          className="prt-toast-dismiss"
          onClick={handleDismiss}
          aria-label="Dismiss"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
