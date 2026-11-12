import { useState, useEffect, useMemo } from "react";
import useDialog from "../../hooks/useDialog.js";
import { matchColor, getInitials } from "../../utils/uiHelpers.js";
import {
  getCandidates,
  updateApplicationStatus,
} from "../../services/employerService";
import DocumentViewerModal from "../shared/DocumentViewerModal.jsx";

import "./CandidatesView.css";

import {
  Search,
  GraduationCap,
  MapPin,
  Sparkles,
  FileText,
  ChevronRight,
  Users,
  X,
  CheckCircle2,
  XCircle,
  Code2,
  FolderKanban,
  BriefcaseBusiness,
} from "lucide-react";

const AVATAR_SOLIDS = [
  "#6366f1",
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
];

function solidAvatarFor(id) {
  const hash = String(id ?? "")
    .split("")
    .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return { bg: AVATAR_SOLIDS[hash % AVATAR_SOLIDS.length], color: "#fff" };
}

function skillLabel(s) {
  return typeof s === "string" ? s : (s?.skill ?? "");
}

function CandidateProfileDrawer({ candidate, onClose, onViewDocument }) {
  const dialogRef = useDialog({ onClose });

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  const initials = getInitials(candidate.full_name);
  const avatarStyle = solidAvatarFor(candidate.id);

  const skills = candidate.extracted_technical_skills || [];

  const matchingSkills =
    candidate.matching_skills || candidate.matched_skills || [];

  const missingSkills = candidate.missing_skills || [];

  const matchReasons = candidate.match_reasons || candidate.why_match || [];

  const projects = candidate.top_projects || candidate.projects || [];

  const matchScore = candidate.match_score;

  async function handleAction(status, doneText) {
    if (!candidate.application_id) {
      setMessage({
        type: "error",
        text: "Couldn't find an application to update for this candidate.",
      });
      return;
    }

    setBusy(true);
    setMessage(null);

    try {
      const result = await updateApplicationStatus(
        candidate.application_id,
        status,
      );

      setMessage(
        result.success
          ? {
              type: "success",
              text: `${doneText} for ${candidate.full_name}.`,
            }
          : {
              type: "error",
              text: result.error || "Couldn't update this application.",
            },
      );
    } catch (error) {
      console.error("Error updating application:", error);

      setMessage({
        type: "error",
        text: "Something went wrong. Please try again.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div
        className="cd-profile-overlay"
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        ref={dialogRef}
        className="cd-profile-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cd-drawer-title"
        tabIndex={-1}
      >
        {/* Header */}
        <div className="cd-profile-header">
          <h2 id="cd-drawer-title">Candidate Profile</h2>

          <button
            type="button"
            className="cd-profile-close"
            onClick={onClose}
            aria-label="Close candidate profile"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="cd-profile-identity">
          <div
            className="cd-profile-avatar"
            aria-hidden="true"
            style={{
              background: avatarStyle.bg,
              color: avatarStyle.color,
            }}
          >
            {initials}
          </div>

          <div className="cd-profile-main-info">
            <div className="cd-profile-name-row">
              <h3>{candidate.full_name}</h3>

              {matchScore !== null && matchScore !== undefined && (
                <span
                  className="cd-profile-match"
                  style={{
                    background: matchColor(matchScore) + "18",
                    color: matchColor(matchScore),
                    border: `1px solid ${matchColor(matchScore)}33`,
                  }}
                >
                  {matchScore}%<span className="sr-only"> match</span>
                </span>
              )}
            </div>

            <div className="cd-profile-meta">
              <GraduationCap size={14} aria-hidden="true" />

              <span>
                {candidate.degree_program || "Degree not specified"}

                {candidate.graduation_year
                  ? ` · Class of ${candidate.graduation_year}`
                  : ""}
              </span>
            </div>

            {candidate.location && (
              <div className="cd-profile-meta">
                <MapPin size={14} aria-hidden="true" />
                <span>{candidate.location}</span>
              </div>
            )}
          </div>
        </div>

        {candidate.professional_summary && (
          <section className="cd-profile-section cd-profile-summary">
            <p>{candidate.professional_summary}</p>
          </section>
        )}

        {(matchReasons.length > 0 ||
          matchingSkills.length > 0 ||
          missingSkills.length > 0) && (
          <section
            className="cd-profile-section"
            aria-labelledby="cd-match-title"
          >
            <div className="cd-profile-section-title">
              <Sparkles size={16} aria-hidden="true" />
              <h4 id="cd-match-title">Why this match</h4>
            </div>

            <div className="cd-match-list">
              {matchingSkills.map((skill, index) => (
                <div
                  className="cd-match-item cd-match-item--positive"
                  key={`matching-${index}`}
                >
                  <CheckCircle2 size={15} aria-hidden="true" />
                  <span>
                    {typeof skill === "string" ? skill : skillLabel(skill)}
                  </span>
                </div>
              ))}

              {matchReasons.map((reason, index) => (
                <div
                  className="cd-match-item cd-match-item--positive"
                  key={`reason-${index}`}
                >
                  <CheckCircle2 size={15} aria-hidden="true" />
                  <span>
                    {typeof reason === "string"
                      ? reason
                      : reason?.text || reason?.reason}
                  </span>
                </div>
              ))}

              {missingSkills.map((skill, index) => (
                <div
                  className="cd-match-item cd-match-item--negative"
                  key={`missing-${index}`}
                >
                  <XCircle size={15} aria-hidden="true" />
                  <span>
                    Missing:{" "}
                    {typeof skill === "string" ? skill : skillLabel(skill)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {skills.length > 0 && (
          <section
            className="cd-profile-section"
            aria-labelledby="cd-skills-title"
          >
            <div className="cd-profile-section-title">
              <Code2 size={16} aria-hidden="true" />
              <h4 id="cd-skills-title">Skills</h4>
            </div>

            <ul className="cd-profile-skills">
              {skills.map((skill, index) => {
                const label = skillLabel(skill);

                const isMissing = missingSkills.some(
                  (missing) =>
                    skillLabel(missing).toLowerCase() === label.toLowerCase(),
                );

                return (
                  <li
                    key={index}
                    className={
                      isMissing
                        ? "cd-profile-skill cd-profile-skill--missing"
                        : "cd-profile-skill"
                    }
                  >
                    {label}

                    {isMissing && (
                      <>
                        <X size={12} aria-hidden="true" />
                        <span className="sr-only">(missing for this role)</span>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {projects.length > 0 && (
          <section className="cd-profile-section">
            <div className="cd-profile-section-title">
              <FolderKanban size={16} aria-hidden="true" />
              <h4>Top Projects</h4>
            </div>

            <div className="cd-project-list">
              {projects.map((project, index) => (
                <div className="cd-project" key={index}>
                  <span className="cd-project-dot" />

                  <span>
                    {typeof project === "string"
                      ? project
                      : project?.name || project?.title || "Project"}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {candidate.work_experience && (
          <section className="cd-profile-section">
            <div className="cd-profile-section-title">
              <BriefcaseBusiness size={16} aria-hidden="true" />
              <h4>Experience</h4>
            </div>

            <p className="cd-profile-experience">{candidate.work_experience}</p>
          </section>
        )}

        {(candidate.cv_url || candidate.transcript_url) && (
          <section className="cd-profile-section">
            <div className="cd-profile-section-title">
              <FileText size={16} aria-hidden="true" />
              <h4>Documents</h4>
            </div>

            <div className="cd-profile-documents">
              {candidate.cv_url && (
                <button
                  type="button"
                  onClick={() =>
                    onViewDocument({
                      docType: "cv",
                      storagePath: candidate.cv_url,
                      fileName: candidate.cv_file_name,
                    })
                  }
                  className="cd-document-btn"
                  aria-label={`View CV for ${candidate.full_name}`}
                >
                  <FileText size={14} aria-hidden="true" />
                  View CV
                </button>
              )}

              {candidate.transcript_url && (
                <button
                  type="button"
                  onClick={() =>
                    onViewDocument({
                      docType: "transcript",
                      storagePath: candidate.transcript_url,
                      fileName: candidate.transcript_file_name,
                    })
                  }
                  className="cd-document-btn"
                  aria-label={`View transcript for ${candidate.full_name}`}
                >
                  <FileText size={14} aria-hidden="true" />
                  View transcript
                </button>
              )}
            </div>
          </section>
        )}

        <div className="cd-profile-actions">
          <div
            className={`cd-action-message${message ? ` cd-action-message--${message.type}` : ""}`}
            role="status"
            aria-live="polite"
          >
            {message?.text}
          </div>

          <div className="cd-profile-actions__buttons">
            <button
              type="button"
              className="cd-request-interview"
              disabled={busy}
              onClick={() => handleAction("interview", "Interview requested")}
            >
              <BriefcaseBusiness size={16} aria-hidden="true" />
              {busy ? "Please wait..." : "Request Interview"}
            </button>

            <button
              type="button"
              className="cd-reject"
              disabled={busy}
              onClick={() => handleAction("rejected", "Candidate rejected")}
            >
              <XCircle size={16} aria-hidden="true" />
              Reject
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

function CandidateCard({ candidate, onViewProfile, onViewDocument }) {
  const initials = getInitials(candidate.full_name);

  const skills = candidate.extracted_technical_skills || [];

  const hasAiProfile = candidate.ai_processing_status === "completed";

  const avatarStyle = solidAvatarFor(candidate.id);

  const hasMatchScore =
    candidate.match_score !== null && candidate.match_score !== undefined;

  return (
    <article
      className="cd-card"
      aria-label={`Candidate ${candidate.full_name}`}
    >
      <div className="cd-card__top">
        <div
          className="cd-avatar"
          aria-hidden="true"
          style={{
            background: avatarStyle.bg,
            color: avatarStyle.color,
          }}
        >
          {initials}
        </div>

        <div className="cd-card__heading">
          <div className="cd-card__name-row">
            <h2 className="cd-card__name">{candidate.full_name}</h2>

            {hasAiProfile && (
              <span className="cd-ai-badge">
                <Sparkles size={11} aria-hidden="true" />
                AI profile
              </span>
            )}
          </div>

          <div className="cd-card__meta">
            <GraduationCap size={12} aria-hidden="true" />

            {candidate.degree_program || "-"}

            {candidate.graduation_year
              ? ` · Class of ${candidate.graduation_year}`
              : ""}
          </div>

          {candidate.location && (
            <div className="cd-card__meta">
              <MapPin size={12} aria-hidden="true" />
              {candidate.location}
            </div>
          )}
        </div>

        {hasMatchScore && (
          <span
            className="cd-match-badge"
            style={{
              background: matchColor(candidate.match_score) + "18",
              color: matchColor(candidate.match_score),
              border: `1px solid ${matchColor(candidate.match_score)}33`,
            }}
          >
            {candidate.match_score}%<span className="sr-only"> match</span>
          </span>
        )}
      </div>

      {candidate.professional_summary && (
        <p className="cd-summary cd-summary--clamped">
          {candidate.professional_summary}
        </p>
      )}

      {skills.length > 0 && (
        <ul className="cd-chip-row" aria-label="Skills">
          {skills.slice(0, 5).map((s, i) => (
            <li key={i} className="cd-chip cd-chip--technical">
              {skillLabel(s)}
            </li>
          ))}

          {skills.length > 5 && (
            <li className="cd-chip cd-chip--muted">
              +{skills.length - 5} more
            </li>
          )}
        </ul>
      )}

      <div className="cd-card__actions">
        <button
          type="button"
          className="cd-link-btn"
          onClick={() => onViewProfile(candidate)}
          aria-label={`View profile for ${candidate.full_name}`}
        >
          View profile
          <ChevronRight size={13} aria-hidden="true" />
        </button>

        {candidate.cv_url && (
          <button
            type="button"
            className="cd-link-btn cd-link-btn--muted"
            onClick={() =>
              onViewDocument({
                docType: "cv",
                storagePath: candidate.cv_url,
                fileName: candidate.cv_file_name,
              })
            }
            aria-label={`View CV for ${candidate.full_name}`}
          >
            <FileText size={13} aria-hidden="true" />
            View CV
          </button>
        )}
      </div>
    </article>
  );
}

export default function CandidatesView() {
  const [candidates, setCandidates] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);

  const [search, setSearch] = useState("");

  // Candidate currently displayed in the drawer
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  // Document currently being viewed
  const [viewingDoc, setViewingDoc] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function loadCandidates() {
      setLoading(true);
      setError(null);

      try {
        const result = await getCandidates();

        if (!isMounted) return;

        if (result.success) {
          setCandidates(result.candidates ?? []);
        } else {
          setError(
            result.error || "Couldn't load candidates. Please try again.",
          );
        }
      } catch (error) {
        console.error("Error loading candidates:", error);

        if (isMounted) {
          setError("Something went wrong while loading candidates.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadCandidates();

    return () => {
      isMounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return candidates;

    return candidates.filter((c) => {
      const skills = (c.extracted_technical_skills || [])
        .map(skillLabel)
        .join(" ")
        .toLowerCase();

      return (
        c.full_name?.toLowerCase().includes(q) ||
        c.university?.toLowerCase().includes(q) ||
        c.degree_program?.toLowerCase().includes(q) ||
        c.location?.toLowerCase().includes(q) ||
        skills.includes(q)
      );
    });
  }, [candidates, search]);

  return (
    <div className="cd-root">
      <div className="cd-header">
        <h1 className="cd-title">Candidates</h1>

        <p className="cd-subtitle" role="status" aria-live="polite">
          {loading
            ? "Loading..."
            : `${filtered.length} candidate${
                filtered.length === 1 ? "" : "s"
              } with a completed profile`}
        </p>
      </div>

      <div className="cd-filters">
        <div className="cd-search" role="search">
          <Search size={14} color="#94a3b8" aria-hidden="true" />

          <label htmlFor="cd-search" className="sr-only">
            Search candidates
          </label>

          <input
            id="cd-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, university, skill, or city..."
          />
        </div>
      </div>

      {error && (
        <p className="cd-error" role="alert">
          {error}
        </p>
      )}

      {!loading && filtered.length === 0 && (
        <div className="cd-empty">
          <Users size={32} strokeWidth={1.5} aria-hidden="true" />

          <p>
            {candidates.length === 0
              ? "No candidates with a completed profile yet."
              : "No candidates match your search."}
          </p>
        </div>
      )}

      <div className="cd-grid" aria-busy={loading}>
        {filtered.map((candidate) => (
          <CandidateCard
            key={candidate.id}
            candidate={candidate}
            onViewProfile={setSelectedCandidate}
            onViewDocument={setViewingDoc}
          />
        ))}
      </div>

      {selectedCandidate && (
        <CandidateProfileDrawer
          candidate={selectedCandidate}
          onClose={() => setSelectedCandidate(null)}
          onViewDocument={setViewingDoc}
        />
      )}

      {viewingDoc && (
        <DocumentViewerModal
          docType={viewingDoc.docType}
          storagePath={viewingDoc.storagePath}
          fileName={viewingDoc.fileName}
          subjectName={selectedCandidate?.full_name || ""}
          onClose={() => setViewingDoc(null)}
        />
      )}
    </div>
  );
}
