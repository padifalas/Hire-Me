import { useState, useEffect } from "react";
import {
  getApplicantsForOpportunity,
  updateApplicationStatus,
  generateRejectionFeedback,
} from "../../services/employerService";
import { getDocumentSignedUrl } from "../../services/documentService";
import { APPLICATION_STATUS_LABELS } from "../../services/opportunityService";

import "./ApplicantsModal.css";

import {
  X,
  GraduationCap,
  MapPin,
  FileDown,
  CheckCircle2,
  XCircle,
  Sparkles,
} from "lucide-react";

function matchColor(score) {
  if (score === null || score === undefined) return "#94a3b8";
  if (score >= 75) return "#16A34A";
  if (score >= 50) return "#DC8F00";
  return "#DC2626";
}

function ApplicantCard({ applicant, highlighted, onStatusChange }) {
  const [expanded, setExpanded] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const [cvError, setCvError] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState(null);

  const profile = applicant.profile;
  const statusMeta =
    APPLICATION_STATUS_LABELS[applicant.status] ??
    APPLICATION_STATUS_LABELS.submitted;

  async function handleStatus(newStatus, fb = null) {
    setBusy(true);
    const result = await updateApplicationStatus(applicant.id, newStatus, fb);
    setBusy(false);
    if (result.success) {
      onStatusChange(applicant.id, result.application);
      setRejecting(false);
      setFeedback("");
    } else {
      alert(
        result.error || "Couldn't update this application. Please try again.",
      );
    }
  }

  async function handleGenerateFeedback() {
    setGenerating(true);
    setGenerateError(null);
    const result = await generateRejectionFeedback(applicant.id);
    setGenerating(false);
    if (result.success) {
      setFeedback(result.feedback);
    } else {
      setGenerateError(result.error);
    }
  }

  async function handleViewCv() {
    if (!profile?.cv_url) return;
    setCvError(null);
    const result = await getDocumentSignedUrl("cv", profile.cv_url);
    if (result.success) {
      window.open(result.url, "_blank", "noopener,noreferrer");
    } else {
      setCvError(result.error);
    }
  }

  return (
    <div className={`am-card${highlighted ? " am-card--highlighted" : ""}`}>
      <div className="am-card__top">
        <div>
          <div className="am-card__name">
            {applicant.student?.full_name ?? "Student"}
          </div>
          {profile && (
            <div className="am-card__meta">
              <GraduationCap size={12} /> {profile.degree_program || "-"} ·{" "}
              {profile.university || "-"}
              {profile.location && (
                <>
                  {" "}
                  · <MapPin size={11} className="am-inline-icon" />{" "}
                  {profile.location}
                </>
              )}
            </div>
          )}
        </div>
        <span
          className="am-match-badge"
          style={{
            background: matchColor(applicant.match_score) + "18",
            color: matchColor(applicant.match_score),
            border: `1px solid ${matchColor(applicant.match_score)}33`,
          }}
        >
          {applicant.match_score ?? "-"}% match
        </span>
      </div>

      <div className="am-card__status-row">
        <span
          className="am-status-badge"
          style={{ color: statusMeta.color, background: statusMeta.bg }}
        >
          {statusMeta.label}
        </span>
        <span className="am-card__date">
          Applied{" "}
          {applicant.applied_at
            ? new Date(applicant.applied_at).toLocaleDateString()
            : "-"}
        </span>
        <button
          type="button"
          className="am-link-btn"
          onClick={() => setExpanded((e) => !e)}
        >
          {expanded ? "Hide profile" : "View profile"}
        </button>
      </div>

      {expanded && (
        <div className="am-card__details">
          {!profile && (
            <p className="am-empty-inline">
              This student hasn't finished their profile yet.
            </p>
          )}
          {profile?.professional_summary && (
            <p className="am-summary">{profile.professional_summary}</p>
          )}

          {profile?.extracted_technical_skills?.length > 0 && (
            <div className="am-chip-row">
              {profile.extracted_technical_skills.map((s, i) => (
                <span key={i} className="am-chip am-chip--technical">
                  {typeof s === "string" ? s : s.skill}
                </span>
              ))}
            </div>
          )}

          <div className="am-card__links">
            {profile?.cv_url && (
              <button
                type="button"
                className="am-link-btn"
                onClick={handleViewCv}
              >
                <FileDown size={13} /> View CV
              </button>
            )}
            {profile?.linkedin_url && (
              <a href={profile.linkedin_url} target="_blank" rel="noreferrer">
                LinkedIn
              </a>
            )}
            {profile?.github_url && (
              <a href={profile.github_url} target="_blank" rel="noreferrer">
                GitHub
              </a>
            )}
            {profile?.portfolio_url && (
              <a href={profile.portfolio_url} target="_blank" rel="noreferrer">
                Portfolio
              </a>
            )}
          </div>
          {cvError && <p className="am-error">{cvError}</p>}
        </div>
      )}

      {rejecting ? (
        <div className="am-reject-box">
          <div className="am-reject-box__header">
            <span className="am-reject-box__label">
              Feedback for the student (optional)
            </span>
            <button
              type="button"
              className="am-generate-btn"
              onClick={handleGenerateFeedback}
              disabled={generating || busy}
            >
              <Sparkles size={12} />{" "}
              {generating ? "Generating..." : "Generate AI suggestions"}
            </button>
          </div>
          <textarea
            placeholder="Optional: let the student know why (shown on their Applications page) - or click Generate AI suggestions above"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={4}
          />
          {generateError && <p className="am-error">{generateError}</p>}
          <div className="am-card__actions">
            <button
              type="button"
              className="am-cancel-btn"
              onClick={() => setRejecting(false)}
              disabled={busy}
            >
              Cancel
            </button>
            <button
              type="button"
              className="am-reject-btn"
              onClick={() => handleStatus("rejected", feedback || null)}
              disabled={busy}
            >
              {busy ? "Saving..." : "Confirm reject"}
            </button>
          </div>
        </div>
      ) : (
        <div className="am-card__actions">
          {!["interview", "hired", "rejected"].includes(applicant.status) && (
            <button
              type="button"
              className="am-interview-btn"
              onClick={() => handleStatus("interview")}
              disabled={busy}
            >
              Request interview
            </button>
          )}
          {applicant.status !== "hired" && (
            <button
              type="button"
              className="am-accept-btn"
              onClick={() => handleStatus("hired")}
              disabled={busy}
            >
              <CheckCircle2 size={13} /> Accept
            </button>
          )}
          {applicant.status !== "rejected" && (
            <button
              type="button"
              className="am-reject-btn"
              onClick={() => setRejecting(true)}
              disabled={busy}
            >
              <XCircle size={13} /> Reject
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function ApplicantsModal({
  opportunityId,
  jobTitle,
  highlightApplicationId,
  onClose,
}) {
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const result = await getApplicantsForOpportunity(opportunityId);
      if (result.success) setApplicants(result.applicants);
      else setError(result.error);
      setLoading(false);
    })();
  }, [opportunityId]);

  function handleStatusChange(applicationId, updatedApplication) {
    setApplicants((prev) =>
      prev.map((a) =>
        a.id === applicationId ? { ...a, ...updatedApplication } : a,
      ),
    );
  }

  return (
    <div className="am-overlay" onClick={onClose}>
      <div className="am-modal" onClick={(e) => e.stopPropagation()}>
        <div className="am-modal__header">
          <h2>Applicants{jobTitle ? ` - ${jobTitle}` : ""}</h2>
          <button type="button" className="am-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="am-modal__body">
          {loading && <p className="am-empty">Loading applicants...</p>}
          {error && <p className="am-error">{error}</p>}
          {!loading && !error && applicants.length === 0 && (
            <p className="am-empty">No applicants for this job yet.</p>
          )}
          {applicants.map((a) => (
            <ApplicantCard
              key={a.id}
              applicant={a}
              highlighted={a.id === highlightApplicationId}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
