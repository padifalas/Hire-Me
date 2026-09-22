import { useState, useEffect, useMemo } from "react";
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

function skillLabel(s) {
  return typeof s === "string" ? s : (s?.skill ?? "");
}

// Stable per-candidate avatar color, keyed off id so it doesn't change
// between renders/reloads for the same candidate.
const AVATAR_PALETTE = [
  { bg: "#dbeafe", color: "#1d4ed8" }, // blue
  { bg: "#cffafe", color: "#0891b2" }, // teal
  { bg: "#dcfce7", color: "#16a34a" }, // green
  { bg: "#fef3c7", color: "#b45309" }, // orange
];

function avatarStyleFor(id) {
  const hash = String(id ?? "")
    .split("")
    .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

function matchColor(score) {
  if (score === null || score === undefined) return "#94a3b8";
  if (score >= 75) return "#16A34A";
  if (score >= 50) return "#DC8F00";
  return "#DC2626";
}

function CandidateProfileDrawer({ candidate, onClose, onViewDocument }) {
  if (!candidate) return null;

  const initials = candidate.full_name
    ? candidate.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "S";

  const avatarStyle = avatarStyleFor(candidate.id);

  const skills = candidate.extracted_technical_skills || [];

  const matchingSkills =
    candidate.matching_skills || candidate.matched_skills || [];

  const missingSkills = candidate.missing_skills || [];

  const matchReasons = candidate.match_reasons || candidate.why_match || [];

  const projects = candidate.top_projects || candidate.projects || [];

  const matchScore = candidate.match_score;

  const handleRequestInterview = async () => {
    if (!candidate.application_id) {
      console.error("No application ID found for this candidate.");
      return;
    }

    const result = await updateApplicationStatus(
      candidate.application_id,
      "interview",
    );

    if (!result.success) {
      console.error(result.error);
      return;
    }

    alert("Interview requested successfully.");
  };

  const handleReject = async () => {
    if (!candidate.application_id) {
      console.error("No application ID found for this candidate.");
      return;
    }

    const result = await updateApplicationStatus(
      candidate.application_id,
      "rejected",
    );

    if (!result.success) {
      console.error(result.error);
      return;
    }

    alert("Candidate rejected.");
  };

  return (
    <>
      <div className="cd-profile-overlay" onClick={onClose} />

      <aside className="cd-profile-drawer">
        {/* Header */}
        <div className="cd-profile-header">
          <h2>Candidate Profile</h2>

          <button
            type="button"
            className="cd-profile-close"
            onClick={onClose}
            aria-label="Close candidate profile"
          >
            <X size={20} />
          </button>
        </div>

        <div className="cd-profile-identity">
          <div
            className="cd-profile-avatar"
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
                  {matchScore}%
                </span>
              )}
            </div>

            <div className="cd-profile-meta">
              <GraduationCap size={14} />

              <span>
                {candidate.degree_program || "Degree not specified"}

                {candidate.graduation_year
                  ? ` · Class of ${candidate.graduation_year}`
                  : ""}
              </span>
            </div>

            {candidate.location && (
              <div className="cd-profile-meta">
                <MapPin size={14} />
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
          <section className="cd-profile-section">
            <div className="cd-profile-section-title">
              <Sparkles size={16} />
              <h4>Why this match</h4>
            </div>

            <div className="cd-match-list">
              {matchingSkills.map((skill, index) => (
                <div
                  className="cd-match-item cd-match-item--positive"
                  key={`matching-${index}`}
                >
                  <CheckCircle2 size={15} />
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
                  <CheckCircle2 size={15} />
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
                  <XCircle size={15} />
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
          <section className="cd-profile-section">
            <div className="cd-profile-section-title">
              <Code2 size={16} />
              <h4>Skills</h4>
            </div>

            <div className="cd-profile-skills">
              {skills.map((skill, index) => {
                const label = skillLabel(skill);

                const isMissing = missingSkills.some(
                  (missing) =>
                    skillLabel(missing).toLowerCase() === label.toLowerCase(),
                );

                return (
                  <span
                    key={index}
                    className={
                      isMissing
                        ? "cd-profile-skill cd-profile-skill--missing"
                        : "cd-profile-skill"
                    }
                  >
                    {label}

                    {isMissing && <X size={12} />}
                  </span>
                );
              })}
            </div>
          </section>
        )}

        {projects.length > 0 && (
          <section className="cd-profile-section">
            <div className="cd-profile-section-title">
              <FolderKanban size={16} />
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
              <BriefcaseBusiness size={16} />
              <h4>Experience</h4>
            </div>

            <p className="cd-profile-experience">{candidate.work_experience}</p>
          </section>
        )}

        {(candidate.cv_url || candidate.transcript_url) && (
          <section className="cd-profile-section">
            <div className="cd-profile-section-title">
              <FileText size={16} />
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
                >
                  <FileText size={14} />
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
                >
                  <FileText size={14} />
                  View transcript
                </button>
              )}
            </div>
          </section>
        )}
      </aside>

      <div className="cd-profile-actions">
        <button
          type="button"
          className="cd-request-interview"
          onClick={handleRequestInterview}
        >
          <BriefcaseBusiness size={16} />
          Request Interview
        </button>

        <button type="button" className="cd-reject" onClick={handleReject}>
          <XCircle size={16} />
          Reject
        </button>
      </div>
    </>
  );
}

function CandidateCard({ candidate, onViewProfile, onViewDocument }) {
  const initials = candidate.full_name
    ? candidate.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "S";

  const skills = candidate.extracted_technical_skills || [];

  const hasAiProfile = candidate.ai_processing_status === "completed";

  const avatarStyle = avatarStyleFor(candidate.id);

  const hasMatchScore =
    candidate.match_score !== null && candidate.match_score !== undefined;

  return (
    <div className="cd-card">
      <div className="cd-card__top">
        <div
          className="cd-avatar"
          style={{
            background: avatarStyle.bg,
            color: avatarStyle.color,
          }}
        >
          {initials}
        </div>

        <div className="cd-card__heading">
          <div className="cd-card__name-row">
            <span className="cd-card__name">{candidate.full_name}</span>

            {hasAiProfile && (
              <span className="cd-ai-badge">
                <Sparkles size={11} />
                AI profile
              </span>
            )}
          </div>

          <div className="cd-card__meta">
            <GraduationCap size={12} />

            {candidate.degree_program || "-"}

            {candidate.graduation_year
              ? ` · Class of ${candidate.graduation_year}`
              : ""}
          </div>

          {candidate.location && (
            <div className="cd-card__meta">
              <MapPin size={12} />
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
            {candidate.match_score}%
          </span>
        )}
      </div>

      {candidate.professional_summary && (
        <p className="cd-summary cd-summary--clamped">
          {candidate.professional_summary}
        </p>
      )}

      {skills.length > 0 && (
        <div className="cd-chip-row">
          {skills.slice(0, 6).map((s, i) => (
            <span key={i} className="cd-chip cd-chip--technical">
              {skillLabel(s)}
            </span>
          ))}

          {skills.length > 6 && (
            <span className="cd-chip cd-chip--muted">
              +{skills.length - 6} more
            </span>
          )}
        </div>
      )}

      <div className="cd-card__actions">
        <button
          type="button"
          className="cd-link-btn"
          onClick={() => onViewProfile(candidate)}
        >
          View profile
          <ChevronRight size={13} />
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
          >
            <FileText size={13} />
            View CV
          </button>
        )}

        {candidate.transcript_url && (
          <button
            type="button"
            className="cd-link-btn cd-link-btn--muted"
            onClick={() =>
              onViewDocument({
                docType: "transcript",
                storagePath: candidate.transcript_url,
                fileName: candidate.transcript_file_name,
              })
            }
          >
            <FileText size={13} />
            View transcript
          </button>
        )}
      </div>
    </div>
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
    (async () => {
      setLoading(true);

      const result = await getCandidates();

      if (result.success) {
        setCandidates(result.candidates);
      } else {
        setError(result.error);
      }

      setLoading(false);
    })();
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

        <p className="cd-subtitle">
          {loading
            ? "Loading..."
            : `${filtered.length} candidate${
                filtered.length === 1 ? "" : "s"
              } with a completed profile`}
        </p>
      </div>

      <div className="cd-filters">
        <div className="cd-search">
          <Search size={14} color="#94a3b8" />

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, university, skill, or city..."
          />
        </div>
      </div>

      {error && <p className="cd-error">{error}</p>}

      {!loading && filtered.length === 0 && (
        <div className="cd-empty">
          <Users size={32} strokeWidth={1.5} />

          <p>
            {candidates.length === 0
              ? "No candidates with a completed profile yet."
              : "No candidates match your search."}
          </p>
        </div>
      )}

      <div className="cd-grid">
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
