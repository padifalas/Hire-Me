import { useState, useEffect, useMemo, useCallback } from "react";
import useDialog from "../../hooks/useDialog.js";
import { matchColor, getInitials } from "../../utils/uiHelpers.js";
import { matches } from "../../utils/searchUtils.js";
import {
  getCandidates,
  updateApplicationStatus,
} from "../../services/employerService";
import {
  computeMatchScore,
  APPLICATION_STATUS_LABELS,
} from "../../services/opportunityService.js";
import DocumentViewerModal from "../shared/DocumentViewerModal.jsx";
import ApplicantsModal from "./ApplicantsModal.jsx";

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

function StatusBadge({ status }) {
  const meta = APPLICATION_STATUS_LABELS[status];
  if (!meta) return null;
  return (
    <span
      className="cd-status-badge"
      style={{ color: meta.color, background: meta.bg }}
    >
      {meta.label}
    </span>
  );
}

function CandidateProfileDrawer({
  candidate,
  jobTitle,
  onClose,
  onViewDocument,
  onStatusChange,
  onViewApplication,
}) {
  const dialogRef = useDialog({ onClose });

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  const initials = getInitials(candidate.full_name);
  const avatarStyle = solidAvatarFor(candidate.id);

  const skills = candidate.extracted_technical_skills || [];

  const matchingSkills = candidate.matching_skills || [];

  const missingSkills = candidate.missing_skills || [];

  const matchReasons = candidate.match_reasons || [];

  const projects = candidate.top_projects || [];

  const matchScore = candidate.match_score;

  // Interview / reject act on an application, so they only exist once candidate has applied to the job being viewed
  const status = candidate.application_status;
  const hasApplication = Boolean(candidate.application_id);
  const canInterview =
    hasApplication && !["interview", "hired", "rejected"].includes(status);
  const canReject = hasApplication && status !== "rejected";

  async function handleAction(newStatus, doneText) {
    setBusy(true);
    setMessage(null);

    try {
      const result = await updateApplicationStatus(
        candidate.application_id,
        newStatus,
      );

      if (result.success) {
        onStatusChange(result.application);
        setMessage({
          type: "success",
          text: `${doneText} for ${candidate.full_name}.`,
        });
      } else {
        setMessage({
          type: "error",
          text: result.error || "Couldn't update this application.",
        });
      }
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
              <h4 id="cd-match-title">
                Why this match {jobTitle ? ` for${jobTitle}` : ""}
              </h4>
            </div>

            <div className="cd-match-list">
              {matchingSkills.map((skill, index) => (
                <div
                  className="cd-match-item cd-match-item--positive"
                  key={`matching-${index}`}
                >
                  <CheckCircle2 size={15} aria-hidden="true" />
                  <span>{skillLabel(skill)}</span>
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
                  <span>Missing: {skillLabel(skill)}</span>
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
                      subjectName: candidate.full_name,
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
                      subjectName: candidate.full_name,
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
          {hasApplication ? (
            <>
              <p className="cd-action-note">
                Application{jobTitle ? ` for ${jobTitle}` : ""}:{" "}
                <StatusBadge status={status} />
              </p>

              {(canInterview || canReject) && (
                <div className="cd-profile-actions__buttons">
                  {canInterview && (
                    <button
                      type="button"
                      className="cd-request-interview"
                      disabled={busy}
                      onClick={() =>
                        handleAction("interview", "Interview requested")
                      }
                    >
                      <BriefcaseBusiness size={16} aria-hidden="true" />
                      {busy ? "Please wait..." : "Request Interview"}
                    </button>
                  )}

                  {canReject && (
                    <button
                      type="button"
                      className="cd-reject"
                      disabled={busy}
                      onClick={() =>
                        handleAction("rejected", "Candidate rejected")
                      }
                    >
                      <XCircle size={16} aria-hidden="true" />
                      Reject
                    </button>
                  )}
                </div>
              )}

              <button
                type="button"
                className="cd-link-btn"
                onClick={() => onViewApplication(candidate)}
              >
                Open full application
                <ChevronRight size={13} aria-hidden="true" />
              </button>
            </>
          ) : (
            <p className="cd-action-note">
              {jobTitle
                ? `${candidate.full_name} hasn't applied to ${jobTitle}. You can request an interview or reject once they apply.`
                : "Post a job to compare this candidate against a role."}
            </p>
          )}
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
            {candidate.application_status && (
              <StatusBadge status={candidate.application_status} />
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
                subjectName: candidate.full_name,
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

// AI TOP PICK

function AiTopPickBanner({ candidate, jobTitle, onOpen }) {
  const applied = Boolean(candidate.application_id);
  const total = candidate.required_count;

  return (
    <section className="cd-top-pick" aria-label="AI top pick">
      <div className="cd-top-pick__left">
        <span className="cd-top-pick__label">
          <Sparkles size={13} aria-hidden="true" /> AI top pick
        </span>
        <span className="cd-top-pick__title">
          {candidate.full_name}{" "}
          <span className="cd-top-pick__for">for {jobTitle}</span>
        </span>
        <span className="cd-top-pick__badge">
          {candidate.match_score}% <span className="sr-only">match</span>
        </span>
        <div className="cd-top-pick__sub">
          {total > 0
            ? `${candidate.matched_count}/${total} required skills matched`
            : "No required skills listed for this job"}
          {" · "}
          {applied ? "Has applied" : "Hasn't applied yet"}
        </div>
      </div>

      <button
        type="button"
        className="cd-top-pick__cta"
        onClick={() => onOpen(candidate)}
        aria-label={`${applied ? "View application from" : "View profile of"} ${candidate.full_name}`}
      >
        {applied ? "View application →" : "View profile →"}
      </button>
    </section>
  );
}

export default function CandidatesView({
  employerId,
  search,
  onSearchChange,
  openCandidateId,
  onOpenCandidateHandled,
}) {
  const [localSearch, setLocalSearch] = useState("");
  const searchValue = search ?? localSearch;
  const setSearch = onSearchChange ?? setLocalSearch;

  const [candidates, setCandidates] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedCandidateId, setSelectedCandidateId] = useState(null);
  const [viewingDoc, setViewingDoc] = useState(null);
  const [reviewing, setReviewing] = useState(null);

  const loadData = useCallback(
    async ({ silent = false } = {}) => {
      if (!employerId) return;
      if (!silent) setLoading(true);
      setError(null);

      try {
        const result = await getCandidates(employerId);

        if (result.success) {
          const opportunities = result.opportunities ?? [];
          setCandidates(result.candidates ?? []);
          setJobs(opportunities);
          setApplications(result.applications ?? []);
          setSelectedJobId((prev) =>
            prev && opportunities.some((j) => j.id === prev)
              ? prev
              : (
                  opportunities.find((j) => j.status === "active") ??
                  opportunities[0]
                )?.id || "",
          );
        } else {
          setError(
            result.error || "Couldn't load candidates. Please try again.",
          );
        }
      } catch (err) {
        console.error("Error loading candidates:", err);
        setError("Something went wrong while loading candidates.");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [employerId],
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedJob = useMemo(
    () => jobs.find((j) => j.id === selectedJobId) ?? null,
    [jobs, selectedJobId],
  );

  // Every candidate, scored against the job being viewed. Applicants keep the
  // score stored on their application; everyone else is scored on the fly
  // with the same function the student side uses.
  const scored = useMemo(() => {
    const appByStudent = new Map(
      applications
        .filter((a) => a.opportunity_id === selectedJobId)
        .map((a) => [a.student_id, a]),
    );

    return candidates
      .map((c) => {
        const app = appByStudent.get(c.id) ?? null;
        const match = selectedJob
          ? computeMatchScore(c.extracted_technical_skills, selectedJob)
          : null;

        return {
          ...c,
          application: app,
          application_id: app?.id ?? null,
          application_status: app?.status ?? null,
          match_score: app?.match_score ?? match?.score ?? null,
          matching_skills: match?.matchedRequired ?? [],
          missing_skills: match?.missingRequired ?? [],
          matched_count: match?.matchedRequired.length ?? 0,
          required_count:
            (match?.matchedRequired.length ?? 0) +
            (match?.missingRequired.length ?? 0),
          top_projects: (c.translated_projects ?? [])
            .slice(0, 3)
            .map((p) => p.professional_title)
            .filter(Boolean),
        };
      })
      .sort((a, b) => (b.match_score ?? -1) - (a.match_score ?? -1));
  }, [candidates, applications, selectedJob, selectedJobId]);

  const filtered = useMemo(() => {
    if (!searchValue.trim()) return scored;
    return scored.filter((c) =>
      matches(
        searchValue,
        c.full_name,
        c.university,
        c.degree_program,
        c.location,
        (c.extracted_technical_skills || []).map(skillLabel),
      ),
    );
  }, [scored, searchValue]);

  const selectedCandidate =
    scored.find((c) => c.id === selectedCandidateId) ?? null;

  // The banner is the default view; hide it while someone is searching.
  const topPick =
    selectedJob && !searchValue.trim() && scored[0]?.match_score > 0
      ? scored[0]
      : null;

  // Header search: "open this candidate".
  useEffect(() => {
    if (!openCandidateId || loading) return;
    if (candidates.some((c) => c.id === openCandidateId)) {
      setSelectedCandidateId(openCandidateId);
    }
    onOpenCandidateHandled?.();
  }, [openCandidateId, loading, candidates, onOpenCandidateHandled]);

  function handleStatusChange(updated) {
    setApplications((prev) =>
      prev.map((a) => (a.id === updated.id ? { ...a, ...updated } : a)),
    );
  }

  function openApplication(candidate) {
    if (!candidate.application) return;
    setSelectedCandidateId(null);
    setReviewing({
      opportunityId: candidate.application.opportunity_id,
      jobTitle: selectedJob?.title,
      applicationId: candidate.application.id,
    });
  }

  function openTopPick(candidate) {
    if (candidate.application) openApplication(candidate);
    else setSelectedCandidateId(candidate.id);
  }

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

      {topPick && (
        <AiTopPickBanner
          candidate={topPick}
          jobTitle={selectedJob.title}
          onOpen={openTopPick}
        />
      )}

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

        {jobs.length > 0 && (
          <div className="cd-job-select">
            <label htmlFor="cd-job">Match against</label>
            <select
              id="cd-job"
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
            >
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title}
                  {j.status !== "active" ? ` (${j.status})` : ""}
                </option>
              ))}
            </select>
          </div>
        )}
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
          jobTitle={selectedJob?.title}
          onClose={() => setSelectedCandidate(null)}
          onViewDocument={setViewingDoc}
          onStatusChange={handleStatusChange}
          onViewApplication={openApplication}
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

      {reviewing && (
        <ApplicantsModal
          opportunityId={reviewing.opportunityId}
          jobTitle={reviewing.jobTitle}
          highlightApplicationId={reviewing.applicationId}
          onClose={() => {
            setReviewing(null);
            loadData({ silent: true }); // statuses may have changed in the modal
          }}
        />
      )}
    </div>
  );
}
