import { useState, useEffect, useRef, useId } from "react";
import {
  getApplicantsForOpportunity,
  updateApplicationStatus,
  generateRejectionFeedback,
} from "../../services/employerService";
import { APPLICATION_STATUS_LABELS } from "../../services/opportunityService";
import DocumentViewerModal from "../shared/DocumentViewerModal.jsx";
import useDialog from "../../hooks/useDialog";
import { matchColor } from "../../utils/uiHelpers";

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

function ExternalLink({ href, children }) {
  return (
    <a href={href} target="_blank" rel="noreferrer">
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

function ApplicantCard({ applicant, highlighted, onStatusChange }) {
  const uid = useId();
  const detailsId = `${uid}-details`;
  const feedbackId = `${uid}-feedback`;

  const [expanded, setExpanded] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const [viewingDoc, setViewingDoc] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [announce, setAnnounce] = useState("");

  const feedbackRef = useRef(null);
  const rejectBtnRef = useRef(null);
  const toggleRef = useRef(null);

  const profile = applicant.profile;
  const studentName = applicant.student?.full_name ?? "Student";
  const statusMeta =
    APPLICATION_STATUS_LABELS[applicant.status] ??
    APPLICATION_STATUS_LABELS.submitted;
  const score = applicant.match_score;

  useEffect(() => {
    if (rejecting) feedbackRef.current?.focus();
  }, [rejecting]);

  function restoreFocus() {
    requestAnimationFrame(() =>
      (rejectBtnRef.current ?? toggleRef.current)?.focus(),
    );
  }

  async function handleStatus(newStatus, fb = null) {
    setBusy(true);
    setActionError(null);
    const result = await updateApplicationStatus(applicant.id, newStatus, fb);
    setBusy(false);
    if (result.success) {
      onStatusChange(applicant.id, result.application);
      setRejecting(false);
      setFeedback("");
      setAnnounce(
        `${studentName} marked as ${APPLICATION_STATUS_LABELS[newStatus]?.label ?? newStatus}.`,
      );
      restoreFocus();
    } else {
      setActionError(
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
      setAnnounce("AI feedback suggestion added to the text box.");
    } else {
      setGenerateError(result.error);
    }
  }

  return (
    <article
      className={`am-card${highlighted ? " am-card--highlighted" : ""}`}
      aria-label={`Applicant ${studentName}`}
      aria-current={highlighted ? "true" : undefined}
    >
      <p className="sr-only" role="status" aria-live="polite">
        {announce}
      </p>

      <div className="am-card__top">
        <div>
          <h3 className="am-card__name">{studentName}</h3>
          {profile && (
            <div className="am-card__meta">
              <GraduationCap size={12} aria-hidden="true" />{" "}
              {profile.degree_program || "-"} · {profile.university || "-"}
              {profile.location && (
                <>
                  {" "}
                  ·{" "}
                  <MapPin
                    size={11}
                    className="am-inline-icon"
                    aria-hidden="true"
                  />{" "}
                  {profile.location}
                </>
              )}
            </div>
          )}
        </div>
        <span
          className="am-match-badge"
          style={{
            background: matchColor(score) + "18",
            color: matchColor(score),
            border: `1px solid ${matchColor(score)}33`,
          }}
        >
          {score ?? "-"}% match
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
          ref={toggleRef}
          type="button"
          className="am-link-btn"
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
          aria-controls={detailsId}
          aria-label={`${expanded ? "Hide" : "View"} profile for ${studentName}`}
        >
          {expanded ? "Hide profile" : "View profile"}
        </button>
      </div>

      {expanded && (
        <div className="am-card__details" id={detailsId}>
          {!profile && (
            <p className="am-empty-inline">
              This student hasn't finished their profile yet.
            </p>
          )}
          {profile?.professional_summary && (
            <p className="am-summary">{profile.professional_summary}</p>
          )}

          {profile?.extracted_technical_skills?.length > 0 && (
            <ul className="am-chip-row" aria-label="Technical skills">
              {profile.extracted_technical_skills.map((s, i) => (
                <li key={i} className="am-chip am-chip--technical">
                  {typeof s === "string" ? s : s.skill}
                </li>
              ))}
            </ul>
          )}

          {applicant.cover_letter && (
            <div className="am-cover-letter">
              <h4 className="am-cover-letter__label">Cover letter</h4>
              <p className="am-cover-letter__text">{applicant.cover_letter}</p>
            </div>
          )}

          <div className="am-card__links">
            {profile?.cv_url && (
              <button
                type="button"
                className="am-link-btn"
                onClick={() =>
                  setViewingDoc({
                    docType: "cv",
                    storagePath: profile.cv_url,
                    fileName: profile.cv_file_name,
                  })
                }
                aria-label={`View CV for ${studentName}`}
              >
                <FileDown size={13} aria-hidden="true" /> View CV
              </button>
            )}
            {profile?.transcript_url && (
              <button
                type="button"
                className="am-link-btn"
                onClick={() =>
                  setViewingDoc({
                    docType: "transcript",
                    storagePath: profile.transcript_url,
                    fileName: profile.transcript_file_name,
                  })
                }
                aria-label={`View transcript for ${studentName}`}
              >
                <FileDown size={13} aria-hidden="true" /> View transcript
              </button>
            )}
            {profile?.linkedin_url && (
              <ExternalLink href={profile.linkedin_url}>LinkedIn</ExternalLink>
            )}
            {profile?.github_url && (
              <ExternalLink href={profile.github_url}>GitHub</ExternalLink>
            )}
            {profile?.portfolio_url && (
              <ExternalLink href={profile.portfolio_url}>
                Portfolio
              </ExternalLink>
            )}
          </div>
        </div>
      )}

      {actionError && (
        <p className="am-error" role="alert">
          {actionError}
        </p>
      )}

      {rejecting ? (
        <div className="am-reject-box">
          <div className="am-reject-box__header">
            <label htmlFor={feedbackId} className="am-reject-box__label">
              Feedback for the student (optional)
            </label>
            <button
              type="button"
              className="am-generate-btn"
              onClick={handleGenerateFeedback}
              disabled={generating || busy}
              aria-busy={generating}
            >
              <Sparkles size={12} aria-hidden="true" />{" "}
              {generating ? "Generating..." : "Generate AI suggestions"}
            </button>
          </div>
          <textarea
            id={feedbackId}
            ref={feedbackRef}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={4}
            placeholder="Shown on the student's Applications page - or use Generate AI suggestions above"
          />
          {generateError && (
            <p className="am-error" role="alert">
              {generateError}
            </p>
          )}
          <div className="am-card__actions">
            <button
              type="button"
              className="am-cancel-btn"
              onClick={() => {
                setRejecting(false);
                restoreFocus();
              }}
              disabled={busy}
            >
              Cancel
            </button>
            <button
              type="button"
              className="am-reject-btn"
              onClick={() => handleStatus("rejected", feedback || null)}
              disabled={busy}
              aria-label={`Confirm reject ${studentName}`}
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
              aria-label={`Request interview with ${studentName}`}
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
              aria-label={`Accept ${studentName}`}
            >
              <CheckCircle2 size={13} aria-hidden="true" /> Accept
            </button>
          )}
          {applicant.status !== "rejected" && (
            <button
              ref={rejectBtnRef}
              type="button"
              className="am-reject-btn"
              onClick={() => {
                setActionError(null);
                setRejecting(true);
              }}
              disabled={busy}
              aria-label={`Reject ${studentName}`}
            >
              <XCircle size={13} aria-hidden="true" /> Reject
            </button>
          )}
        </div>
      )}

      {viewingDoc && (
        <DocumentViewerModal
          docType={viewingDoc.docType}
          storagePath={viewingDoc.storagePath}
          fileName={viewingDoc.fileName}
          subjectName={studentName}
          onClose={() => setViewingDoc(null)}
        />
      )}
    </article>
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

  const dialogRef = useDialog({ onClose });

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
    <div
      className="am-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="am-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="am-title"
        tabIndex={-1}
      >
        <div className="am-modal__header">
          <h2 id="am-title">Applicants{jobTitle ? ` - ${jobTitle}` : ""}</h2>
          <button
            type="button"
            className="am-close-btn"
            onClick={onClose}
            aria-label="Close applicants"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="am-modal__body" aria-busy={loading}>
          {loading && (
            <p className="am-empty" role="status">
              Loading applicants...
            </p>
          )}
          {error && (
            <p className="am-error" role="alert">
              {error}
            </p>
          )}
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
