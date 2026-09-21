import { useState, useEffect } from "react";
import { X, Sparkles, ArrowRight } from "lucide-react";

import "./ProfileReminder.css";

const SNOOZE_DAYS = 3;
const STRENGTH_THRESHOLD = 90; // matches the push past 90% copy already used on ProfileView

function computeStrength(profile) {
  if (!profile) return 100;
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

function snoozeKey(userId) {
  return `hireme_profile_reminder_snoozed_${userId}`;
}

function isSnoozed(userId) {
  const raw = localStorage.getItem(snoozeKey(userId));
  if (!raw) return false;
  const snoozedAt = Number(raw);
  if (Number.isNaN(snoozedAt)) return false;
  const daysSince = (Date.now() - snoozedAt) / (1000 * 60 * 60 * 24);
  return daysSince < SNOOZE_DAYS;
}

//  Dismissible nudge shown when the student's profile is below the strength
//  threshold. Snoozes on dismiss rather than reappearing every load, and
//  clears itself automatically once the profile crosses the threshold

export default function ProfileReminderToast({
  userId,
  profile,
  onGoToProfile,
}) {
  const [dismissed, setDismissed] = useState(false);
  const strength = computeStrength(profile);

  useEffect(() => {
    // If the profile improves elsewhere clear a stale
    // dismissal so new lower state isn't hidden by it
    setDismissed(false);
  }, [strength]);

  const shouldShow =
    Boolean(profile) &&
    strength < STRENGTH_THRESHOLD &&
    !dismissed &&
    !isSnoozed(userId);

  if (!shouldShow) return null;

  function handleDismiss() {
    localStorage.setItem(snoozeKey(userId), String(Date.now()));
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
        <p className="prt-toast-title">Your profile is {strength}% complete</p>
        <p className="prt-toast-hint">
          A stronger profile gets you better matches and puts you ahead with
          employers.
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
